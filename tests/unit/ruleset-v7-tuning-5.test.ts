import { describe, expect, it } from "vitest";
import {
  ARMY_PLAY_FACTIONS_V7,
  ARMY_SHARES_V7,
  armyCountsV7,
  armyRoleScoreV7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  publicProjectedDamageForPolicyV7,
} from "../../src/ai/v7";
import { chibiFallbackSubjectV7 } from "../../src/assets/chibi-art-v7";
import { CHIBI_DIRECTION_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  BARRACKS_CAPACITY_V7,
  COMMAND_KIND_ORDER_V7,
  FACTION_IDS_V7,
  GUARD_RANGED_DEFENSE2_V7,
  HUMAN_ONLY_ROLES_V7,
  LAND_GRANT_COST_PER_TILE_V7,
  MISSION_REGISTRY_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  blastSetterV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  factionUnlocksRoleV7,
  landGrantCostV7,
  missionMatchSetupV7,
  parseCommandV7,
  parseGameStateV7,
  previewBlastMountainV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { galleryUnitCellV7 } from "../../src/render/gallery-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  at,
  fieldDefenseV7,
  fieldV7,
  mountainV7,
  walledV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 5 (`pulp_wars-w49.4`, identity `pulp-wars-poc-7r67`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 12): the Normal AI's army
 * play, the Human Guard open to ranged attacks, the Swordsman, the removal
 * of Drill, the Blast Mountain's setter, the Land Grant's price, and the
 * labs.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8). Every tile is explored by both
 * seats, so each knows the other's capital.
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;

const preview = (state: GameStateV7, from: CoordV7, to: CoordV7, seat = 0) => {
  const result = queryCombatPreviewV7(
    viewForV7(state, seatIdV7(state, seat)),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (result === null) throw new Error("no preview");
  return result;
};

const attack = (state: GameStateV7, from: CoordV7, to: CoordV7): GameStateV7 =>
  applyOkV7(state, seatIdV7(state, 0), {
    kind: "ATTACK",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  }).state;

/**
 * Seat `seat` plays its turn with the Normal policy (the other seat does
 * nothing): the commands it chose, the last being End Turn, and the state
 * before that End Turn.
 */
function policyTurn(
  start: GameStateV7,
  seat = 0,
): { readonly commands: readonly CommandV7[]; readonly state: GameStateV7 } {
  const actor = seatIdV7(start, seat);
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    commands.push(command);
    if (command.kind === "END_TURN") return { commands, state };
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

const trained = (commands: readonly CommandV7[]): readonly UnitRoleIdV7[] =>
  commands.flatMap((command) =>
    command.kind === "TRAIN" ? [command.role] : [],
  );

/** The piece list with every unit homed to its seat's capital. */
const field = (
  pieces: readonly GoblinPieceV7[],
  options: {
    readonly factions?: readonly FactionIdV7[];
    readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
    readonly coins?: number;
  } = {},
): GameStateV7 =>
  fieldV7(pieces, {
    factions: options.factions ?? HUMANS,
    ...(options.techs === undefined ? {} : { techs: options.techs }),
    ...(options.coins === undefined ? {} : { coins: options.coins }),
  });

/**
 * The Martian pass's correction (`pulp_wars-w49.14`): a Human seat takes
 * the villages first for ten rounds (it walks into no enemy's reach
 * outside its land); the fights of these tests are after them, in round 12.
 */
const late = (...args: Parameters<typeof field>): GameStateV7 => ({
  ...field(...args),
  round: 12,
});

describe("tuning 5 identity", () => {
  // Tuning 5 took 7r48; tuning 6 (tests/unit/ruleset-v7-tuning-6.test.ts)
  // took 7r49 and the Goblin pass 7r50, so 7r48 is the prior identity
  // before the last.
  it("was 7r48 after 7r47, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r67");
    expect(PRIOR_RULESET_7_IDS.slice(-20, -18)).toEqual([
      "pulp-wars-poc-7r47",
      "pulp-wars-poc-7r48",
    ]);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r67.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-20, -18)).toEqual([
      "pulpWars.save.v7r47.current",
      "pulpWars.save.v7r48.current",
    ]);
  });
});

