import { describe, expect, it } from "vitest";
import { chibiFallbackSubjectV7 } from "../../src/assets/chibi-art-v7";
import { technologySubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import {
  battleshipUnlockNoteV7,
  drownedCrewRuleV7,
  drownedCrewsUnlockTextV7,
  navalRamUnlockTextV7,
  plagueGalleonRuleV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import { combatPreviewNoteV7 } from "../../src/render/undead-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  DROWNED_CREW_HP_V7,
  FACTION_IDS_V7,
  NAVAL_ROLE_IDS_V7,
  drownedCrewRaisesV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
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
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Undead Drowned Fleet (`pulp_wars-5ti.17`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 4): the Ghost Ship, the
// Plague Galleon (Plague with Pestilence), the Sunken Galley, and Drowned
// Crews (a hostile ship an Undead ship sinks by attack or retaliation
// rises at once as a 5-HP Ghost Ship). Every state is a small authored
// strait: rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water.

const WITHOUT_SEAMANSHIP: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];
const WITH_PESTILENCE: readonly TechnologyIdV7[] = [
  ...NAVAL_TECHS_V7,
  "DRILL",
  "FORTIFICATION",
  "EXPLOSIVES",
];

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
  readonly moved?: boolean;
}

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
      ...(piece.moved === true ? { activation: movedActivationV7(unit) } : {}),
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
const infectedOf = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) => (event.kind === "UNIT_INFECTED" ? [event] : []));
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};

/** The attack of the unit on `from` at the unit on `to`, previewed and resolved. */
function exchange(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): {
  readonly preview: CombatPreviewV7 | null;
  readonly result: ReturnType<typeof acceptV7>;
  readonly attacker: UnitStateV7;
  readonly target: UnitStateV7;
} {
  const attacker = navalUnitAtV7(state, from);
  const target = navalUnitAtV7(state, to);
  const preview = queryCombatPreviewV7(viewOf(state), attacker.id, target.id);
  const result = acceptV7(state, 0, attack(attacker.id, target.id));
  return { preview, result, attacker, target };
}

/** The Ghost Ship risen on `at` in `state`, checked against the U1 rule. */
function expectGhostShip(
  state: GameStateV7,
  at: CoordV7,
  ownerSeat: 0 | 1,
): UnitStateV7 {
  const risen = navalUnitAtV7(state, at);
  expect(risen).toMatchObject({
    ownerId: seatV7(state, ownerSeat).id,
    role: "PATROL_BOAT",
    form: "NAVAL",
    hp: DROWNED_CREW_HP_V7,
    maxHp: 10,
    homeCityId: null,
    kills: 0,
    veteran: false,
    captureEligible: false,
  });
  expect(risen.activation).toMatchObject({ moved: true, attacked: true });
  expect(parseGameStateV7(state)).not.toBeNull();
  return risen;
}

