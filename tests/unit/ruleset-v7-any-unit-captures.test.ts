import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  roleCanEverCaptureV7,
  unitCanEverCaptureV7,
  type CommandV7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import {
  endTurnUntilV7,
  goblinArenaV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { fieldV7 } from "../fixtures/v7-revision20";

/**
 * Any unit can capture (`pulp_wars-ke95`, user direction 2026-10-09): every
 * land role of every faction has `CAPTURE`, flyers and the Prowling
 * Sabretooth included (they may now stand on a village or a foreign
 * center). Boats, Eggs, embarked and burrowed units, and the neutral Giant
 * Spider never capture.
 */
const VILLAGE = { x: 5, y: 5 };

/** Units that could not capture before `pulp_wars-ke95`, by faction. */
const NEW_CAPTURERS: readonly (readonly [FactionIdV7, UnitRoleIdV7])[] = [
  ["ORIGINAL", "CAPTAIN"],
  ["ORIGINAL", "CATAPULT"],
  ["UNDEAD", "CAPTAIN"],
  ["UNDEAD", "CATAPULT"],
  ["UNDEAD", "KNIGHT"],
  ["GOBLIN", "CAPTAIN"],
  ["GOBLIN", "CATAPULT"],
  ["GOBLIN", "KNIGHT"],
  ["DINOSAUR", "CAPTAIN"],
  ["DINOSAUR", "SWORDSMAN"],
  ["MARTIAN", "RAIDER"],
  ["MARTIAN", "CAPTAIN"],
  ["MARTIAN", "CATAPULT"],
  ["MARTIAN", "KNIGHT"],
  ["ICE_FOLK", "CAPTAIN"],
  ["ICE_FOLK", "CATAPULT"],
  ["ICE_FOLK", "KNIGHT"],
  ["DWARF", "RAIDER"],
  ["DWARF", "CAPTAIN"],
  ["DWARF", "CATAPULT"],
  ["DWARF", "KNIGHT"],
  ["DWARF", "SWORDSMAN"],
  ["CANDY", "CAPTAIN"],
  ["CANDY", "CATAPULT"],
  ["CANDY", "KNIGHT"],
];

const onVillage = (
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  captureEligible: boolean,
) =>
  goblinArenaV7(
    [faction, "ORIGINAL"],
    [
      { seat: 0, role, at: VILLAGE, captureEligible },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
    ],
  );

describe("any unit can capture (pulp_wars-ke95)", () => {
  it("gives every land role of every faction CAPTURE, and no boat", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          effectiveRoleRuleV7(role, faction).abilities.includes("CAPTURE"),
          `${faction} ${role}`,
        ).toBe(!isNavalRoleV7(role));
    // The neutral Giant Spider stays an attacker only.
    expect(NEUTRAL_MONSTER_ROLE_RULE_V7.abilities).toEqual(["ATTACK"]);
  });

  it("offers and accepts a capture by a unit that could not capture before", () => {
    for (const [faction, role] of NEW_CAPTURERS) {
      const state = onVillage(faction, role, true);
      expect(parseGameStateV7(state), `${faction} ${role}`).not.toBeNull();
      const capture: CommandV7 = {
        kind: "CAPTURE",
        unitId: unitAtV7(state, VILLAGE).id,
      };
      expect(
        queryPlayerCommandsV7(state, state.humanPlayerId),
        `${faction} ${role}`,
      ).toContainEqual(capture);
      const result = applyCommandV7(state, state.humanPlayerId, capture);
      expect(result.accepted, `${faction} ${role}`).toBe(true);
      if (!result.accepted) continue;
      expect(
        result.events.some((event) => event.kind === "CITY_CAPTURED"),
        `${faction} ${role}`,
      ).toBe(true);
    }
  });

  it("makes a Catapult that starts its turn on a village capture-eligible", () => {
    const state = onVillage("ORIGINAL", "CATAPULT", false);
    const human = state.humanPlayerId;
    const back = endTurnUntilV7(state, human).state;
    const catapult = unitAtV7(back, VILLAGE);
    expect(catapult.captureEligible).toBe(true);
    expect(queryPlayerCommandsV7(back, human)).toContainEqual({
      kind: "CAPTURE",
      unitId: catapult.id,
    });
  });

  it("still never lets a boat be capture-eligible", () => {
    const sea = { x: 5, y: 3 };
    const state = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: sea, form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { water: [sea, { x: 5, y: 2 }] },
    );
    expect(parseGameStateV7(state)).not.toBeNull();
    // The state schema refuses capture eligibility for a role without
    // CAPTURE, and every boat is such a role.
    expect(
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          unit.role === "PATROL_BOAT"
            ? { ...unit, captureEligible: true }
            : unit,
        ),
      }),
    ).toBeNull();
  });

  it("lets flyers and the Sabretooth end a Move on a village and capture it next turn", () => {
    for (const [faction, role] of [
      ["MARTIAN", "RAIDER"],
      ["MARTIAN", "KNIGHT"],
      ["DWARF", "RAIDER"],
      ["ICE_FOLK", "KNIGHT"],
    ] as const) {
      expect(roleCanEverCaptureV7(role, faction), `${faction} ${role}`).toBe(
        true,
      );
      const state = goblinArenaV7(
        [faction, "ORIGINAL"],
        [
          { seat: 0, role, at: { x: 5, y: 4 } },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
      );
      const human = state.humanPlayerId;
      const unit = unitAtV7(state, { x: 5, y: 4 });
      expect(unitCanEverCaptureV7(state, unit), `${faction} ${role}`).toBe(
        true,
      );
      const move = queryPlayerCommandsV7(state, human).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === unit.id &&
          command.path.at(-1)?.x === VILLAGE.x &&
          command.path.at(-1)?.y === VILLAGE.y,
      );
      expect(move, `${faction} ${role}`).toBeDefined();
      if (move === undefined) continue;
      const moved = applyCommandV7(state, human, move);
      expect(moved.accepted, `${faction} ${role}`).toBe(true);
      if (!moved.accepted) continue;
      const back = endTurnUntilV7(moved.state, human).state;
      expect(
        unitAtV7(back, VILLAGE).captureEligible,
        `${faction} ${role}`,
      ).toBe(true);
      expect(
        queryPlayerCommandsV7(back, human),
        `${faction} ${role}`,
      ).toContainEqual({
        kind: "CAPTURE",
        unitId: unit.id,
      });
    }
    expect(roleCanEverCaptureV7("PATROL_BOAT", "ORIGINAL")).toBe(false);
  });

  it("shows no Can't capture restriction on any recruit card", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          recruitmentRolePresentationV7(role, faction).restrictions,
          `${faction} ${role}`,
        ).not.toContain("Can't capture.");
  });

  it("lets every faction's giant capture a village", () => {
    for (const faction of FACTION_IDS_V7) {
      const state = onVillage(faction, "JUGGERNAUT", true);
      const capture: CommandV7 = {
        kind: "CAPTURE",
        unitId: unitAtV7(state, VILLAGE).id,
      };
      expect(
        queryPlayerCommandsV7(state, state.humanPlayerId),
        faction,
      ).toContainEqual(capture);
      expect(
        applyCommandV7(state, state.humanPlayerId, capture).accepted,
        faction,
      ).toBe(true);
    }
  });

  // The giants' signatures (`pulp_wars-w49.30`) and Dwarf crowd control
  // (`pulp_wars-w49.33`) keep their own placement rules: a Gingerbread Man
  // may be broken off onto a village and captures it from the next turn; a
  // tossed Goblin and a Barricade never land on a settlement.
  it("lets a Gingerbread Man broken off onto a village capture it next turn", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { factions: ["CANDY", "ORIGINAL"] },
    );
    const human = state.humanPlayerId;
    const breakOff: CommandV7 = {
      kind: "BREAK_OFF",
      unitId: unitAtV7(state, { x: 5, y: 4 }).id,
      // The two tiles in (y, x) order.
      tiles: [{ x: 4, y: 4 }, VILLAGE],
    };
    expect(queryPlayerCommandsV7(state, human)).toContainEqual(breakOff);
    const broken = applyCommandV7(state, human, breakOff);
    expect(broken.accepted).toBe(true);
    if (!broken.accepted) return;
    const man = unitAtV7(broken.state, VILLAGE);
    expect(man).toMatchObject({ role: "FIGHTER", captureEligible: false });
    expect(queryPlayerCommandsV7(broken.state, human)).not.toContainEqual({
      kind: "CAPTURE",
      unitId: man.id,
    });
    const back = endTurnUntilV7(broken.state, human).state;
    expect(unitAtV7(back, VILLAGE).captureEligible).toBe(true);
    const capture: CommandV7 = { kind: "CAPTURE", unitId: man.id };
    expect(queryPlayerCommandsV7(back, human)).toContainEqual(capture);
    expect(applyCommandV7(back, human, capture).accepted).toBe(true);
  });

  it("never tosses a Goblin or builds a Barricade on a village", () => {
    const goblins = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 5, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { factions: ["GOBLIN", "ORIGINAL"] },
    );
    const toss = (at: { x: number; y: number }): CommandV7 => ({
      kind: "TOSS",
      unitId: unitAtV7(goblins, { x: 5, y: 3 }).id,
      passengerUnitId: unitAtV7(goblins, { x: 4, y: 3 }).id,
      at,
    });
    const tosses = queryPlayerCommandsV7(goblins, goblins.humanPlayerId);
    // (6, 5) is a Toss landing two tiles away; the village (5, 5) is not.
    expect(tosses).toContainEqual(toss({ x: 6, y: 5 }));
    expect(tosses).not.toContainEqual(toss(VILLAGE));
    expect(
      applyCommandV7(goblins, goblins.humanPlayerId, toss(VILLAGE)).accepted,
    ).toBe(false);

    const dwarves = fieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { factions: ["DWARF", "ORIGINAL"] },
    );
    const build = (to: { x: number; y: number }): CommandV7 => ({
      kind: "BUILD_BARRICADE",
      unitId: unitAtV7(dwarves, { x: 5, y: 4 }).id,
      to,
    });
    const builds = queryPlayerCommandsV7(dwarves, dwarves.humanPlayerId);
    expect(builds).toContainEqual(build({ x: 4, y: 4 }));
    expect(builds).not.toContainEqual(build(VILLAGE));
    expect(
      applyCommandV7(dwarves, dwarves.humanPlayerId, build(VILLAGE)).accepted,
    ).toBe(false);
  });
});