describe("the Human Guard is open to ranged attacks", () => {
  it("is a rule of the Human Guard only", () => {
    expect(GUARD_RANGED_DEFENSE2_V7).toBe(2);
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          roleMechanicsV7(role, faction).rangedDefense2,
          `${faction} ${role}`,
        ).toBe(
          faction === "ORIGINAL" && role === "GUARD"
            ? 2
            : // The Undead pass (`pulp_wars-w49.13`, 7r51): the same
              // mechanic above the unit's Defense, the Skeleton's Bones.
              faction === "UNDEAD" && role === "FIGHTER"
              ? 6
              : null,
        );
    expect(
      recruitmentRolePresentationV7("GUARD", "ORIGINAL").restrictions,
    ).toContain(
      "Open to ranged: Defense 1 against attacks from 2 or more tiles.",
    );
    expect(
      recruitmentRolePresentationV7("GUARD", "UNDEAD").restrictions.join(" "),
    ).not.toMatch(/Open to ranged/);
  });

  it("defends at 1 from two or more tiles and at 3 next to the attacker", () => {
    const state = field([
      { seat: 0, role: "MARKSMAN", at: at(5, 2) },
      { seat: 0, role: "MARKSMAN", at: at(4, 3) },
      { seat: 0, role: "CATAPULT", at: at(5, 1) },
      { seat: 0, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "GUARD", at: at(5, 4) },
    ]);
    // From two tiles: Defense 1, and a Guard cannot answer.
    expect(preview(state, at(5, 2), at(5, 4))).toMatchObject({
      defense2: 2,
      damageToDefender: 6,
      damageToAttacker: 0,
      retaliation: false,
    });
    // A Catapult from three tiles.
    expect(preview(state, at(5, 1), at(5, 4))).toMatchObject({
      defense2: 2,
      damageToDefender: 10,
    });
    // A Marksman next to it and a Fighter: Defense 3, as before.
    expect(preview(state, at(4, 3), at(5, 4))).toMatchObject({
      defense2: 6,
      damageToDefender: 4,
      damageToAttacker: 8,
    });
    expect(preview(state, at(6, 3), at(5, 4))).toMatchObject({
      defense2: 6,
      damageToDefender: 4,
      damageToAttacker: 8,
    });
    // The Normal AI's estimate is the preview's number.
    const view = viewForV7(state, seatIdV7(state, 0));
    const guard = unitAtV7(state, at(5, 4));
    for (const from of [at(5, 2), at(5, 1), at(4, 3), at(6, 3)])
      expect(
        publicProjectedDamageForPolicyV7(
          view,
          unitAtV7(state, from),
          guard,
          guard.at,
        ),
        `${from.x},${from.y}`,
      ).toBe(preview(state, from, at(5, 4)).damageToDefender);
  });

  it("two Marksmen leave a Guard in the open for one Fighter to kill", () => {
    let state = field([
      { seat: 0, role: "MARKSMAN", at: at(4, 2) },
      { seat: 0, role: "MARKSMAN", at: at(6, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "GUARD", at: at(5, 4) },
    ]);
    state = attack(state, at(4, 2), at(5, 4));
    expect(unitAtV7(state, at(5, 4)).hp).toBe(11);
    state = attack(state, at(6, 2), at(5, 4));
    expect(unitAtV7(state, at(5, 4)).hp).toBe(4);
    expect(preview(state, at(5, 3), at(5, 4))).toMatchObject({
      damageToDefender: 4,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("keeps its fortification against a ranged attack: Walls and a Field Defense add to the 1", () => {
    // A Guard on the walled center (8, 8) of seat 0; seat 1 attacks.
    const walls = walledV7({
      attackerFaction: "ORIGINAL",
      attackers: [
        { role: "MARKSMAN", at: at(8, 6) },
        { role: "CATAPULT", at: at(8, 5) },
        { role: "FIGHTER", at: at(7, 7) },
      ],
      attackerTechs: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
    });
    expect(preview(walls, at(8, 6), at(8, 8), 1)).toMatchObject({
      defense2: 6,
      fortificationLevel: 2,
      damageToDefender: 4,
    });
    expect(preview(walls, at(8, 5), at(8, 8), 1).damageToDefender).toBe(7);
    expect(preview(walls, at(7, 7), at(8, 8), 1)).toMatchObject({
      defense2: 10,
      damageToDefender: 3,
    });
    const both = walledV7({
      attackerFaction: "ORIGINAL",
      attackers: [{ role: "MARKSMAN", at: at(8, 6) }],
      attackerTechs: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
      fieldDefense: true,
    });
    expect(preview(both, at(8, 6), at(8, 8), 1)).toMatchObject({
      defense2: 10,
      fortificationLevel: 4,
      damageToDefender: 3,
    });
  });
});

// The ninth unit (`pulp_wars-w49.17`, 7r55): the Swordsman of tuning 5 is
// the Champion, costs 6 Coins (5), and is at Metallurgy (Engineering); the
// role is every faction's heavy line unit. Its combat numbers are those of
// tuning 5. tests/unit/ruleset-v7-ninth-unit.test.ts covers the slot.
describe("the Swordsman (the Champion since 7r55)", () => {
  it("is the last role, and every tree unlocks it, at Metallurgy", () => {
    expect(UNIT_ROLE_IDS_V7.at(-1)).toBe("SWORDSMAN");
    expect(HUMAN_ONLY_ROLES_V7).toEqual([]);
    expect(effectiveRoleRuleV7("SWORDSMAN", "ORIGINAL")).toMatchObject({
      label: "Champion",
      tacticalRole: "LINE",
      cost: 6,
      maxHp: 15,
      attack2: 7,
      defense2: 5,
      move: 1,
      range: 1,
      technology: "METALLURGY",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE"],
    });
    for (const faction of FACTION_IDS_V7) {
      expect(factionUnlocksRoleV7(faction, "SWORDSMAN"), faction).toBe(true);
      expect(
        technologyCapabilitiesV7(
          TECHNOLOGY_IDS_V7,
          faction,
        ).trainableRoles.includes("SWORDSMAN"),
        faction,
      ).toBe(true);
      expect(
        factionTreeV7(faction)
          .nodes.find((node) => node.id === "ENGINEERING")
          ?.unlockedRoles.includes("SWORDSMAN"),
        faction,
      ).toBe(false);
      expect(
        factionTreeV7(faction)
          .nodes.find((node) => node.id === "METALLURGY")
          ?.unlockedRoles.includes("SWORDSMAN"),
        faction,
      ).toBe(true);
    }
    expect(
      technologyCapabilitiesV7(
        TECHNOLOGY_IDS_V7.filter((tech) => tech !== "METALLURGY"),
        "ORIGINAL",
      ).trainableRoles,
    ).not.toContain("SWORDSMAN");
  });

  it("is trained for 6 Coins with Metallurgy", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(2, 8) }], {
      techs: { 0: ["DRILL", "ENGINEERING", "METALLURGY"] },
      coins: 6,
    });
    const capital = state.cities.find(
      (city) => city.ownerId === seatIdV7(state, 0),
    );
    if (capital === undefined) throw new Error("no capital");
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: capital.id,
      role: "SWORDSMAN",
    };
    expect(
      queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, 0))),
    ).toContainEqual(train);
    const result = applyOkV7(state, seatIdV7(state, 0), train);
    expect(unitAtV7(result.state, capital.at)).toMatchObject({
      role: "SWORDSMAN",
      hp: 15,
      maxHp: 15,
    });
    expect(
      result.state.players.find((player) => player.seat === 0)?.coins,
    ).toBe(0);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
    // Without Metallurgy the command is not offered.
    const untaught = field([{ seat: 1, role: "FIGHTER", at: at(2, 8) }], {
      techs: { 0: ["DRILL", "ENGINEERING"] },
      coins: 6,
    });
    expect(
      queryPlayerCommandsV7(viewForV7(untaught, seatIdV7(untaught, 0))),
    ).not.toContainEqual(train);
  });

  it("wears a Guard down, survives a Knight, and falls to two Catapults", () => {
    const state = field([
      { seat: 0, role: "SWORDSMAN", at: at(5, 3) },
      { seat: 0, role: "KNIGHT", at: at(4, 6) },
      { seat: 0, role: "CATAPULT", at: at(8, 6) },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
      { seat: 1, role: "GUARD", at: at(5, 4) },
      { seat: 1, role: "SWORDSMAN", at: at(5, 6) },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    // Against a Guard: 8 for 6, and the second attack kills it.
    expect(preview(state, at(5, 3), at(5, 4))).toMatchObject({
      damageToDefender: 8,
      damageToAttacker: 6,
    });
    const second = attack(state, at(5, 3), at(5, 4));
    expect(
      preview(
        checkedV7({
          ...second,
          units: second.units.map((unit) =>
            unit.role === "SWORDSMAN" && unit.at.y === 3
              ? {
                  ...unit,
                  activation: {
                    ...unit.activation,
                    attacked: false,
                    attacksUsed: 0,
                    handled: false,
                  },
                }
              : unit,
          ),
        }),
        at(5, 3),
        at(5, 4),
      ),
    ).toMatchObject({ damageToDefender: 9, defenderDies: true });
    // Against a Fighter: 10 of 12 for 3.
    expect(preview(state, at(5, 3), at(4, 2))).toMatchObject({
      damageToDefender: 10,
      damageToAttacker: 3,
    });
    // A Knight does not kill it in one attack; nor does a Fighter hurt it much.
    expect(preview(state, at(4, 6), at(5, 6))).toMatchObject({
      damageToDefender: 11,
      defenderDies: false,
      damageToAttacker: 4,
    });
    expect(preview(state, at(6, 6), at(5, 6))).toMatchObject({
      damageToDefender: 4,
      damageToAttacker: 6,
    });
    // A Catapult takes 7 of its 15.
    expect(preview(state, at(8, 6), at(5, 6))).toMatchObject({
      damageToDefender: 7,
      damageToAttacker: 0,
    });
  });

  it("has its own sprite and portrait, and every other faction has a unit of the role", () => {
    // Bead `pulp_wars-w49.9`: the Guard no longer stands in.
    expect(chibiFallbackSubjectV7("UNIT:SWORDSMAN")).toBeNull();
    expect(chibiFallbackSubjectV7("PORTRAIT:SWORDSMAN")).toBeNull();
    const registered = CHIBI_DIRECTION_ART_ASSETS_V7.map(
      (asset) => asset.subject,
    );
    expect(registered).toContain("UNIT:SWORDSMAN");
    expect(registered).toContain("PORTRAIT:SWORDSMAN");
    expect(galleryUnitCellV7("SWORDSMAN", "ORIGINAL")).toMatchObject({
      kind: "UNIT",
      name: "Champion",
      subject: "UNIT:SWORDSMAN",
      portrait: "PORTRAIT:SWORDSMAN",
    });
    for (const faction of FACTION_IDS_V7)
      if (faction !== "ORIGINAL")
        expect(galleryUnitCellV7("SWORDSMAN", faction), faction).toMatchObject({
          kind: "UNIT",
          name: effectiveRoleRuleV7("SWORDSMAN", faction).label,
        });
  });
});