describe("the Drowned Fleet registry (sections 4.1 and 4.2)", () => {
  it("registers every row of the unit table with the Human numbers", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "UNDEAD");
      const human = effectiveRoleRuleV7(role, "ORIGINAL");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        [rule.cost, rule.maxHp, rule.attack2, rule.defense2].join() ===
          [human.cost, human.maxHp, human.attack2, human.defense2].join(),
      ];
    };
    expect(row("PATROL_BOAT")).toEqual([
      "Ghost Ship",
      5,
      10,
      2,
      2,
      2,
      "1-1",
      ["ATTACK", "RAM", "DROWNED_CREW"],
      true,
    ]);
    expect(row("BATTLESHIP")).toEqual([
      "Plague Galleon",
      16,
      25,
      5,
      3,
      2,
      "1-3",
      ["ATTACK", "PLAGUE", "DROWNED_CREW"],
      true,
    ]);
    expect(row("SUBMARINE")).toEqual([
      "Sunken Galley",
      9,
      12,
      4,
      2,
      2,
      "1-1",
      ["ATTACK", "SUBMERGED", "TORPEDO", "DROWNED_CREW"],
      true,
    ]);
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(effectiveRoleRuleV7(role, "UNDEAD").tacticalRole).toBe(
        effectiveRoleRuleV7(role, "ORIGINAL").tacticalRole,
      );
    expect(roleMechanicsV7("BATTLESHIP", "UNDEAD").splash).toBe(true);
    expect(DROWNED_CREW_HP_V7).toBe(5);
  });

  it("names the five technologies and makes Seamanship the Ram and Drowned Crews", () => {
    expect(
      NAVAL_TECHS_V7.map((tech) => technologyDisplayNameV7(tech, "UNDEAD")),
    ).toEqual([
      "Ghost Ships",
      "Navigation",
      "Plague Galleons",
      "Drowned Crews",
      "Sunken Galleys",
    ]);
    const seamanship = factionTreeV7("UNDEAD").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "DROWNED_CREWS" },
    ]);
    const crews = technologyCapabilitiesV7(
      ["SHORECRAFT", "SEAMANSHIP"],
      "UNDEAD",
    );
    expect([crews.ram, crews.drownedCrews, crews.boarding]).toEqual([
      true,
      true,
      false,
    ]);
    // No other faction drowns crews.
    for (const faction of FACTION_IDS_V7) {
      if (faction === "UNDEAD") continue;
      expect(
        technologyCapabilitiesV7(["SHORECRAFT", "SEAMANSHIP"], faction)
          .drownedCrews,
        faction,
      ).toBe(false);
    }
  });

  it("keeps Drowned Crews private: a rival's preview assumes it, the result follows the research", () => {
    // A Human Patrol Boat at 1 HP attacks an Undead Ghost Ship and sinks to
    // its reply. The Undead research is private, so the Human preview says
    // the boat may rise; it rises only when the Undead seat has Drowned
    // Crews.
    const scene = (undead: readonly TechnologyIdV7[]) =>
      strait(
        ["ORIGINAL", "UNDEAD"],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 1 },
          { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
        ],
        [NAVAL_TECHS_V7, undead],
      );
    const without = scene(WITHOUT_SEAMANSHIP);
    const withCrews = scene(NAVAL_TECHS_V7);
    // Nothing the Human seat reads of the Ghost Ship tells the two apart.
    const ghostStats = (state: GameStateV7) => {
      const ghost = navalUnitAtV7(state, { x: 3, y: 7 });
      const stats = viewOf(state).unitStats.find(
        (entry) => entry.unitId === ghost.id,
      );
      return { ...stats, unitId: 0 };
    };
    expect(ghostStats(without)).toEqual(ghostStats(withCrews));
    for (const state of [without, withCrews]) {
      const boat = navalUnitAtV7(state, { x: 3, y: 6 });
      const ghost = navalUnitAtV7(state, { x: 3, y: 7 });
      expect(
        queryCombatPreviewV7(viewOf(state), boat.id, ghost.id),
      ).toMatchObject({ attackerDies: true, attackerInfected: true });
    }
    const quiet = exchange(without, { x: 3, y: 6 }, { x: 3, y: 7 });
    expect(combatOf(quiet.result.events).attackerInfected).toBe(false);
    expect(infectedOf(quiet.result.events)).toEqual([]);
    const risen = exchange(withCrews, { x: 3, y: 6 }, { x: 3, y: 7 });
    expect(combatOf(risen.result.events)).toEqual(risen.preview);
    expectGhostShip(risen.result.state, { x: 3, y: 6 }, 1);
  });
});