describe("Drill is removed", () => {
  it("is no command, and a Barracks still adds a unit slot", () => {
    expect(COMMAND_KIND_ORDER_V7 as readonly string[]).not.toContain(
      "DRILL_UNIT",
    );
    expect(parseCommandV7({ kind: "DRILL_UNIT", unitId: 1 }).ok).toBe(false);
    expect(BARRACKS_CAPACITY_V7).toBe(1);
  });

  it("leaves no veteran without the kills outside a match with Shrines", () => {
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 1, role: "FIGHTER", at: at(2, 8) },
    ]);
    const drilled = {
      ...state,
      units: state.units.map((unit) =>
        unit.at.x === 8
          ? { ...unit, veteran: true, maxHp: unit.maxHp + 5, hp: unit.hp + 5 }
          : unit,
      ),
    };
    expect(parseGameStateV7(JSON.parse(JSON.stringify(drilled)))).toBeNull();
  });
});

describe("Land Grant costs 1 Coin a tile", () => {
  it("has no minimum above one tile's price", () => {
    expect(LAND_GRANT_COST_PER_TILE_V7).toBe(1);
    expect([1, 3, 8, 16].map(landGrantCostV7)).toEqual([1, 3, 8, 16]);
    expect(landGrantCostV7(0)).toBe(1);
  });
});

describe("Blast Mountain spares the unit that sets it", () => {
  const blast = (where: CoordV7): CommandV7 => ({
    kind: "BLAST_MOUNTAIN",
    at: where,
  });

  it("is the player's weakest land unit next to the Mountain; its other units are hit", () => {
    const state = mountainV7(
      field([
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(4, 2), hp: 9 },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(6, 4) },
      ]),
      at(5, 3),
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const setter = unitAtV7(state, at(4, 2));
    expect(blastSetterV7(state.units, seatIdV7(state, 0), at(5, 3))?.id).toBe(
      setter.id,
    );
    const previewed = previewBlastMountainV7(view, at(5, 3));
    expect(previewed?.setterUnitId).toBe(setter.id);
    expect(
      previewed?.explosions[0]?.results.map((entry) => entry.unitId),
    ).not.toContain(setter.id);
    const result = applyOkV7(state, seatIdV7(state, 0), blast(at(5, 3)));
    // The setter keeps its 9 HP; the two Fighters beside it lose 5 each.
    expect(unitAtV7(result.state, at(4, 2)).hp).toBe(9);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(7);
    expect(unitAtV7(result.state, at(6, 2)).hp).toBe(7);
    expect(unitAtV7(result.state, at(5, 3)).hp).toBe(12);
    expect(unitAtV7(result.state, at(6, 4)).hp).toBe(7);
  });

  it("has no setter without an own unit next to the Mountain", () => {
    const state = field([{ seat: 1, role: "GUARD", at: at(5, 3) }]);
    expect(blastSetterV7(state.units, seatIdV7(state, 0), at(5, 3))).toBeNull();
    // A unit on the Mountain itself is not next to it.
    const on = field([{ seat: 0, role: "FIGHTER", at: at(5, 3) }]);
    expect(blastSetterV7(on.units, seatIdV7(on, 0), at(5, 3))).toBeNull();
  });
});