describe("U1, Drowned Crews: the rising (section 4.4)", () => {
  it("Sunken Galley torpedoes a Patrol Boat: sunk; a 5-HP Ghost Ship rises on its tile", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
      ],
    );
    const { preview, result, attacker, target } = exchange(
      state,
      { x: 3, y: 6 },
      { x: 3, y: 7 },
    );
    expect(preview).toMatchObject({
      torpedo: true,
      defenderDies: true,
      defenderInfected: true,
      attackerInfected: false,
      damageToAttacker: 0,
    });
    // The preview equals the result.
    expect(combatOf(result.events)).toEqual(preview);
    const risen = expectGhostShip(result.state, { x: 3, y: 7 }, 0);
    expect(infectedOf(result.events)).toEqual([
      {
        kind: "UNIT_INFECTED",
        playerId: seatV7(state, 0).id,
        sourceUnitId: attacker.id,
        victimUnitId: target.id,
        unitId: risen.id,
        at: { x: 3, y: 7 },
        homeCityId: null,
      },
    ]);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: target.id,
      cause: "ATTACK",
    });
    // The killer keeps the kill; the rising needs no slot.
    expect(navalUnitV7(result.state, attacker.id).kills).toBe(1);
  });

  it("Ghost Ship finishes a Patrol Boat a Ram left at 2 HP: a second Ghost Ship rises", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, moved: true },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 }, hp: 2 },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 6 }, { x: 3, y: 7 });
    expect(preview).toMatchObject({
      ram: true,
      defenderDies: true,
      defenderInfected: true,
    });
    expect(combatOf(result.events)).toEqual(preview);
    expectGhostShip(result.state, { x: 3, y: 7 }, 0);
  });

  it("a Galleon sinks a Battleship: a 5-HP Ghost Ship rises (the crew, not the hull)", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 6 }, hp: 6 },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 4 }, { x: 3, y: 6 });
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: true,
    });
    expect(combatOf(result.events)).toEqual(preview);
    expectGhostShip(result.state, { x: 3, y: 6 }, 0);
  });

  it("Patrol Boat attacks a risen 5-HP Ghost Ship: 5, sunk", () => {
    const state = strait(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 }, hp: 5 },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 6 }, { x: 3, y: 7 });
    expect(preview).toMatchObject({
      damageToDefender: 5,
      defenderDies: true,
      defenderInfected: false,
    });
    expect(infectedOf(result.events)).toEqual([]);
  });

  it("rises from a retaliation kill, as the attacker's preview warned", () => {
    const state = strait(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
      ],
    );
    const { preview, result, attacker } = exchange(
      state,
      { x: 3, y: 6 },
      { x: 3, y: 7 },
    );
    expect(preview).toMatchObject({
      attackerDies: true,
      attackerInfected: true,
      defenderDies: false,
    });
    expect(combatOf(result.events)).toEqual(preview);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: attacker.id,
      cause: "RETALIATION",
    });
    expectGhostShip(result.state, { x: 3, y: 6 }, 1);
    expect(navalUnitAtV7(result.state, { x: 3, y: 7 }).kills).toBe(1);
  });

  it("works for the Plague Galleon and the Sunken Galley by retaliation too", () => {
    const state = strait(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 1 },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 7 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 6 }, hp: 1 },
        { seat: 1, role: "SUBMARINE", at: { x: 6, y: 7 } },
      ],
    );
    for (const [from, to] of [
      [
        { x: 3, y: 6 },
        { x: 3, y: 7 },
      ],
      [
        { x: 6, y: 6 },
        { x: 6, y: 7 },
      ],
    ] as const) {
      const { preview, result } = exchange(state, from, to);
      expect(preview?.attackerInfected).toBe(true);
      expect(combatOf(result.events)).toEqual(preview);
      expectGhostShip(result.state, from, 1);
    }
  });
});