describe("the labs under 7r48", () => {
  const lab = (id: string): GameStateV7 => {
    const mission = MISSION_REGISTRY_V7.find((item) => item.id === id);
    if (mission === undefined) throw new Error(id);
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error(id);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(`${id} ${created.error.code}`);
    return created.state;
  };
  const count = (state: GameStateV7, seat: number, role: UnitRoleIdV7) =>
    state.units.filter(
      (unit) => unit.ownerId === seatIdV7(state, seat) && unit.role === role,
    ).length;

  it("build, with Swordsmen in LAB_BACKLINE and LAB_LATE and none in LAB_SIEGE", () => {
    const siege = lab("LAB_SIEGE");
    const backline = lab("LAB_BACKLINE");
    const late = lab("LAB_LATE");
    for (const state of [siege, backline, late])
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
    for (const seat of [0, 1]) {
      expect(count(siege, seat, "SWORDSMAN")).toBe(0);
      expect(count(backline, seat, "SWORDSMAN")).toBe(1);
      expect(count(late, seat, "SWORDSMAN")).toBe(3);
    }
    // LAB_SIEGE: Engineering is the player's fifth way in.
    expect(
      queryPlayerCommandsV7(viewForV7(siege, siege.humanPlayerId)),
    ).toContainEqual({ kind: "RESEARCH", tech: "ENGINEERING" });
  });
});