describe("U1, Drowned Crews: where nothing rises", () => {
  it("not without Drowned Crews", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
      ],
      [WITHOUT_SEAMANSHIP, NAVAL_TECHS_V7],
    );
    const { preview, result } = exchange(state, { x: 3, y: 5 }, { x: 3, y: 7 });
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(infectedOf(result.events)).toEqual([]);
    expect(
      result.state.units.some((unit) => unit.at.x === 3 && unit.at.y === 7),
    ).toBe(false);
  });

  it("not from a transport: an embarked unit is a land unit and drowns", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 1, y: 9 },
          embarkedAt: { x: 3, y: 6 },
        },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 4 }, { x: 3, y: 6 });
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(infectedOf(result.events)).toEqual([]);
  });

  it("not from splash: the Galleon's splash kill sinks quietly", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 6 }, hp: 1 },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 4 }, { x: 3, y: 6 });
    expect(preview?.splash).toMatchObject([{ dies: true }]);
    expect(preview?.defenderInfected).toBe(false);
    expect(infectedOf(result.events)).toEqual([]);
    expect(
      result.state.units.some((unit) => unit.at.x === 4 && unit.at.y === 6),
    ).toBe(false);
  });

  it("not from Plague at the victim's Start Turn", () => {
    const base = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 2 },
      ],
      [WITH_PESTILENCE, NAVAL_TECHS_V7],
    );
    const galleon = navalUnitAtV7(base, { x: 3, y: 4 });
    const boat = navalUnitAtV7(base, { x: 3, y: 6 });
    const plagued = parseGameStateV7({
      ...base,
      plagued: [
        { unitId: boat.id, sourceUnitId: galleon.id, turnsRemaining: 3 },
      ],
    });
    if (plagued === null) throw new Error("the plagued state is invalid");
    const result = acceptV7(plagued, 0, { kind: "END_TURN" });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: boat.id,
      cause: "PLAGUE",
    });
    expect(infectedOf(result.events)).toEqual([]);
  });

  it("not on Deep Water while the Undead seat lacks Navigation", () => {
    const pieces: PieceV7[] = [
      { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 3 }, moved: true },
      { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 }, hp: 2 },
    ];
    const shallowOnly = strait(["UNDEAD", "ORIGINAL"], pieces, [
      ["SHORECRAFT", "SEAMANSHIP"],
      NAVAL_TECHS_V7,
    ]);
    const { preview, result } = exchange(
      shallowOnly,
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    );
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(infectedOf(result.events)).toEqual([]);
    // With Navigation the same kill rises.
    const navigating = strait(["UNDEAD", "ORIGINAL"], pieces, [
      ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      NAVAL_TECHS_V7,
    ]);
    const deep = exchange(navigating, { x: 3, y: 3 }, { x: 3, y: 4 });
    expect(deep.preview?.defenderInfected).toBe(true);
    expectGhostShip(deep.result.state, { x: 3, y: 4 }, 0);
  });

  it("not on an ice tile", () => {
    const state = frozenArenaV7({
      factions: ["UNDEAD", "ORIGINAL"],
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      ice: [{ at: { x: 4, y: 5 }, seat: 2 }],
      third: { faction: "ICE_FOLK", explored: true },
    });
    const galley = navalUnitAtV7(state, { x: 3, y: 5 });
    const boat = navalUnitAtV7(state, { x: 4, y: 5 });
    const weak = parseGameStateV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === boat.id ? { ...unit, hp: 1 } : unit,
      ),
    });
    if (weak === null) throw new Error("the icy state is invalid");
    const preview = queryCombatPreviewV7(viewOf(weak), galley.id, boat.id);
    expect(preview).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    const result = acceptV7(weak, 0, attack(galley.id, boat.id));
    expect(infectedOf(result.events)).toEqual([]);
  });

  it("is the one shared rule: a ship killer with a crew, a ship victim, open water", () => {
    const crew = { deepWater: false };
    const ship = { form: "NAVAL" as const };
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: crew },
        ship,
        "SHALLOW_WATER",
        false,
      ),
    ).toBe(true);
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: crew },
        ship,
        "SHALLOW_WATER",
        true,
      ),
    ).toBe(false);
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: crew },
        ship,
        "DEEP_WATER",
        false,
      ),
    ).toBe(false);
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: { deepWater: true } },
        ship,
        "DEEP_WATER",
        false,
      ),
    ).toBe(true);
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: crew },
        { form: "EMBARKED" },
        "SHALLOW_WATER",
        false,
      ),
    ).toBe(false);
    expect(
      drownedCrewRaisesV7(
        { form: "LAND", drownedCrew: crew },
        ship,
        "SHALLOW_WATER",
        false,
      ),
    ).toBe(false);
    expect(
      drownedCrewRaisesV7(
        { form: "NAVAL", drownedCrew: null },
        ship,
        "SHALLOW_WATER",
        false,
      ),
    ).toBe(false);
  });

  it("a Goblin Dreadnought sunk by a Ghost Ship rises, and its blast sinks the risen ship", () => {
    const state = strait(
      ["UNDEAD", "GOBLIN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, moved: true },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 7 }, hp: 2 },
      ],
    );
    const { preview, result } = exchange(state, { x: 3, y: 6 }, { x: 3, y: 7 });
    expect(preview?.defenderInfected).toBe(true);
    const risen = infectedOf(result.events)[0];
    expect(risen?.at).toEqual({ x: 3, y: 7 });
    // The crew rises, then the powder blows: 7 to everything around.
    expect(
      result.events.some(
        (event) =>
          event.kind === "UNIT_DIED" &&
          event.unitId === risen?.unitId &&
          event.cause === "EXPLOSION",
      ),
    ).toBe(true);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });
});

describe("U2, the Plague Galleon", () => {
  // A Human Guard on the coast beside two Fighters, the Galleon on the
  // Shallow Water in front of it (the worked example's exchange).
  const GALLEON: CoordV7 = { x: 2, y: 7 };
  const GUARD: CoordV7 = { x: 2, y: 8 };
  const scene = (technologies: readonly TechnologyIdV7[]) =>
    strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: GALLEON },
        { seat: 1, role: "GUARD", at: GUARD },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
      ],
      [technologies, NAVAL_TECHS_V7],
    );

  it("with Pestilence plagues the Guard and both splashed Fighters", () => {
    const state = scene(WITH_PESTILENCE);
    const { preview, result, target } = exchange(state, GALLEON, GUARD);
    const fighters = [
      navalUnitAtV7(state, { x: 1, y: 8 }).id,
      navalUnitAtV7(state, { x: 3, y: 8 }).id,
    ];
    // 14 to the Guard (3 of 17 left), splash to both Fighters.
    expect(preview).toMatchObject({
      damageToDefender: 14,
      defenderDies: false,
    });
    expect(preview?.splash.map((entry) => entry.unitId).sort()).toEqual(
      [...fighters].sort(),
    );
    expect([...(preview?.plagued ?? [])].sort()).toEqual(
      [target.id, ...fighters].sort(),
    );
    expect(combatOf(result.events)).toEqual(preview);
    expect(result.state.plagued.map((entry) => entry.unitId).sort()).toEqual(
      [target.id, ...fighters].sort(),
    );
  });

  it("without Pestilence plagues nobody, splash and range unchanged", () => {
    const state = scene(NAVAL_TECHS_V7);
    const { preview, result } = exchange(state, GALLEON, GUARD);
    expect(preview?.splash).toHaveLength(2);
    expect(preview?.plagued).toEqual([]);
    expect(result.state.plagued).toEqual([]);
  });
});