describe("Normal AI army play: who plays it", () => {
  // The Martian pass (`pulp_wars-w49.14`, 7r52): and the Martian seats.
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): and the Dinosaur seats.
  it("is the Human, Undead, Goblin, Martian, and Dinosaur seats", () => {
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`).
      "ICE_FOLK",
      // Step two of the Dwarf pass (`pulp_wars-w49.28`).
      "DWARF",
    ]);
  });
});

describe("Normal AI army play: the composition", () => {
  const counts = (pieces: readonly GoblinPieceV7[]) => {
    const state = field(pieces);
    const view = viewForV7(state, seatIdV7(state, 0));
    return armyCountsV7(view, (unit) => unit.ownerId !== view.viewer.id);
  };
  const best = (
    faction: FactionIdV7,
    roles: readonly UnitRoleIdV7[],
    army: ReturnType<typeof counts>,
    threatened = false,
  ): UnitRoleIdV7 =>
    [...roles].sort(
      (left, right) =>
        armyRoleScoreV7(faction, right, army, threatened) -
        armyRoleScoreV7(faction, left, army, threatened),
    )[0] as UnitRoleIdV7;

  it("shares add up to the whole army", () => {
    // (`reduce<number>`: the Dinosaur shares hold a 0, the Triceratops
    // being a line unit, which would otherwise narrow the sum's type.)
    for (const shares of Object.values(ARMY_SHARES_V7))
      expect(
        Object.values(shares).reduce<number>((sum, value) => sum + value, 0),
      ).toBe(100);
  });

  it("never trains only defenders, and prefers the dearer line unit", () => {
    const guards = counts([
      { seat: 0, role: "GUARD", at: at(8, 8) },
      { seat: 0, role: "GUARD", at: at(7, 8) },
      { seat: 0, role: "GUARD", at: at(9, 8) },
    ]);
    expect(guards.byClass.DEFENDER).toBe(3);
    expect(best("ORIGINAL", ["FIGHTER", "GUARD"], guards)).toBe("FIGHTER");
    expect(best("ORIGINAL", ["FIGHTER", "GUARD", "SWORDSMAN"], guards)).toBe(
      "SWORDSMAN",
    );
    // A line of Fighters: now the Guard, then the ranged and siege units.
    const fighters = counts([
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 0, role: "FIGHTER", at: at(7, 8) },
      { seat: 0, role: "FIGHTER", at: at(9, 8) },
    ]);
    expect(best("ORIGINAL", ["FIGHTER", "GUARD"], fighters)).toBe("GUARD");
    expect(best("ORIGINAL", ["FIGHTER", "GUARD", "MARKSMAN"], fighters)).toBe(
      "MARKSMAN",
    );
    // Tuning 6 (`pulp_wars-w49.6`): of two classes the army lacks, the
    // dearer unit is bought first (the Marksman was).
    expect(
      best("ORIGINAL", ["FIGHTER", "GUARD", "MARKSMAN", "CATAPULT"], fighters),
    ).toBe("CATAPULT");
    // The same holds for the Undead and Goblin rosters.
    expect(best("UNDEAD", ["FIGHTER", "GUARD"], guards)).toBe("FIGHTER");
    expect(best("GOBLIN", ["FIGHTER", "GUARD"], guards)).toBe("FIGHTER");
  });

  it("wants Knights against an enemy with fragile units, and bodies in a threatened city", () => {
    const mixed: readonly GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 0, role: "FIGHTER", at: at(7, 8) },
      { seat: 0, role: "GUARD", at: at(9, 8) },
      { seat: 0, role: "MARKSMAN", at: at(8, 7) },
      { seat: 0, role: "CATAPULT", at: at(8, 9) },
      { seat: 0, role: "KNIGHT", at: at(7, 7) },
    ];
    const plain = counts(mixed);
    const fragile = counts([
      ...mixed,
      { seat: 1, role: "CATAPULT", at: at(2, 7) },
      { seat: 1, role: "MARKSMAN", at: at(2, 9) },
    ]);
    expect(fragile.hostileFragile).toBe(2);
    expect(
      armyRoleScoreV7("ORIGINAL", "KNIGHT", fragile, false),
    ).toBeGreaterThan(armyRoleScoreV7("ORIGINAL", "KNIGHT", plain, false));
    const roles = [
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "CATAPULT",
      "KNIGHT",
    ] as const;
    expect(best("ORIGINAL", roles, fragile)).toBe("KNIGHT");
    expect(best("ORIGINAL", roles, plain, true)).toBe("GUARD");
  });
});

describe("Normal AI army play: units before research and buildings", () => {
  it("steps off its center, trains, and only then researches, for every army faction", () => {
    for (const faction of ARMY_PLAY_FACTIONS_V7) {
      const state = field(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        {
          factions: [faction, "ORIGINAL"],
          techs: { 0: ["HUNTING", "DRILL", "FORTIFICATION"] },
          coins: 14,
        },
      );
      const turn = policyTurn(state);
      const kinds = kindsOf(turn.commands);
      // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur city lays an
      // Egg beside its center, so its Caveman stays on it.
      const dinosaur = faction === "DINOSAUR";
      const firstTrain = kinds.indexOf(dinosaur ? "LAY_EGG" : "TRAIN");
      expect(firstTrain, faction).toBeGreaterThanOrEqual(0);
      if (dinosaur)
        expect(
          turn.commands
            .slice(0, firstTrain)
            .some(
              (command) =>
                command.kind === "MOVE" &&
                command.unitId === unitAtV7(state, at(8, 8)).id,
            ),
          faction,
        ).toBe(false);
      // The Fighter leaves the center first: a city trains onto an empty one.
      else
        expect(turn.commands[firstTrain - 1], faction).toMatchObject({
          kind: "MOVE",
          unitId: unitAtV7(state, at(8, 8)).id,
        });
      for (const [index, kind] of kinds.entries())
        if (kind === "RESEARCH" || kind.startsWith("BUILD_"))
          expect(index, `${faction} ${kind}`).toBeGreaterThan(firstTrain);
      // What is left goes to the technology of a fighting unit, not to the
      // economy.
      expect(
        turn.commands.find((command) => command.kind === "RESEARCH"),
        faction,
        // The Dinosaur pass: a Dinosaur seat with the Ankylosaurus's
        // technology goes on toward the Triceratops (Engineering, the step
        // to Metallurgy, since the ninth unit, 7r55; Forestry before).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the seat owns
        // Fortification, its defender's technology (Force Fields for a
        // Martian seat, which researched it here as its next step before).
        // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Spitter
        // is second in a Dinosaur seat's order, so it researches Spitters
        // like the others.
        // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Sled is
        // first in an Ice Folk seat's order (Scouting).
      ).toEqual({
        kind: "RESEARCH",
        tech: faction === "ICE_FOLK" ? "SCOUTING" : "MARKSMANSHIP",
      });
    }
  });

  it("trains in every city with a free slot, never only Guards", () => {
    // Seat 0 holds its capital and the village at (8, 5) as a second city.
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        { seat: 0, role: "GUARD", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      {
        techs: { 0: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"] },
        coins: 30,
      },
    );
    const captured = applyOkV7(base, seatIdV7(base, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base, at(8, 5)).id,
    }).state;
    // Next turn: the capturer has its Move again and the cities their action.
    const next = checkedV7({
      ...captured,
      cities: captured.cities.map((city) => ({
        ...city,
        cityActionAvailable: true,
      })),
      units: captured.units.map((unit) => ({
        ...unit,
        activation: {
          ...unit.activation,
          moved: false,
          movedPathLength: 0,
          captured: false,
          handled: false,
        },
      })),
    });
    const turn = policyTurn(next);
    const roles = trained(turn.commands);
    expect(roles.length).toBeGreaterThanOrEqual(2);
    expect(
      new Set(
        turn.commands.flatMap((command) =>
          command.kind === "TRAIN" ? [command.cityId] : [],
        ),
      ).size,
    ).toBe(2);
    expect(roles.some((role) => role !== "GUARD")).toBe(true);
    expect(roles).toContain("MARKSMAN");
  });
});

describe("Normal AI army play: shooting and combined kills", () => {
  it("a ranged unit with a target in range shoots", () => {
    const state = field(
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 5) },
        { seat: 0, role: "CATAPULT", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(5, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const turn = policyTurn(state);
    const target = unitAtV7(state, at(5, 7)).id;
    const shots = turn.commands.filter(
      (command) => command.kind === "ATTACK" && command.targetUnitId === target,
    );
    expect(shots).toContainEqual({
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 5)).id,
      targetUnitId: target,
    });
    expect(shots).toContainEqual({
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 4)).id,
      targetUnitId: target,
    });
  });

  it("softens a Guard with its ranged units and finishes it with a Fighter that moves in", () => {
    const state = late(
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 2) },
        { seat: 0, role: "MARKSMAN", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const guard = unitAtV7(state, at(5, 4)).id;
    const fighter = unitAtV7(state, at(5, 2)).id;
    const turn = policyTurn(state);
    const onGuard = turn.commands.filter(
      (command) => command.kind === "ATTACK" && command.targetUnitId === guard,
    );
    // Both Marksmen, then the Fighter: three attacks, the last a kill.
    expect(
      onGuard.map((command) => "unitId" in command && command.unitId),
    ).toEqual([
      unitAtV7(state, at(4, 2)).id,
      unitAtV7(state, at(6, 2)).id,
      fighter,
    ]);
    expect(turn.state.units.some((unit) => unit.id === guard)).toBe(false);
    // The Fighter moved next to the Guard only after the shots.
    const moveIndex = turn.commands.findIndex(
      (command) => command.kind === "MOVE" && command.unitId === fighter,
    );
    const lastShot = turn.commands.findIndex(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === unitAtV7(state, at(6, 2)).id,
    );
    expect(moveIndex).toBeGreaterThan(lastShot);
  });

  it("moves a melee unit in for an acceptable exchange and not for a bad one", () => {
    // A Fighter two tiles from a lone Fighter: 5 for 5 is acceptable.
    const even = late(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const evenTurn = policyTurn(even);
    expect(evenTurn.commands).toContainEqual({
      kind: "ATTACK",
      unitId: unitAtV7(even, at(5, 3)).id,
      targetUnitId: unitAtV7(even, at(5, 5)).id,
    });
    // The same Fighter against a Guard would deal 4 and take 8: it does
    // not attack.
    const bad = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    expect(kindsOf(policyTurn(bad).commands)).not.toContain("ATTACK");
  });
});

describe("Normal AI army play: the garrison and the siege units", () => {
  it("keeps a unit on its center while a hostile unit is within six tiles", () => {
    // A hostile unit near the capital (8, 8), a Knight that could ride
    // onto the center or a Fighter two tiles away: the Guard on the center
    // steps beside it and the city trains, so the center is never empty
    // and a besieged city is reinforced rather than sat in. Neither unit
    // goes any further.
    for (const threat of [
      { role: "KNIGHT", at: at(5, 8) },
      { role: "FIGHTER", at: at(6, 8) },
      { role: "KNIGHT", at: at(3, 8) },
    ] as const) {
      const state = field(
        [
          { seat: 0, role: "GUARD", at: at(8, 8) },
          { seat: 1, ...threat },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: { 0: ["HUNTING", "DRILL", "FORTIFICATION"] }, coins: 20 },
      );
      const owner = unitAtV7(state, at(8, 8)).ownerId;
      const turn = policyTurn(state);
      expect(kindsOf(turn.commands), threat.role).toContain("TRAIN");
      expect(unitAtV7(turn.state, at(8, 8)).ownerId).toBe(owner);
      expect(
        turn.state.units.filter(
          (unit) =>
            unit.ownerId === owner &&
            Math.max(Math.abs(unit.at.x - 8), Math.abs(unit.at.y - 8)) <= 1,
        ),
        threat.role,
      ).toHaveLength(2);
    }
    // Without the Coins for a unit the Guard stays where it is.
    const poor = field(
      [
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 1, role: "KNIGHT", at: at(5, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { techs: { 0: ["HUNTING", "DRILL", "FORTIFICATION"] }, coins: 0 },
    );
    const poorTurn = policyTurn(poor);
    expect(kindsOf(poorTurn.commands)).not.toContain("MOVE");
    expect(unitAtV7(poorTurn.state, at(8, 8)).role).toBe("GUARD");
    // With nobody near, the same unit leaves for its job.
    const quiet = field(
      [
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(1, 8) },
      ],
      { techs: { 0: ["HUNTING", "DRILL", "FORTIFICATION"] }, coins: 0 },
    );
    expect(kindsOf(policyTurn(quiet).commands)).toContain("MOVE");
  });

  it("does not walk a Catapult into the reach of an enemy Catapult", () => {
    // The enemy Catapult at (5, 5) reaches every tile two or three away;
    // the own Catapult at (5, 9) is four away and has no shot.
    const state = field(
      [
        { seat: 0, role: "CATAPULT", at: at(5, 9) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "CATAPULT", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const catapult = unitAtV7(state, at(5, 9));
    const turn = policyTurn(state);
    const after = turn.state.units.find((unit) => unit.id === catapult.id);
    if (after === undefined) throw new Error("no Catapult");
    expect(
      Math.max(Math.abs(after.at.x - 5), Math.abs(after.at.y - 5)),
    ).toBeGreaterThan(3);
  });

  it("moves a Catapult to where it has a shot next turn when the tile is safe", () => {
    const state = field(
      [
        { seat: 0, role: "CATAPULT", at: at(5, 1) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const catapult = unitAtV7(state, at(5, 1));
    const turn = policyTurn(state);
    const after = turn.state.units.find((unit) => unit.id === catapult.id);
    if (after === undefined) throw new Error("no Catapult");
    const gap = Math.max(Math.abs(after.at.x - 5), Math.abs(after.at.y - 5));
    expect(gap).toBeGreaterThanOrEqual(2);
    expect(gap).toBeLessThanOrEqual(3);
  });
});

describe("Normal AI army play: the fixed labs", () => {
  it("LAB_FIELD_DEFENSE fixture: a Field Defense still stops no shot", () => {
    // A Catapult's shot is made against the Field Defense and destroys it;
    // the Walls stay (current rules sections 12.3 and 13.3).
    const state = fieldDefenseV7(
      field([
        { seat: 0, role: "CATAPULT", at: at(2, 4) },
        { seat: 1, role: "FIGHTER", at: at(2, 7) },
      ]),
      at(2, 7),
    );
    expect(preview(state, at(2, 4), at(2, 7))).toMatchObject({
      fortificationLevel: 2,
      fortificationIgnored: 0,
    });
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(2, 4)).id,
      targetUnitId: unitAtV7(state, at(2, 7)).id,
    });
    expect(result.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(2, 7),
      reason: "CATAPULT",
    });
  });
});