describe("no Board for the Undead (section 4.3)", () => {
  it("offers no BOARD to an Undead ship, while a Human ship may board one", () => {
    const undead = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 }, hp: 2 },
      ],
    );
    expect(
      queryPlayerCommandsV7(viewOf(undead)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    const human = strait(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 }, hp: 2 },
      ],
    );
    const boarder = navalUnitAtV7(human, { x: 3, y: 6 });
    const ghost = navalUnitAtV7(human, { x: 3, y: 7 });
    const board: CommandV7 = {
      kind: "BOARD",
      unitId: boarder.id,
      targetUnitId: ghost.id,
    };
    expect(queryPlayerCommandsV7(viewOf(human))).toContainEqual(board);
    const result = acceptV7(human, 0, board);
    expect(navalUnitV7(result.state, ghost.id)).toMatchObject({
      ownerId: seatV7(human, 0).id,
      hp: 4,
      maxHp: 10,
    });
  });
});

describe("the Drowned Fleet's words and pictures (section 12)", () => {
  it("names the Undead ships on the cards and says the two Undead sentences", () => {
    expect(navalRamUnlockTextV7("UNDEAD")).toBe(
      "Bow Ram: Ghost Ships that moved hit ships with +1 Attack and shove them back",
    );
    expect(drownedCrewRuleV7()).toBe(
      "A ship your ships sink rises as your Ghost Ship.",
    );
    expect(drownedCrewsUnlockTextV7()).toBe(
      "Drowned Crews: A ship your ships sink rises as your Ghost Ship",
    );
    expect(plagueGalleonRuleV7()).toBe(
      "With Pestilence, the Galleon's shot plagues whoever it hits.",
    );
    expect(battleshipUnlockNoteV7("UNDEAD")).toBe(
      "Plague Galleon: long-range splash damage; with Pestilence its shot plagues whoever it hits",
    );
    expect(submarineUnlockNoteV7("UNDEAD")).toMatch(/^Sunken Galley: /);
    expect(glossaryEntryV7("DROWNED_CREW")).toMatchObject({
      name: "Drowned Crew",
      text: `${drownedCrewRuleV7()} Unlocked by a technology.`,
    });
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(
        roleGlossaryV7(role, "UNDEAD").map((entry) => entry.id),
        role,
      ).toContain("DROWNED_CREW");
    // One name, one mechanic: the Galleon's Plague is the Lich's line.
    expect(
      roleGlossaryV7("BATTLESHIP", "UNDEAD").map((entry) => entry.id),
    ).toEqual(expect.arrayContaining(["PLAGUE", "SPLASH", "DROWNED_CREW"]));
    // No Human ship has a Drowned Crew.
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(
        roleGlossaryV7(role, "ORIGINAL").map((entry) => entry.id),
      ).not.toContain("DROWNED_CREW");
  });

  it("says the rising in the attack preview", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
      ],
    );
    const galley = navalUnitAtV7(state, { x: 3, y: 6 });
    const boat = navalUnitAtV7(state, { x: 3, y: 7 });
    const view = viewOf(state);
    const preview = queryCombatPreviewV7(view, galley.id, boat.id);
    if (preview === null) throw new Error("no preview");
    expect(combatPreviewNoteV7(preview, view)).toContain(
      "Rises as your Ghost Ship",
    );
  });

  it("shows the Ghost Ship and Sunken Galley portraits and the Drowned Crews icon on the Undead cards", () => {
    expect(
      NAVAL_TECHS_V7.map((tech) => technologySubjectV7(tech, "UNDEAD")),
    ).toEqual([
      "PORTRAIT:UNDEAD:PATROL_BOAT",
      "ICON:TECH:NAVIGATION",
      "UNIT:UNDEAD:BATTLESHIP",
      "ICON:TECH:UNDEAD:SEAMANSHIP",
      "PORTRAIT:UNDEAD:SUBMARINE",
    ]);
    expect(chibiFallbackSubjectV7("ICON:TECH:UNDEAD:SEAMANSHIP")).toBe(
      "ICON:TECH:SEAMANSHIP",
    );
  });
});
