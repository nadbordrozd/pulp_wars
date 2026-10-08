import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  ARMY_BANSHEE_APPROACH_PRIORITY_V7,
  ARMY_BANSHEE_APPROACH_RADIUS_V7,
  ARMY_CURE_TRAINING_VALUE_V7,
  ARMY_DEAR_UNIT_ARMY_V7,
  ARMY_ECONOMY_FORESTRY_WEIGHT_V7,
  ARMY_PESTILENCE_LICHES_V7,
  ARMY_SWAP_PRIORITY_V7,
  ARMY_VILLAGES_FIRST_ROUNDS_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_UNDEAD_SKIRMISHER_MAXIMUM_V7,
  ARMY_UNDEAD_SKIRMISHER_PER_UNITS_V7,
  ARMY_ZOMBIE_BITE_VALUE_V7,
  armyRoleScoreV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  GHOUL_CARRION_BONUS2_V7,
  PRIOR_RULESET_7_IDS,
  RAISE_DEAD_RADIUS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SKELETON_RANGED_DEFENSE2_V7,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  assignedUnitCountV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseGameStateV7,
  previewCityCapacityV7,
  previewRaiseDeadV7,
  previewWailV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import {
  PLAGUE_NEEDS_TEXT_V7,
  bonesTextV7,
  carrionTextV7,
  rangedDefenseTextV7,
  rangedDefenseWordV7,
  scoutsRewardTextV7,
  strikesBackTextV7,
} from "../../src/render/technology-unlock-text-v7";
import { PESTILENCE_UNLOCK_TEXT_V7 } from "../../src/render/undead-presentation-v7";
import { PRE_NAVAL_BRANCH_TECHS_V7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// The Undead pass (`pulp_wars-w49.13`, `pulp-wars-poc-7r51`,
// docs/product/RULESET_7_TUNING_UNDEAD.md): the Skeleton's Bones, the
// Vampire's Escape, the Abomination's Infect, Scouts for an Undead city;
// the Undead Normal AI's research order, army shares, the Coins it keeps
// for a Lich, and its Zombie, Banshee, Lich, Necromancer, and Vampire rules;
// the lab `LAB_UNDEAD_MID`. Two-seat arena (seed-2 Dry Land, 11 x 11): seat
// 0 capital (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8);
// every tile explored and every land technology researched unless stated.
// The numbers asserted here are the ones the tuning document gives as
// reasons (`scripts/undead-tuning-analysis-v7.ts`).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

interface FieldOptionsV7 extends GoblinArenaOptionsV7 {
  readonly graves?: readonly CoordV7[];
  /** The units on these tiles have no home city (the capital keeps slots). */
  readonly orphans?: readonly CoordV7[];
}

/**
 * The arena with every tile outside a settlement open Grass with no
 * resource (so a level-1 capital has no opening harvest and the seat's army
 * rules are on), the given Graves, and the given orphans.
 */
function field(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const base = goblinArenaV7(factions, pieces, options);
  const state: GameStateV7 = {
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.site === null
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
    graves: [...(options.graves ?? [])].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    ),
    units: base.units.map((unit) =>
      (options.orphans ?? []).some((where) => same(where, unit.at))
        ? { ...unit, homeCityId: null }
        : unit,
    ),
  };
  return { state, view: viewOf(state) };
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

function previewAt(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): NonNullable<ReturnType<typeof queryCombatPreviewV7>> {
  const preview = queryCombatPreviewV7(
    viewOf(state),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (preview === null) throw new Error("attack not offered");
  return preview;
}

/** The Normal AI's candidates, the best first. */
const candidates = (view: PlayerViewV7): readonly CommandV7[] =>
  chooseNormalCommandV7(view).candidates.map((candidate) => candidate.command);

/** The Normal AI's candidates for one unit, the best first. */
const unitCommands = (
  view: PlayerViewV7,
  unitId: number,
): readonly CommandV7[] =>
  candidates(view).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );

const ROSTER: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
];

describe("the Undead pass: identity", () => {
  // The Martian pass (tests/unit/ruleset-v7-martian-pass.test.ts) took 7r52
  // , the Dinosaur pass 7r53, and the economy rejig 7r54, so 7r51 is a
  // prior identity.
  it("was 7r51 after 7r50, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r56");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r56.current");
    expect(PRIOR_RULESET_7_IDS.slice(-6, -4)).toEqual([
      "pulp-wars-poc-7r50",
      "pulp-wars-poc-7r51",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-6, -4)).toEqual([
      "pulpWars.save.v7r50.current",
      "pulpWars.save.v7r51.current",
    ]);
  });

  it("registers Bones, Escape, and Infect on three Undead roles and moves no number", () => {
    // A Defense against attacks from two or more tiles: the Human Guard's
    // is below its own (Open to ranged), the Skeleton's above (Bones).
    const ranged: string[] = [];
    const factions: readonly FactionIdV7[] = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ];
    for (const faction of factions)
      for (const role of [...ROSTER, "SWORDSMAN"] as const) {
        const value = roleMechanicsV7(role, faction).rangedDefense2;
        if (value !== null)
          ranged.push(
            `${faction} ${role} ${value} of ${effectiveRoleRuleV7(role, faction).defense2}`,
          );
      }
    expect(ranged).toEqual(["ORIGINAL GUARD 2 of 6", "UNDEAD FIGHTER 6 of 4"]);
    expect(SKELETON_RANGED_DEFENSE2_V7).toBe(6);
    expect(
      ROSTER.map((role) => [
        effectiveRoleRuleV7(role, "UNDEAD").label,
        effectiveRoleRuleV7(role, "UNDEAD").abilities,
      ]),
    ).toEqual([
      ["Skeleton", ["ATTACK", "CAPTURE"]],
      ["Ghoul", ["ATTACK", "CAPTURE", "CHARGE", "DEVOUR"]],
      ["Banshee", ["CAPTURE", "WAIL"]],
      ["Zombie", ["ATTACK", "CAPTURE", "INFECT", "BITE"]],
      ["Necromancer", ["ATTACK", "RALLY", "RAISE_DEAD"]],
      ["Lich", ["ATTACK", "PLAGUE"]],
      ["Vampire", ["ATTACK", "LIFESTEAL", "UNANSWERED", "ESCAPE"]],
      ["Abomination", ["ATTACK", "CAPTURE", "PUSH", "INFECT"]],
    ]);
    // The units whose kill rises do not advance onto its tile.
    expect(
      ROSTER.filter(
        (role) => !roleMechanicsV7(role, "UNDEAD").advancesAfterKill,
      ),
    ).toEqual(["GUARD", "CATAPULT", "JUGGERNAUT"]);
    // No number of the roster moved.
    expect(
      ROSTER.map((role) => {
        const rule = effectiveRoleRuleV7(role, "UNDEAD");
        return [
          rule.cost,
          rule.maxHp,
          rule.attack2,
          rule.defense2,
          rule.move,
          rule.range,
        ];
      }),
    ).toEqual([
      [2, 10, 4, 4, 1, 1],
      [3, 10, 4, 2, 2, 1],
      [3, 8, 2, 2, 1, 0],
      [3, 18, 4, 4, 1, 1],
      [5, 10, 2, 2, 1, 1],
      [8, 10, 6, 2, 1, 3],
      [9, 10, 6, 2, 3, 1],
      [null, 40, 8, 8, 1, 1],
    ]);
    // The Human Juggernaut and Knight are as they were.
    expect(effectiveRoleRuleV7("JUGGERNAUT", "ORIGINAL").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "PUSH",
    ]);
    expect(effectiveRoleRuleV7("KNIGHT", "ORIGINAL").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "OVERRUN",
    ]);
  });
});

describe("the Undead pass: Bones", () => {
  /** A Human attacker on a Skeleton at (5, 2) from `from`. */
  const shot = (
    attacker: UnitRoleIdV7,
    from: CoordV7,
    hp = 10,
    faction: FactionIdV7 = "ORIGINAL",
  ) => {
    const state = goblinArenaV7(
      [faction, "UNDEAD"],
      [
        { seat: 0, role: attacker, at: from },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp },
      ],
    );
    return previewAt(state, from, at(5, 2));
  };

  it("gives a Skeleton Defense 3 against an attack from two or more tiles", () => {
    // A Marksman from two tiles: 4 (5 before the pass); beside it: 5, and
    // the Skeleton strikes back.
    const far = shot("MARKSMAN", at(7, 2));
    expect([far.defense2, far.damageToDefender, far.damageToAttacker]).toEqual([
      6, 4, 0,
    ]);
    const near = shot("MARKSMAN", at(6, 2));
    expect([near.defense2, near.damageToDefender]).toEqual([4, 5]);
    expect(near.damageToAttacker).toBeGreaterThan(0);
    // Three Marksman shots kill a Skeleton (two before): 4, 5, and the last.
    expect(shot("MARKSMAN", at(7, 2), 6).damageToDefender).toBe(5);
    expect(shot("MARKSMAN", at(7, 2), 1).defenderDies).toBe(true);
    // A Catapult deals it 7 (8), a Rocket Cart alone 8 (it killed it).
    expect(shot("CATAPULT", at(8, 2)).damageToDefender).toBe(7);
    const rocket = shot("CATAPULT", at(8, 2), 10, "GOBLIN");
    expect([rocket.damageToDefender, rocket.defenderDies]).toEqual([8, false]);
    expect(shot("MARKSMAN", at(7, 2), 10, "GOBLIN").damageToDefender).toBe(4);
    // Hand to hand nothing changed: a Fighter 5, a Swordsman and a Knight
    // kill it.
    expect(shot("FIGHTER", at(6, 2)).damageToDefender).toBe(5);
    expect(shot("SWORDSMAN", at(6, 2)).defenderDies).toBe(true);
    expect(shot("KNIGHT", at(6, 2)).defenderDies).toBe(true);
  });

  it("leaves a Zombie and every other Undead unit as open to shots as before", () => {
    const on = (target: UnitRoleIdV7): number => {
      const state = goblinArenaV7(
        ["ORIGINAL", "UNDEAD"],
        [
          { seat: 0, role: "MARKSMAN", at: at(7, 2) },
          { seat: 1, role: target, at: at(5, 2) },
        ],
      );
      return previewAt(state, at(7, 2), at(5, 2)).damageToDefender;
    };
    expect(on("GUARD")).toBe(5);
    expect(on("RAIDER")).toBe(6);
    expect(on("MARKSMAN")).toBe(6);
    expect(on("KNIGHT")).toBe(6);
  });

  it("resolves the shot as previewed, on a Field Defense too", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 7) },
      ],
    );
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at(2, 7)) ? { ...tile, fieldDefense: true } : tile,
        ),
      },
    };
    const preview = previewAt(state, at(2, 5), at(2, 7));
    // Bones 3 and two fortification levels.
    expect([preview.defense2, preview.fortificationLevel]).toEqual([10, 2]);
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(2, 5)).id,
      targetUnitId: unitAtV7(state, at(2, 7)).id,
    });
    expect(unitAtV7(result.state, at(2, 7)).hp).toBe(
      10 - preview.damageToDefender,
    );
  });

  it("says so on the Skeleton and nowhere else", () => {
    expect(bonesTextV7(6)).toBe(
      "Bones: Defense 3 against attacks from 2 or more tiles",
    );
    expect(rangedDefenseTextV7(6, 4)).toBe(bonesTextV7(6));
    expect(rangedDefenseTextV7(2, 6)).toBe(
      "Open to ranged: Defense 1 against attacks from 2 or more tiles",
    );
    // The short word of a combat line in the text harness.
    expect([rangedDefenseWordV7(6, 4), rangedDefenseWordV7(2, 6)]).toEqual([
      "bones",
      "open to ranged",
    ]);
    expect(
      recruitmentRolePresentationV7("FIGHTER", "UNDEAD").restrictions,
    ).toContain("Bones: Defense 3 against attacks from 2 or more tiles.");
    expect(
      recruitmentRolePresentationV7("GUARD", "ORIGINAL").restrictions,
    ).toContain(
      "Open to ranged: Defense 1 against attacks from 2 or more tiles.",
    );
    for (const role of ROSTER.filter((item) => item !== "FIGHTER"))
      expect(
        recruitmentRolePresentationV7(role, "UNDEAD").restrictions.join(" "),
      ).not.toMatch(/Bones|Open to ranged/);
    expect(
      recruitmentRolePresentationV7("FIGHTER", "ORIGINAL").restrictions.join(
        " ",
      ),
    ).not.toMatch(/Bones/);
  });
});

describe("the Undead pass: the Vampire's Escape", () => {
  const strike = () => {
    const { state } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
      ],
    );
    const vampire = unitAtV7(state, at(5, 3)).id;
    return {
      state,
      vampire,
      attacked: applyOkV7(state, seatIdV7(state, 0), {
        kind: "ATTACK",
        unitId: vampire,
        targetUnitId: unitAtV7(state, at(5, 2)).id,
      }),
    };
  };

  it("lets a Vampire that has attacked move again, once", () => {
    const { state, vampire, attacked } = strike();
    expect(previewAt(state, at(5, 3), at(5, 2))).toMatchObject({
      damageToDefender: 7,
      damageToAttacker: 0,
      noRetaliationReason: "UNANSWERED",
      escapeAvailable: true,
    });
    const actor = seatIdV7(state, 0);
    expect(
      attacked.state.units.find((unit) => unit.id === vampire)?.activation,
    ).toMatchObject({ attacked: true, escapeAvailable: true, handled: false });
    // Three tiles back: its whole Move.
    const flown = applyOkV7(attacked.state, actor, {
      kind: "MOVE",
      unitId: vampire,
      path: [at(6, 4), at(7, 4), at(8, 3)],
    });
    const after = flown.state.units.find((unit) => unit.id === vampire);
    expect(after?.at).toEqual(at(8, 3));
    expect(after?.activation).toMatchObject({
      escapeAvailable: false,
      handled: true,
    });
    // No second attack and no second Move.
    expect(
      queryPlayerCommandsV7(viewOf(flown.state)).filter(
        (command) => "unitId" in command && command.unitId === vampire,
      ),
    ).toEqual([]);
  });

  it("gives it after a kill too, from the tile the kill left it on", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "CATAPULT", at: at(5, 2) },
      ],
    );
    const vampire = unitAtV7(state, at(5, 3)).id;
    const preview = previewAt(state, at(5, 3), at(5, 2));
    expect(preview).toMatchObject({
      defenderDies: true,
      advances: true,
      escapeAvailable: true,
    });
    const killed = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: vampire,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    const moved = killed.state.units.find((unit) => unit.id === vampire);
    expect(moved?.at).toEqual(at(5, 2));
    expect(moved?.activation.escapeAvailable).toBe(true);
  });

  it("gives no other Undead unit an Escape, and the Human Knight none", () => {
    for (const role of ["FIGHTER", "RAIDER", "GUARD", "CAPTAIN"] as const) {
      const state = goblinArenaV7(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role, at: at(5, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
        ],
      );
      expect(previewAt(state, at(5, 3), at(5, 2)).escapeAvailable, role).toBe(
        false,
      );
    }
    const human = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    expect(previewAt(human, at(5, 3), at(5, 2)).escapeAvailable).toBe(false);
  });

  it("names it on the unit", () => {
    expect(
      recruitmentRolePresentationV7("KNIGHT", "UNDEAD").abilities,
    ).toContain(
      "Escape: May move again after attacking: a fresh full Move if it survives, then it is done for the turn.",
    );
  });
});

describe("the Undead pass: the Abomination's Infect", () => {
  it("raises what it kills as a Zombie and does not advance", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(6, 2) },
      ],
    );
    const actor = seatIdV7(state, 0);
    const preview = previewAt(state, at(5, 3), at(5, 2));
    expect(preview).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
      defenderInfected: true,
      advances: false,
    });
    const result = applyOkV7(state, actor, {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    expect(result.events.map((event) => event.kind)).toContain("UNIT_INFECTED");
    expect(unitAtV7(result.state, at(5, 3)).role).toBe("JUGGERNAUT");
    expect(unitAtV7(result.state, at(5, 2))).toMatchObject({
      ownerId: actor,
      role: "GUARD",
      hp: 10,
      maxHp: 18,
    });
    expect(result.state.graves).toEqual([]);
  });

  it("does not bite: a unit that survives its hit is not Bitten", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    const preview = previewAt(state, at(5, 3), at(5, 2));
    expect([preview.defenderDies, preview.defenderBitten]).toEqual([
      false,
      false,
    ]);
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    expect(result.state.bitten).toEqual([]);
  });

  it("names it on the unit", () => {
    expect(
      recruitmentRolePresentationV7("JUGGERNAUT", "UNDEAD").abilities,
    ).toContain(
      "Infect: A land unit it kills rises as your Zombie. It fills no unit slot.",
    );
  });
});

describe("the Undead pass: Scouts", () => {
  it("gives an Undead city's Survey a free Ghoul", () => {
    expect(SURVEY_RAIDERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 1,
      // The Dinosaur pass, 7r53: a Dinosaur Survey grants a Raptor.
      DINOSAUR: 1,
      // The Martian pass, 7r52: a Martian Survey grants a Saucer.
      MARTIAN: 1,
      ICE_FOLK: 0,
      DWARF: 0,
      CANDY: 0,
    });
    const base = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { techs: { 0: ["GATHERING", "FARMING"], 1: [] } },
    );
    const actor = seatIdV7(base, 0);
    const capital = base.cities.find((city) => city.ownerId === actor);
    if (capital === undefined) throw new Error("capital missing");
    const farm = at(8, 9);
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, farm)
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
              }
            : tile,
        ),
      },
    };
    const built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: farm });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "SURVEY",
    });
    expect(
      chosen.events.find((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toMatchObject({ role: "RAIDER", reachedLevel: 2 });
    expect(
      chosen.state.units.some(
        (unit) => unit.ownerId === actor && unit.role === "RAIDER",
      ),
    ).toBe(true);
    expect(effectiveRoleRuleV7("RAIDER", "UNDEAD").label).toBe("Ghoul");
    expect(scoutsRewardTextV7("Ghoul")).toBe(
      "Reveal the area and a free Ghoul",
    );
  });
});

describe("the Undead pass: the matrix numbers the document reasons from", () => {
  const on = (
    attacker: UnitRoleIdV7,
    target: UnitRoleIdV7,
    activation: GoblinPieceV7["activation"] = {},
  ) => {
    const rule = effectiveRoleRuleV7(attacker, "UNDEAD");
    const reach = Math.max(rule.minimumRange, rule.range);
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: attacker, at: at(5 + reach, 2), activation },
        { seat: 1, role: target, at: at(5, 2) },
      ],
    );
    return previewAt(state, at(5 + reach, 2), at(5, 2));
  };

  it("has a Skeleton, a Ghoul, and a Zombie deal a Fighter the same 5", () => {
    for (const role of ["FIGHTER", "RAIDER", "GUARD"] as const)
      expect(
        [
          on(role, "FIGHTER").damageToDefender,
          on(role, "FIGHTER").damageToAttacker,
        ],
        role,
      ).toEqual([5, 5]);
    // A charging Ghoul 8, and it kills a Catapult; with Frenzy a Fighter.
    const charge = { moved: true, movedPathLength: 2 };
    expect(on("RAIDER", "FIGHTER", charge).damageToDefender).toBe(8);
    expect(on("RAIDER", "CATAPULT", charge).defenderDies).toBe(true);
    expect(
      on("RAIDER", "FIGHTER", { ...charge, inspired: true }).defenderDies,
    ).toBe(true);
  });

  it("has a Lich deal a Catapult's damage, a Vampire the same unanswered", () => {
    expect(on("CATAPULT", "GUARD").damageToDefender).toBe(10);
    expect(on("CATAPULT", "SWORDSMAN").damageToDefender).toBe(7);
    expect(on("CATAPULT", "CATAPULT").defenderDies).toBe(true);
    expect(on("KNIGHT", "FIGHTER")).toMatchObject({
      damageToDefender: 8,
      damageToAttacker: 0,
    });
    expect(on("KNIGHT", "MARKSMAN").damageToDefender).toBe(10);
    expect(on("KNIGHT", "CATAPULT").defenderDies).toBe(true);
  });

  it("splashes and plagues a line, and a Wail deals 2 to most units in the open", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(4, 5) },
        { seat: 0, role: "MARKSMAN", at: at(3, 4) },
        { seat: 1, role: "GUARD", at: at(3, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(3, 1) },
        { seat: 1, role: "CATAPULT", at: at(4, 1) },
      ],
    );
    const shot = previewAt(state, at(4, 5), at(4, 2));
    expect(shot.damageToDefender).toBe(7);
    expect(shot.splash.map((entry) => entry.damage)).toEqual([4, 4, 4, 4]);
    expect(shot.plagued).toHaveLength(5);
    const wail = previewWailV7(viewOf(state), unitAtV7(state, at(3, 4)).id);
    expect(
      wail?.targets.map((target) => target.damage).sort((a, b) => a - b),
    ).toEqual([1, 2, 2]);
  });

  it("stops a Human Knight on a full Zombie, which bites it", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(6, 2), hp: 10 },
      ],
    );
    expect(previewAt(state, at(5, 3), at(5, 2))).toMatchObject({
      damageToDefender: 12,
      defenderDies: false,
      damageToAttacker: 3,
      attackerBitten: true,
      overrunContinues: false,
    });
    // A Zombie that has just risen (10 HP) it kills, and rides on.
    expect(previewAt(state, at(5, 3), at(6, 2))).toMatchObject({
      defenderDies: true,
      advances: true,
    });
  });
});

describe("the Undead pass: the Normal AI's army", () => {
  it("researches Zombie, Banshee, Lich, Necromancer, Vampire", () => {
    // (The ninth unit, `pulp_wars-w49.17`, 7r55: the Wight after the
    // Necromancer.)
    expect(ARMY_RESEARCH_ROLES_V7.UNDEAD).toEqual([
      "GUARD",
      "MARKSMAN",
      "CATAPULT",
      "CAPTAIN",
      "SWORDSMAN",
      "KNIGHT",
    ]);
    // The other two orders are as the Goblin pass left them.
    expect(ARMY_RESEARCH_ROLES_V7.ORIGINAL).toEqual([
      "MARKSMAN",
      "GUARD",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
      "CAPTAIN",
    ]);
    expect(ARMY_RESEARCH_ROLES_V7.GOBLIN).toEqual([
      "MARKSMAN",
      "RAIDER",
      // Step two of the Goblin pass (`pulp_wars-w49.23`): the Ogre third.
      "SWORDSMAN",
      "GUARD",
      "CATAPULT",
      "CAPTAIN",
      "KNIGHT",
    ]);
  });

  it("fields a quarter Zombies, a quarter Skeletons, a fifth Banshees, a fifth Liches", () => {
    expect(armySharesV7("UNDEAD", false)).toEqual({
      LINE: 25,
      DEFENDER: 25,
      RANGED: 20,
      SIEGE: 20,
      BREAKTHROUGH: 10,
    });
    // Against shooters: Vampires, fewer Zombies and Banshees (a fifth
    // Zombies still: the one unit a Knight's chain stops on).
    expect(armySharesV7("UNDEAD", true)).toEqual({
      LINE: 25,
      DEFENDER: 20,
      RANGED: 15,
      SIEGE: 20,
      BREAKTHROUGH: 20,
    });
    // The army the hand-played games met: ten Zombies and three Skeletons.
    const counts: ArmyCountsV7 = {
      total: 13,
      byClass: {
        LINE: 3,
        DEFENDER: 10,
        RANGED: 0,
        SIEGE: 0,
        BREAKTHROUGH: 0,
        SKIRMISHER: 0,
        SUPPORT: 0,
      },
      hostileFragile: 0,
    };
    const order = (threatened: boolean): readonly UnitRoleIdV7[] =>
      (
        [
          "FIGHTER",
          "RAIDER",
          "MARKSMAN",
          "GUARD",
          "CAPTAIN",
          "CATAPULT",
          "KNIGHT",
        ] as const
      )
        .map(
          (role) =>
            [
              role,
              armyRoleScoreV7("UNDEAD", role, counts, threatened),
            ] as const,
        )
        .sort((left, right) => right[1] - left[1])
        .map(([role]) => role);
    // The Lich first; the Zombie last: the army has its Zombies.
    expect(order(false)[0]).toBe("CATAPULT");
    expect(order(false).at(-1)).toBe("GUARD");
    expect(order(false).indexOf("MARKSMAN")).toBeLessThan(
      order(false).indexOf("FIGHTER"),
    );
    // Onto a threatened center too: a Skeleton before an eleventh Zombie,
    // and the Necromancer (a support unit) last but for it.
    expect(order(true).slice(-2).sort()).toEqual(["CAPTAIN", "GUARD"]);
    expect(order(true).indexOf("FIGHTER")).toBeLessThan(
      order(true).indexOf("GUARD"),
    );
    // One Ghoul for five units, two at most (one in all before the pass).
    expect([
      ARMY_UNDEAD_SKIRMISHER_PER_UNITS_V7,
      ARMY_UNDEAD_SKIRMISHER_MAXIMUM_V7,
    ]).toEqual([5, 2]);
    const ghouls = (total: number, have: number): number =>
      armyRoleScoreV7(
        "UNDEAD",
        "RAIDER",
        {
          ...counts,
          total,
          byClass: { ...counts.byClass, SKIRMISHER: have },
        },
        false,
      );
    expect(ghouls(4, 0)).toBeLessThan(ghouls(5, 0));
    expect(ghouls(10, 1)).toBeGreaterThan(0);
    expect(ghouls(13, 2)).toBeLessThan(10);
    // A Human seat keeps its one Raider.
    expect(
      armyRoleScoreV7(
        "ORIGINAL",
        "RAIDER",
        { ...counts, byClass: { ...counts.byClass, SKIRMISHER: 1 } },
        false,
      ),
    ).toBeLessThan(10);
  });

  /** The capital with four orphans around it and a far Human unit. */
  const garrison = (coins: number, enemyAt: CoordV7 = at(2, 2)) =>
    field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(8, 7) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "MARKSMAN", at: at(9, 7) },
        { seat: 0, role: "FIGHTER", at: at(7, 9) },
        { seat: 0, role: "GUARD", at: at(9, 9) },
        { seat: 1, role: "FIGHTER", at: enemyAt },
      ],
      { coins, orphans: [at(7, 7), at(9, 7), at(7, 9), at(9, 9)] },
    );
  const trained = (view: PlayerViewV7): readonly CommandV7[] =>
    candidates(view).filter((command) => command.kind === "TRAIN");

  it("trains a Lich as soon as it has the Coins", () => {
    expect(trained(garrison(8).view)).toMatchObject([
      { kind: "TRAIN", role: "CATAPULT" },
    ]);
    expect(trained(garrison(30).view)).toMatchObject([
      { kind: "TRAIN", role: "CATAPULT" },
    ]);
  });

  it("keeps the Coins for the Lich when one more turn's income pays for it", () => {
    expect(ARMY_DEAR_UNIT_ARMY_V7).toBe(4);
    // 6 or 7 Coins and a level-1 capital's income: nothing is trained, so
    // that the Lich is next turn.
    expect(trained(garrison(6).view)).toEqual([]);
    expect(trained(garrison(7).view)).toEqual([]);
    // Too far from the price: the Coins go to a cheap unit as before.
    expect(trained(garrison(3).view)).toHaveLength(1);
    expect(trained(garrison(3).view)[0]).not.toMatchObject({
      role: "CATAPULT",
    });
    // An enemy two tiles from the center: the city trains a body now.
    expect(trained(garrison(6, at(8, 10)).view)).toMatchObject([
      { kind: "TRAIN", role: "GUARD" },
    ]);
  });

  it("does not keep Coins for a Human or a Goblin seat", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
      const { view } = field(
        [faction, "UNDEAD"],
        [
          { seat: 0, role: "GUARD", at: at(8, 7) },
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "MARKSMAN", at: at(9, 7) },
          { seat: 0, role: "FIGHTER", at: at(7, 9) },
          { seat: 0, role: "GUARD", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(2, 2) },
        ],
        { coins: 6, orphans: [at(7, 7), at(9, 7), at(7, 9), at(9, 9)] },
      );
      expect(trained(view), faction).toHaveLength(1);
    }
  });
});

describe("the Undead pass: the Normal AI's units", () => {
  it("bites the dearest unit in a Zombie's reach", () => {
    expect(ARMY_ZOMBIE_BITE_VALUE_V7).toBe(4);
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(2, 3) },
        { seat: 0, role: "FIGHTER", at: at(2, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 2) },
        { seat: 1, role: "KNIGHT", at: at(3, 2) },
      ],
    );
    const zombie = unitAtV7(state, at(2, 3)).id;
    const attack = (target: CoordV7): CommandV7 => ({
      kind: "ATTACK",
      unitId: zombie,
      targetUnitId: unitAtV7(state, target).id,
    });
    expect(unitCommands(view, zombie)[0]).toEqual(attack(at(3, 2)));
    const value = (target: CoordV7): number =>
      scoreCommandV7(view, attack(target)).strategicValue;
    // 4 a Coin of the target's price for the bite: a Knight 36, a
    // Swordsman 20, a Fighter 8 (and 12 as a Zombie's prey).
    expect(value(at(3, 2)) - value(at(2, 2))).toBeGreaterThanOrEqual(16);
    expect(value(at(3, 2))).toBeGreaterThan(value(at(1, 2)));
  });

  it("holds a Zombie that would walk into the enemy's reach alone", () => {
    // Two Marksmen and a Fighter three tiles north; the Zombie's own army
    // is three tiles behind it. No step toward the enemy is a candidate.
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(2, 3) },
        { seat: 0, role: "GUARD", at: at(0, 6) },
        { seat: 0, role: "GUARD", at: at(1, 6) },
        { seat: 0, role: "GUARD", at: at(2, 6) },
        { seat: 0, role: "GUARD", at: at(3, 6) },
        { seat: 0, role: "GUARD", at: at(4, 6) },
        { seat: 1, role: "MARKSMAN", at: at(1, 0) },
        { seat: 1, role: "MARKSMAN", at: at(3, 0) },
        { seat: 1, role: "FIGHTER", at: at(2, 0) },
      ],
    );
    const lone = unitAtV7(state, at(2, 3)).id;
    for (const command of unitCommands(view, lone))
      if (command.kind === "MOVE")
        expect(command.path.at(-1)?.y ?? 9).toBeGreaterThanOrEqual(3);
  });

  it("walks Zombies up together, beside each other", () => {
    // Five Zombies in a row and two Skeletons behind, two tiles from the
    // same three: a Zombie's step forward ends beside another own unit.
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(0, 3) },
        { seat: 0, role: "GUARD", at: at(1, 3) },
        { seat: 0, role: "GUARD", at: at(2, 3) },
        { seat: 0, role: "GUARD", at: at(3, 3) },
        { seat: 0, role: "GUARD", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(1, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 4) },
        { seat: 1, role: "MARKSMAN", at: at(1, 0) },
        { seat: 1, role: "MARKSMAN", at: at(3, 0) },
        { seat: 1, role: "FIGHTER", at: at(2, 1) },
      ],
    );
    const forward = candidates(view).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" &&
        (command.path.at(-1)?.y ?? 9) < 3 &&
        state.units.find((unit) => unit.id === command.unitId)?.role ===
          "GUARD",
    );
    expect(forward.length).toBeGreaterThan(0);
    for (const command of forward) {
      const end = command.path.at(-1) ?? at(-9, -9);
      expect(
        state.units.some(
          (unit) =>
            unit.id !== command.unitId &&
            unit.ownerId === seatIdV7(state, 0) &&
            Math.max(
              Math.abs(unit.at.x - end.x),
              Math.abs(unit.at.y - end.y),
            ) === 1,
        ),
      ).toBe(true);
    }
  });

  it("Wails a Banshee that has two units in its reach", () => {
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 3) },
        { seat: 0, role: "GUARD", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
      ],
    );
    const banshee = unitAtV7(state, at(2, 3)).id;
    const wail: CommandV7 = { kind: "WAIL", unitId: banshee };
    expect(scoreCommandV7(view, wail).priority).toBe(1245);
    expect(unitCommands(view, banshee)[0]).toEqual(wail);
  });

  it("steps a Banshee up behind its own line to a Wail on two or more", () => {
    // Three tiles from a line of three, a Zombie and a Skeleton in front:
    // the step to a tile two from the line has the priority of the Wail
    // it makes possible (1246), though a Swordsman reaches the tile.
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 4) },
        { seat: 0, role: "GUARD", at: at(2, 2) },
        { seat: 0, role: "FIGHTER", at: at(1, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "MARKSMAN", at: at(3, 1) },
      ],
    );
    const banshee = unitAtV7(state, at(2, 4)).id;
    const top = unitCommands(view, banshee)[0];
    if (top?.kind !== "MOVE") throw new Error("the Banshee does not move");
    expect(top.path.at(-1)?.y).toBe(3);
    expect(scoreCommandV7(view, top).priority).toBe(1246);
    const moved = applyOkV7(state, seatIdV7(state, 0), top);
    expect(unitCommands(viewOf(moved.state), banshee)[0]).toEqual({
      kind: "WAIL",
      unitId: banshee,
    });
    // Alone, with no unit of its own nearer to the enemy, it does not.
    const alone = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "MARKSMAN", at: at(3, 1) },
      ],
    );
    const lone = unitAtV7(alone.state, at(2, 4)).id;
    for (const command of unitCommands(alone.view, lone))
      if (command.kind === "MOVE")
        expect(command.path.at(-1)?.y ?? 9).toBeGreaterThanOrEqual(4);
  });

  it("fires a Lich at the middle of a cluster, not at a lone unit", () => {
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 4) },
        { seat: 0, role: "GUARD", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "MARKSMAN", at: at(3, 1) },
      ],
    );
    const lich = unitAtV7(state, at(2, 4)).id;
    const top = unitCommands(view, lich)[0];
    expect(top).toEqual({
      kind: "ATTACK",
      unitId: lich,
      targetUnitId: unitAtV7(state, at(2, 1)).id,
    });
    // The volley plagues three: it goes before an ordinary kill (1180).
    expect(previewAt(state, at(2, 4), at(2, 1)).plagued).toHaveLength(3);
    if (top === undefined) throw new Error("no Lich command");
    expect(scoreCommandV7(view, top).priority).toBeGreaterThan(1180);
  });

  it("raises the dead before anything else, and calls Frenzy before the strikes", () => {
    const pieces: readonly GoblinPieceV7[] = [
      { seat: 0, role: "CAPTAIN", at: at(2, 3) },
      { seat: 0, role: "FIGHTER", at: at(1, 2) },
      { seat: 0, role: "GUARD", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
      { seat: 1, role: "FIGHTER", at: at(3, 1) },
    ];
    const graves = field(["UNDEAD", "ORIGINAL"], pieces, {
      graves: [at(2, 2), at(1, 4)],
    });
    const necromancer = unitAtV7(graves.state, at(2, 3)).id;
    expect(candidates(graves.view)[0]).toEqual({
      kind: "RAISE_DEAD",
      unitId: necromancer,
    });
    const none = field(["UNDEAD", "ORIGINAL"], pieces);
    const frenzy: CommandV7 = {
      kind: "RALLY",
      unitId: unitAtV7(none.state, at(2, 3)).id,
    };
    const order = candidates(none.view);
    expect(order[0]).toEqual(frenzy);
    expect(order.findIndex((command) => command.kind === "ATTACK")).toBe(1);
  });

  it("flies a Vampire back after its strike", () => {
    // A Swordsman it cannot kill, two Marksmen that reach the tile it
    // strikes from, and its own Zombies three tiles back.
    const { state } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(2, 2) },
        { seat: 0, role: "GUARD", at: at(1, 5) },
        { seat: 0, role: "GUARD", at: at(3, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 1) },
        { seat: 1, role: "MARKSMAN", at: at(1, 0) },
        { seat: 1, role: "MARKSMAN", at: at(3, 0) },
      ],
    );
    const vampire = unitAtV7(state, at(2, 2)).id;
    const attacked = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: vampire,
      targetUnitId: unitAtV7(state, at(2, 1)).id,
    });
    const view = viewOf(attacked.state);
    const top = unitCommands(view, vampire)[0];
    if (top?.kind !== "MOVE") throw new Error("the Vampire does not move");
    // The escape Move of the Raider's rule (1195), away from the enemy.
    expect(scoreCommandV7(view, top).priority).toBe(1195);
    expect(top.path.at(-1)?.y ?? 0).toBeGreaterThanOrEqual(4);
  });
});

describe("the Undead pass: LAB_UNDEAD_MID", () => {
  it("stages the Undead for the hand player with every unit trainable", () => {
    const mission = missionByIdV7("LAB_UNDEAD_MID");
    if (mission === null) throw new Error("lab missing");
    expect(mission.hidden).toBe(true);
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    expect(setup.factions).toEqual(["UNDEAD", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.viewer.faction).toBe("UNDEAD");
    const count = (seat: number): Record<string, number> => {
      const owner = state.players.find((player) => player.seat === seat);
      const counts: Record<string, number> = {};
      for (const unit of state.units)
        if (unit.ownerId === owner?.id)
          counts[unit.role] = (counts[unit.role] ?? 0) + 1;
      return counts;
    };
    expect(count(0)).toEqual({
      CAPTAIN: 1,
      CATAPULT: 2,
      KNIGHT: 1,
      GUARD: 4,
      FIGHTER: 4,
      RAIDER: 2,
      MARKSMAN: 2,
    });
    // The Human side of `LAB_GOBLIN_MID`.
    expect(count(1)).toEqual({
      GUARD: 2,
      CATAPULT: 2,
      KNIGHT: 2,
      FIGHTER: 5,
      MARKSMAN: 3,
      SWORDSMAN: 3,
    });
    const worth = (seat: number, faction: FactionIdV7): number =>
      Object.entries(count(seat)).reduce(
        (total, [role, units]) =>
          total +
          units *
            (effectiveRoleRuleV7(role as UnitRoleIdV7, faction).cost ?? 0),
        0,
      );
    expect([worth(0, "UNDEAD"), worth(1, "ORIGINAL")]).toEqual([62, 80]);
    const cities = (seat: number): number[] => {
      const owner = state.players.find((player) => player.seat === seat);
      return state.cities
        .filter((city) => city.ownerId === owner?.id)
        .map((city) => city.level);
    };
    expect(cities(0)).toEqual([4, 3, 3, 2, 2]);
    expect(cities(1)).toEqual([4, 3, 3, 2, 2]);
    // 35 Coins in hand on the first turn.
    expect(view.viewer.coins).toBe(35);
    // Every Undead unit is offered in a city with a free slot.
    const offered = queryPlayerCommandsV7(view);
    expect(
      [
        ...new Set(
          offered.flatMap((command) =>
            command.kind === "TRAIN" ? [command.role] : [],
          ),
        ),
      ].sort(),
    ).toEqual([
      "CAPTAIN",
      "CATAPULT",
      "FIGHTER",
      "GUARD",
      "KNIGHT",
      "MARKSMAN",
      "RAIDER",
      // (Revision 2 of the lab, 7r55: the Wight.)
      "SWORDSMAN",
    ]);
    // Three cities train on the first turn (the capital and one front
    // city are full).
    expect(
      new Set(
        offered.flatMap((command) =>
          command.kind === "TRAIN" ? [command.cityId] : [],
        ),
      ).size,
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The correction pass after three hand-played games
// (docs/product/RULESET_7_TUNING_UNDEAD.md section 13): risen units fill no
// unit slot, Plague needs Pestilence, Raise Dead reaches two tiles, the
// Ghoul's Carrion; the Undead Normal AI's opening, economy, garrison,
// Banshees, and Zombies; the Human Normal AI against Zombies; text.
// ---------------------------------------------------------------------------

const WITHOUT_PESTILENCE = PRE_NAVAL_BRANCH_TECHS_V7.filter(
  (tech) => tech !== "EXPLOSIVES",
);

/** The technologies in the canonical order a state lists them in. */
const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

const capitalOf = (state: GameStateV7, seat = 0) => {
  const city = state.cities.find(
    (candidate) => candidate.ownerId === seatIdV7(state, seat),
  );
  if (city === undefined) throw new Error("capital missing");
  return city;
};

const attackAt = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
  applyOkV7(state, unitAtV7(state, from).ownerId, {
    kind: "ATTACK",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  });

/** `state` with the unit at `victim` Bitten by the unit at `biter`. */
const bittenBy = (
  state: GameStateV7,
  victim: CoordV7,
  biter: CoordV7,
): GameStateV7 => ({
  ...state,
  bitten: [
    {
      unitId: unitAtV7(state, victim).id,
      biterPlayerId: unitAtV7(state, biter).ownerId,
      biterUnitId: unitAtV7(state, biter).id,
    },
  ],
});

/** Seat `seat` plays its turn with the Normal policy. */
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

const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

describe("the correction: a risen unit fills no unit slot", () => {
  it("gives a Zombie's kill, an Abomination's kill, and a bitten death a rising with no home city", () => {
    for (const killer of ["GUARD", "JUGGERNAUT"] as const) {
      const state = goblinArenaV7(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: killer, at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        ],
      );
      const capital = capitalOf(state);
      // The killer is homed to the capital and fills one of its slots.
      expect(unitAtV7(state, at(5, 3)).homeCityId).toBe(capital.id);
      const before = assignedUnitCountV7(state, capital.id);
      const result = attackAt(state, at(5, 3), at(5, 2));
      const rising = unitAtV7(result.state, at(5, 2));
      expect(
        [rising.role, rising.ownerId, rising.hp, rising.homeCityId],
        killer,
      ).toEqual(["GUARD", seatIdV7(state, 0), 10, null]);
      // It took a slot of the killer's home city until this correction.
      expect(assignedUnitCountV7(result.state, capital.id)).toBe(before);
      expect(
        result.events.find((event) => event.kind === "UNIT_INFECTED"),
      ).toMatchObject({ unitId: rising.id, homeCityId: null });
      expect(parseGameStateV7(result.state)).toEqual(result.state);
      expect(
        viewOf(result.state).units.find((unit) => unit.id === rising.id)
          ?.homeCityId,
      ).toBeNull();
    }
    // A Bitten unit killed by a Skeleton rises for the biter's owner.
    const base = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ],
    );
    const state = bittenBy(base, at(5, 2), at(6, 3));
    const capital = capitalOf(state);
    const before = assignedUnitCountV7(state, capital.id);
    const result = attackAt(state, at(5, 3), at(5, 2));
    const rising = unitAtV7(result.state, at(5, 2));
    expect([rising.role, rising.ownerId, rising.homeCityId]).toEqual([
      "GUARD",
      seatIdV7(state, 0),
      null,
    ]);
    expect(assignedUnitCountV7(result.state, capital.id)).toBe(before);
    expect(
      result.events.find((event) => event.kind === "BITTEN_UNIT_RISEN"),
    ).toMatchObject({ unitId: rising.id, homeCityId: null });
  });

  it("leaves the city that trained the Zombie free to train, and its risings outlast a city", () => {
    // The capital with one free slot: the Zombie and fillers fill the rest.
    const probe = goblinArenaV7(["UNDEAD", "ORIGINAL"], []);
    const capacity =
      previewCityCapacityV7(probe, capitalOf(probe).id)?.capacity ?? 0;
    expect(capacity).toBeGreaterThanOrEqual(2);
    const fillers = Array.from({ length: capacity - 2 }, (_, index) => ({
      seat: 0,
      role: "FIGHTER" as const,
      at: at(index, 0),
    }));
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
        ...fillers,
      ],
    );
    const capital = capitalOf(state);
    expect(previewCityCapacityV7(state, capital.id)?.available).toBe(1);
    const first = attackAt(state, at(5, 3), at(5, 2));
    // One conversion filled the last slot before; now it is still free,
    // and the city trains.
    expect(previewCityCapacityV7(first.state, capital.id)).toMatchObject({
      available: 1,
      overCapacity: 0,
    });
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: capital.id,
      role: "CATAPULT",
    };
    expect(
      queryPlayerCommandsV7(first.state, seatIdV7(state, 0)),
    ).toContainEqual(train);
    const trained = applyOkV7(first.state, seatIdV7(state, 0), train);
    // A trained unit still has its home city and fills the slot.
    expect(unitAtV7(trained.state, capital.at).homeCityId).toBe(capital.id);
    expect(previewCityCapacityV7(trained.state, capital.id)?.available).toBe(0);
    // A rising Disbands like any unit (half the Zombie's price).
    const rising = unitAtV7(first.state, at(5, 2));
    const next = endTurnUntilV7(first.state, seatIdV7(state, 0)).state;
    expect(queryPlayerCommandsV7(next, seatIdV7(state, 0))).toContainEqual({
      kind: "DISBAND",
      unitId: rising.id,
    });
  });

  it("still loads a state whose rising has a home city (an older save)", () => {
    // Every arena piece is homed to its owner's capital and is not
    // capture-eligible: exactly what a rising was until this correction.
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(5, 3), hp: 10 },
        { seat: 1, role: "FIGHTER", at: at(2, 2) },
      ],
    );
    expect(unitAtV7(state, at(5, 3)).homeCityId).not.toBeNull();
    expect(parseGameStateV7(state)).toEqual(state);
    expect(PRIOR_RULESET_7_IDS).toContain("pulp-wars-poc-7r50");
  });

  it("says so on the Zombie and the Necromancer", () => {
    expect(
      recruitmentRolePresentationV7("GUARD", "UNDEAD").abilities,
    ).toContain(
      "Infect: A land unit it kills rises as your Zombie. It fills no unit slot.",
    );
    expect(
      recruitmentRolePresentationV7("CAPTAIN", "UNDEAD").abilities,
    ).toContain(
      "Raise Dead: Raises a 5 HP Skeleton from every free Grave within 2 tiles. They fill no unit slot.",
    );
  });
});

describe("the correction: Plague needs Pestilence", () => {
  /** A Lich's volley on the middle of a line of five. */
  const volley = (techs: readonly TechnologyIdV7[]) =>
    goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(4, 5) },
        { seat: 1, role: "GUARD", at: at(3, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(3, 1) },
        { seat: 1, role: "CATAPULT", at: at(4, 1) },
      ],
      { techs: { 0: techs } },
    );

  it("is the Undead Explosives: a capability of the tree, under its own name", () => {
    expect(
      factionTreeV7("UNDEAD").nodes.find((node) => node.id === "EXPLOSIVES")
        ?.unlocks,
    ).toEqual([
      { kind: "COMMAND", command: "BLAST_MOUNTAIN" },
      { kind: "MELEE_FIELD_DEMOLITION" },
      { kind: "PESTILENCE" },
    ]);
    expect(technologyNameV7("EXPLOSIVES", "UNDEAD")).toBe("Pestilence");
    expect(technologyNameV7("EXPLOSIVES", "ORIGINAL")).toBe("Explosives");
    expect(
      technologyCapabilitiesV7(PRE_NAVAL_BRANCH_TECHS_V7, "UNDEAD").plague,
    ).toBe(true);
    expect(technologyCapabilitiesV7(WITHOUT_PESTILENCE, "UNDEAD").plague).toBe(
      false,
    );
    // No other tree has it, whatever it has researched.
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ] as const)
      expect(
        technologyCapabilitiesV7(PRE_NAVAL_BRANCH_TECHS_V7, faction).plague,
        faction,
      ).toBe(false);
    // The Lich is trained with Sawmilling as before; Pestilence is two
    // technologies of another branch.
    expect(effectiveRoleRuleV7("CATAPULT", "UNDEAD").technology).toBe(
      "SAWMILLING",
    );
    expect(PESTILENCE_UNLOCK_TEXT_V7).toBe("Liches plague the units they hit");
    expect(PLAGUE_NEEDS_TEXT_V7).toBe("Plague needs Pestilence");
    expect(
      recruitmentRolePresentationV7("CATAPULT", "UNDEAD").abilities.find(
        (line) => line.startsWith("Plague"),
      ),
    ).toMatch(/^Plague: With Pestilence: living units its attacks hit/);
  });

  it("leaves the shot and the splash as they were, and plagues only with it", () => {
    const withIt = volley(PRE_NAVAL_BRANCH_TECHS_V7);
    const without = volley(WITHOUT_PESTILENCE);
    const full = previewAt(withIt, at(4, 5), at(4, 2));
    const bare = previewAt(without, at(4, 5), at(4, 2));
    // The same 7 on the target and 4 on each of its four neighbours: 23.
    for (const shot of [full, bare]) {
      expect(shot.damageToDefender).toBe(7);
      expect(shot.splash.map((entry) => entry.damage)).toEqual([4, 4, 4, 4]);
    }
    // With Pestilence five units are plagued (2 a turn each for 3 turns:
    // up to 30 more); without it none.
    expect(full.plagued).toHaveLength(5);
    expect(bare.plagued).toEqual([]);
    expect(attackAt(withIt, at(4, 5), at(4, 2)).state.plagued).toHaveLength(5);
    const fired = attackAt(without, at(4, 5), at(4, 2));
    expect(fired.state.plagued).toEqual([]);
    expect(
      fired.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { damageToDefender: 7, plagued: [] } });
  });

  it("has the Undead Normal AI research it once it fields two Liches", () => {
    expect(ARMY_PESTILENCE_LICHES_V7).toBe(2);
    // Every unit of the order but the Vampire is unlocked.
    const techs = techsOf(
      "GATHERING",
      "DRILL",
      // (The Industry reshuffle, 7r56: the Zombie is at Fortification.)
      "FORTIFICATION",
      "HUNTING",
      "MARKSMANSHIP",
      "FORESTRY",
      "SAWMILLING",
      "ADMINISTRATION",
      // (The ninth unit, 7r55: the Wight's chain.)
      "ENGINEERING",
      "METALLURGY",
    );
    const seat = (liches: number) =>
      field(
        ["UNDEAD", "ORIGINAL"],
        [
          ...Array.from({ length: liches }, (_, index) => ({
            seat: 0,
            role: "CATAPULT" as const,
            at: at(7 + index, 7),
          })),
          { seat: 0, role: "GUARD", at: at(8, 9) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { techs: { 0: techs } },
      ).view;
    // Explosives (Pestilence); its Fortification came with the Zombie.
    expect(inspectNormalArmyV7(seat(2)).research?.tech).toBe("EXPLOSIVES");
    // With one Lich the Vampire's chain comes first, as before.
    expect(inspectNormalArmyV7(seat(1)).research?.tech).toBe("SCOUTING");
  });
});

describe("the correction: Raise Dead reaches two tiles", () => {
  it("raises a Grave two tiles away, not three, and not one on an unexplored tile", () => {
    expect(RAISE_DEAD_RADIUS_V7).toBe(2);
    const { state } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3) },
        { seat: 0, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { graves: [at(4, 1), at(6, 3), at(7, 3), at(2, 5), at(4, 2)] },
    );
    const necromancer = unitAtV7(state, at(4, 3)).id;
    // Behind its Zombie it reaches the Grave in front of the Zombie; the
    // Grave under the Zombie and the one three tiles away stay.
    expect(previewRaiseDeadV7(viewOf(state), necromancer)?.graves).toEqual([
      at(4, 1),
      at(6, 3),
      at(2, 5),
    ]);
    const raised = applyOkV7(state, seatIdV7(state, 0), {
      kind: "RAISE_DEAD",
      unitId: necromancer,
    });
    expect(raised.state.graves).toEqual([at(4, 2), at(7, 3)]);
    for (const where of [at(4, 1), at(6, 3), at(2, 5)])
      expect(unitAtV7(raised.state, where)).toMatchObject({
        role: "FIGHTER",
        hp: 5,
        homeCityId: null,
      });
    // A Grave on a tile its owner has not explored is not raised, and the
    // preview does not list it: the two agree.
    const actor = seatIdV7(state, 0);
    const fogged: GameStateV7 = {
      ...state,
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !same(where, at(6, 3)),
              ),
            }
          : player,
      ),
    };
    expect(previewRaiseDeadV7(viewOf(fogged), necromancer)?.graves).toEqual([
      at(4, 1),
      at(2, 5),
    ]);
    const partly = applyOkV7(fogged, actor, {
      kind: "RAISE_DEAD",
      unitId: necromancer,
    });
    expect(partly.state.graves).toEqual([at(4, 2), at(6, 3), at(7, 3)]);
  });
});

describe("the correction: the Ghoul's Carrion", () => {
  /** An Undead `attacker` at (6, 2) on a Human Fighter at (5, 2). */
  const strike = (
    attacker: UnitRoleIdV7,
    marks: { readonly bitten?: boolean; readonly plagued?: boolean } = {},
    activation: GoblinPieceV7["activation"] = {},
  ) => {
    const base = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: attacker, at: at(6, 2), activation },
        { seat: 0, role: "GUARD", at: at(9, 2) },
        { seat: 0, role: "CATAPULT", at: at(9, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
    );
    const fighter = unitAtV7(base, at(5, 2)).id;
    const state: GameStateV7 = {
      ...(marks.bitten === true ? bittenBy(base, at(5, 2), at(9, 2)) : base),
      plagued:
        marks.plagued === true
          ? [
              {
                unitId: fighter,
                sourceUnitId: unitAtV7(base, at(9, 4)).id,
                turnsRemaining: 3,
              },
            ]
          : [],
    };
    return { state, preview: previewAt(state, at(6, 2), at(5, 2)) };
  };

  it("adds 1 Attack to a Ghoul's attack on a Bitten or Plagued unit", () => {
    expect(GHOUL_CARRION_BONUS2_V7).toBe(2);
    // A plain strike: Attack 2, 5 damage (as a Skeleton and a Zombie).
    const plain = strike("RAIDER").preview;
    expect([plain.attack2, plain.damageToDefender]).toEqual([4, 5]);
    // On a Bitten unit: Attack 3 and 8 damage (a charging Ghoul's), and
    // the same on a Plagued one; the two marks do not add up.
    const bitten = strike("RAIDER", { bitten: true }).preview;
    expect([bitten.attack2, bitten.damageToDefender]).toEqual([6, 8]);
    expect(strike("RAIDER", { plagued: true }).preview.attack2).toBe(6);
    expect(
      strike("RAIDER", { bitten: true, plagued: true }).preview.attack2,
    ).toBe(6);
    // With its Charge (a move of two tiles): Attack 4, and the Fighter
    // dies (a charging Ghoul alone deals 8).
    const charge = strike(
      "RAIDER",
      { bitten: true },
      { moved: true, movedPathLength: 2 },
    ).preview;
    expect([charge.attack2, charge.defenderDies]).toEqual([8, true]);
    // A Skeleton, a Zombie, and a Vampire have no such bonus.
    for (const role of ["FIGHTER", "GUARD", "KNIGHT"] as const)
      expect(strike(role, { bitten: true }).preview.attack2, role).toBe(
        effectiveRoleRuleV7(role, "UNDEAD").attack2,
      );
  });

  it("resolves as previewed, and the Bitten unit it kills rises", () => {
    const { state, preview } = strike(
      "RAIDER",
      { bitten: true },
      { moved: true, movedPathLength: 2 },
    );
    const result = attackAt(state, at(6, 2), at(5, 2));
    expect(
      result.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview });
    // Killed by the Ghoul, it rises for the Zombie that bit it.
    expect(preview.defenderBittenRises).toBe(true);
    expect(unitAtV7(result.state, at(5, 2))).toMatchObject({
      role: "GUARD",
      ownerId: seatIdV7(state, 0),
      homeCityId: null,
    });
  });

  it("is the Ghoul's rule alone, and its card says so", () => {
    const withRule: string[] = [];
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ] as const)
      for (const role of [...ROSTER, "SWORDSMAN"] as const)
        if (roleMechanicsV7(role, faction).carrionBonus2 > 0)
          withRule.push(`${faction} ${role}`);
    expect(withRule).toEqual(["UNDEAD RAIDER"]);
    expect(carrionTextV7(GHOUL_CARRION_BONUS2_V7)).toBe(
      "Carrion: +1 Attack against a Bitten or Plagued unit",
    );
    expect(
      recruitmentRolePresentationV7("RAIDER", "UNDEAD").restrictions,
    ).toContain("Carrion: +1 Attack against a Bitten or Plagued unit.");
    expect(
      recruitmentRolePresentationV7("RAIDER", "ORIGINAL").restrictions.join(
        " ",
      ),
    ).not.toMatch(/Carrion/);
  });
});

describe("the correction: the Undead Normal AI's opening", () => {
  // The arena's three villages are free and within three tiles of the
  // capital (8, 8); its land is the eight tiles around it.
  it("walks into no enemy's reach outside its land while a free village is in reach", () => {
    expect(ARMY_VILLAGES_FIRST_ROUNDS_V7).toBe(10);
    // Four Skeletons at the capital. A Human Fighter stands west of the
    // village (5, 5), three tiles from the capital's land; the villages
    // (8, 5) and (5, 8) have no enemy near.
    const enemy = at(4, 5);
    const inReach = (faction: FactionIdV7, round: number): number => {
      const { state } = field(
        [faction, faction === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "FIGHTER", at: at(8, 7) },
          { seat: 0, role: "FIGHTER", at: at(7, 8) },
          { seat: 0, role: "FIGHTER", at: at(7, 9) },
          { seat: 1, role: "FIGHTER", at: enemy },
        ],
        { coins: 0 },
      );
      const turn = policyTurn({ ...state, round });
      const own = seatIdV7(state, 0);
      return turn.state.units.filter(
        (unit) => unit.ownerId === own && gap(unit.at, enemy) <= 2,
      ).length;
    };
    // In the opening no Skeleton ends where the Fighter reaches it.
    expect(inReach("UNDEAD", 1)).toBe(0);
    // After round 10 the old rules decide: one steps out toward it.
    expect(inReach("UNDEAD", ARMY_VILLAGES_FIRST_ROUNDS_V7 + 1)).toBe(1);
  });

  it("makes no attack after a Move on a unit outside its land that it does not kill", () => {
    // The Skeleton has walked up to a Fighter it found beside the village.
    const walked = (hp: number, moved: boolean, round = 1) => {
      const { state } = field(
        ["UNDEAD", "ORIGINAL"],
        [
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 6),
            activation: moved ? { moved: true, movedPathLength: 1 } : {},
          },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(4, 6), hp },
        ],
      );
      const next = { ...state, round };
      return unitCommands(viewOf(next), unitAtV7(next, at(5, 6)).id).some(
        (command) => command.kind === "ATTACK",
      );
    };
    // (The village (8, 5) is free and no enemy is near it.)
    expect(walked(12, true)).toBe(false);
    // A kill is taken, a unit that has not moved strikes what stands
    // beside it, and after round 10 the exchange is on again.
    expect(walked(1, true)).toBe(true);
    expect(walked(12, false)).toBe(true);
    expect(walked(12, true, ARMY_VILLAGES_FIRST_ROUNDS_V7 + 1)).toBe(true);
  });

  it("sends its first units to the free villages, not at the enemy unit in sight", () => {
    const { state } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 0, role: "FIGHTER", at: at(7, 8) },
        { seat: 1, role: "FIGHTER", at: at(4, 5) },
      ],
      { coins: 0 },
    );
    const own = seatIdV7(state, 0);
    const turn = policyTurn(state);
    expect(turn.commands.some((command) => command.kind === "ATTACK")).toBe(
      false,
    );
    const after = turn.state.units.filter((unit) => unit.ownerId === own);
    // One Skeleton went toward (8, 5), one toward (5, 8); none stands in
    // the Fighter's reach.
    for (const village of [at(8, 5), at(5, 8)])
      expect(
        Math.min(...after.map((unit) => gap(unit.at, village))),
        `${village.x},${village.y}`,
      ).toBeLessThanOrEqual(1);
    for (const unit of after) expect(gap(unit.at, at(4, 5))).toBeGreaterThan(2);
  });
});

describe("the correction: the Undead Normal AI's economy", () => {
  /** The capital alone, a Skeleton on it, with `resource` tiles in its land. */
  const land = (
    faction: FactionIdV7,
    techs: readonly TechnologyIdV7[],
    kind: "FOREST" | "FERTILE" | "BOTH",
    coins = 3,
    enemyAt: CoordV7 = at(2, 8),
  ): PlayerViewV7 => {
    const { state } = field(
      [faction, faction === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        { seat: 1, role: "FIGHTER", at: enemyAt },
      ],
      { techs: { 0: techs }, coins, orphans: [at(9, 9)] },
    );
    const patched: GameStateV7 = {
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, at(7, 7)) || same(tile.at, at(9, 7))
            ? kind !== "FERTILE"
              ? {
                  ...tile,
                  biome: "WOODLAND" as const,
                  terrain: "FOREST" as const,
                }
              : { ...tile, resource: "FERTILE_GROUND" as const }
            : kind === "BOTH" && same(tile.at, at(7, 9))
              ? { ...tile, resource: "FERTILE_GROUND" as const }
              : tile,
        ),
      },
    };
    return viewOf(patched);
  };

  it("researches the growth its land can use before its second unit", () => {
    // The Zombie is unlocked, the Banshee is not, and it owns no technology
    // that builds population. Its land has two Forests: Forestry, by way
    // of Hunting.
    expect(
      inspectNormalArmyV7(
        land("UNDEAD", ["GATHERING", "DRILL", "FORTIFICATION"], "FOREST"),
      ).research,
    ).toMatchObject({ tech: "HUNTING", growth: true, due: true });
    expect(
      inspectNormalArmyV7(
        land(
          "UNDEAD",
          techsOf("GATHERING", "DRILL", "FORTIFICATION", "HUNTING"),
          "FOREST",
        ),
      ).research,
    ).toMatchObject({ tech: "FORESTRY", growth: true, due: true });
    // Fertile ground: Farming.
    expect(
      inspectNormalArmyV7(
        land("UNDEAD", ["GATHERING", "DRILL", "FORTIFICATION"], "FERTILE"),
      ).research,
    ).toMatchObject({ tech: "FARMING", growth: true, due: true });
    // Two Forests and one fertile tile: the Forests, which count
    // threefold (Forestry is also the first step to the Lich). By
    // population per Coin of research alone the Farm (2 for one
    // technology) is ahead of the two Lumber Camps (2 for two).
    expect(ARMY_ECONOMY_FORESTRY_WEIGHT_V7).toBe(3);
    expect(
      inspectNormalArmyV7(
        land("UNDEAD", ["GATHERING", "DRILL", "FORTIFICATION"], "BOTH"),
      ).research,
    ).toMatchObject({ tech: "HUNTING", growth: true });
    // Its first unit comes before that.
    expect(
      inspectNormalArmyV7(land("UNDEAD", ["GATHERING"], "FOREST")).research,
    ).toMatchObject({ tech: "DRILL", growth: false });
    // (The Industry reshuffle, 7r56: the Zombie is at Fortification, one
    // technology behind the root, and still comes before the growth.)
    expect(
      inspectNormalArmyV7(land("UNDEAD", ["GATHERING", "DRILL"], "FOREST"))
        .research,
    ).toMatchObject({ tech: "FORTIFICATION", growth: false, unlocks: "GUARD" });
    // With the growth technology owned it goes on to the Banshee, and then
    // to the Lich.
    expect(
      inspectNormalArmyV7(
        land(
          "UNDEAD",
          techsOf("GATHERING", "DRILL", "FORTIFICATION", "HUNTING", "FORESTRY"),
          "FOREST",
        ),
      ).research,
    ).toMatchObject({ tech: "MARKSMANSHIP", growth: false });
    expect(
      inspectNormalArmyV7(
        land(
          "UNDEAD",
          techsOf(
            "GATHERING",
            "DRILL",
            "FORTIFICATION",
            "FORESTRY",
            "HUNTING",
            "MARKSMANSHIP",
          ),
          "FOREST",
        ),
      ).research,
    ).toMatchObject({ tech: "SAWMILLING", unlocks: "CATAPULT" });
    // A Human seat with its first unit kept its own order; since the
    // Martian pass's correction (`pulp_wars-w49.14`) it takes its economy
    // technology too. A Goblin seat still keeps its order.
    expect(
      inspectNormalArmyV7(
        land(
          "ORIGINAL",
          techsOf("GATHERING", "HUNTING", "MARKSMANSHIP"),
          "FOREST",
        ),
      ).research?.growth,
    ).toBe(true);
    expect(
      inspectNormalArmyV7(
        land(
          "GOBLIN",
          techsOf("GATHERING", "HUNTING", "MARKSMANSHIP"),
          "FOREST",
        ),
      ).research?.growth,
    ).toBe(false);
  });

  it("buys that technology before a unit, unless an enemy is at the gates", () => {
    const first = (view: PlayerViewV7): CommandV7 | undefined =>
      candidates(view).find(
        (command) => command.kind === "RESEARCH" || command.kind === "TRAIN",
      );
    const cost = inspectNormalArmyV7(
      land("UNDEAD", ["GATHERING", "DRILL", "FORTIFICATION"], "FERTILE"),
    ).research?.cost;
    if (cost === undefined) throw new Error("no research target");
    // With the Coins for it and for a unit, the technology goes first (the
    // seat still expands: its first units take the villages).
    expect(
      first(
        land(
          "UNDEAD",
          ["GATHERING", "DRILL", "FORTIFICATION"],
          "FERTILE",
          cost,
        ),
      ),
    ).toEqual({ kind: "RESEARCH", tech: "FARMING" });
    // With a Human Knight two tiles from the capital it trains.
    expect(
      first(
        land(
          "UNDEAD",
          ["GATHERING", "DRILL", "FORTIFICATION"],
          "FERTILE",
          cost,
          at(6, 8),
        ),
      )?.kind,
    ).toBe("TRAIN");
  });
});

describe("the correction: the Undead Normal AI's garrison", () => {
  it("takes a Banshee off a threatened center for the Zombie beside it", () => {
    expect(ARMY_SWAP_PRIORITY_V7).toBe(1251);
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(8, 8) },
        { seat: 0, role: "GUARD", at: at(9, 9), hp: 13 },
        { seat: 0, role: "FIGHTER", at: at(9, 8) },
        { seat: 1, role: "KNIGHT", at: at(5, 8) },
        { seat: 1, role: "MARKSMAN", at: at(4, 8) },
      ],
      { coins: 0 },
    );
    const banshee = unitAtV7(state, at(8, 8)).id;
    const zombie = unitAtV7(state, at(9, 9)).id;
    const first = candidates(view)[0];
    if (first?.kind !== "MOVE" || first.unitId !== banshee)
      throw new Error("the Banshee does not step off");
    expect(scoreCommandV7(view, first).priority).toBe(ARMY_SWAP_PRIORITY_V7);
    expect(gap(first.path.at(-1) ?? at(0, 0), at(8, 8))).toBe(1);
    const stepped = applyOkV7(state, seatIdV7(state, 0), first);
    // The Zombie takes the center (not the Skeleton, whose Bones counts
    // only against shots).
    expect(candidates(viewOf(stepped.state))[0]).toEqual({
      kind: "MOVE",
      unitId: zombie,
      path: [at(8, 8)],
    });
    // With no better garrison beside the center the Banshee stays.
    const alone = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(8, 8) },
        { seat: 0, role: "MARKSMAN", at: at(9, 9) },
        { seat: 1, role: "KNIGHT", at: at(5, 8) },
      ],
      { coins: 0 },
    );
    expect(
      unitCommands(alone.view, unitAtV7(alone.state, at(8, 8)).id).some(
        (command) => command.kind === "MOVE",
      ),
    ).toBe(false);
  });

  it("trains no Banshee onto a contested center while it can pay for a Zombie", () => {
    const trainable = (coins: number) => {
      const { view } = field(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "KNIGHT", at: at(6, 8) },
        ],
        { coins, orphans: [at(9, 9)] },
      );
      return candidates(view).flatMap((command) =>
        command.kind === "TRAIN" ? [command.role] : [],
      );
    };
    const roles = trainable(20);
    expect(roles.length).toBeGreaterThan(0);
    expect(roles).not.toContain("MARKSMAN");
    expect(roles).not.toContain("CATAPULT");
  });

  it("takes Walls for a threatened city at level 3", () => {
    const offered = (faction: FactionIdV7) => {
      const { state } = field(
        [faction, faction === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
        [
          { seat: 0, role: "GUARD", at: at(8, 8) },
          { seat: 1, role: "KNIGHT", at: at(6, 8) },
          { seat: 1, role: "FIGHTER", at: at(6, 7) },
        ],
      );
      const capital = capitalOf(state);
      const pending: GameStateV7 = {
        ...state,
        cities: state.cities.map((city) =>
          city.id === capital.id
            ? {
                ...city,
                level: 3,
                rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
              }
            : city,
        ),
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: capital.id,
            reachedLevel: 3,
            candidates: ["WALLS", "MILITIA"],
          },
        ],
      };
      return candidates(viewOf(pending)).find(
        (command) => command.kind === "CHOOSE_CITY_REWARD",
      );
    };
    expect(offered("UNDEAD")).toMatchObject({ reward: "WALLS" });
    // A Human seat takes the Militia unit there, as before.
    expect(offered("ORIGINAL")).toMatchObject({ reward: "MILITIA" });
  });
});

describe("the correction: the Undead Normal AI's Banshees and Zombies", () => {
  it("walks a Banshee up to a fight four tiles away", () => {
    expect(ARMY_BANSHEE_APPROACH_RADIUS_V7).toBe(6);
    const { state, view } = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(6, 2) },
        { seat: 0, role: "GUARD", at: at(3, 2) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(1, 3) },
        { seat: 1, role: "KNIGHT", at: at(0, 2) },
        { seat: 1, role: "MARKSMAN", at: at(0, 3) },
        { seat: 1, role: "GUARD", at: at(1, 4) },
      ],
    );
    const banshee = unitAtV7(state, at(6, 2)).id;
    // The enemy is the stronger: the seat's units near it do not commit,
    // and the Banshee belongs to no assault.
    expect(
      inspectNormalArmyV7(view).modes.filter((entry) => entry.mode !== "NONE"),
    ).toEqual([]);
    const top = unitCommands(view, banshee)[0];
    if (top?.kind !== "MOVE") throw new Error("the Banshee does not move");
    expect(top.path.at(-1)?.x).toBe(5);
    expect(scoreCommandV7(view, top).priority).toBeGreaterThanOrEqual(
      ARMY_BANSHEE_APPROACH_PRIORITY_V7,
    );
    // With the enemy eight tiles away it has no such Move.
    const far = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(9, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 2) },
      ],
    );
    const idle = unitAtV7(far.state, at(9, 2)).id;
    for (const command of unitCommands(far.view, idle))
      if (command.kind === "MOVE")
        expect(scoreCommandV7(far.view, command).priority).toBeLessThan(
          ARMY_BANSHEE_APPROACH_PRIORITY_V7,
        );
  });

  it("holds a Zombie that would step out alone, in its own land too", () => {
    // As in the hand-played game: a Banshee on the capital's center, the
    // Zombie beside it in its own land, and three Human units outside. The
    // tile (7, 7) is in the capital's land and beside the Fighter (6, 6).
    const enemies = [at(6, 6), at(5, 6), at(5, 5)];
    const stepsUp = (company: boolean): boolean => {
      const { state, view } = field(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "GUARD", at: at(7, 8) },
          { seat: 0, role: "MARKSMAN", at: at(8, 8) },
          ...(company
            ? [{ seat: 0, role: "FIGHTER" as const, at: at(8, 7) }]
            : []),
          { seat: 1, role: "FIGHTER", at: at(6, 6) },
          { seat: 1, role: "MARKSMAN", at: at(5, 6) },
          { seat: 1, role: "FIGHTER", at: at(5, 5) },
        ],
        { coins: 0 },
      );
      const zombie = unitAtV7(state, at(7, 8)).id;
      return unitCommands(view, zombie).some(
        (command) =>
          command.kind === "MOVE" &&
          enemies.some(
            (enemy) => gap(command.path.at(-1) ?? at(0, 0), enemy) === 1,
          ),
      );
    };
    // Alone (the Banshee on the center is no company) it does not step
    // beside an enemy unit; with a Skeleton beside that tile it may.
    expect(stepsUp(false)).toBe(false);
    expect(stepsUp(true)).toBe(true);
  });
});

describe("the correction: the Human Normal AI against Zombies", () => {
  it("shoots a full Zombie before it strikes it hand to hand", () => {
    const pieces = (shooter: boolean): readonly GoblinPieceV7[] => [
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      ...(shooter
        ? [{ seat: 0, role: "MARKSMAN" as const, at: at(5, 4) }]
        : []),
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ];
    const { state, view } = field(["ORIGINAL", "UNDEAD"], pieces(true));
    const knight = unitAtV7(state, at(5, 3)).id;
    const marksman = unitAtV7(state, at(5, 4)).id;
    const zombie = unitAtV7(state, at(5, 2)).id;
    const strikes = (seen: PlayerViewV7, unit: number): boolean =>
      candidates(seen).some(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === unit &&
          command.targetUnitId === zombie,
      );
    // The Knight's hit (12 of 18, bitten, the chain ends) waits for the
    // shot.
    expect(strikes(view, knight)).toBe(false);
    expect(strikes(view, marksman)).toBe(true);
    const shot = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: marksman,
      targetUnitId: zombie,
    });
    // The Zombie is no longer at full HP: the rule is over, and the
    // Knight strikes (as it does at once where no shooter stands by).
    expect(unitAtV7(shot.state, at(5, 2)).hp).toBeLessThan(18);
    expect(strikes(viewOf(shot.state), knight)).toBe(true);
    const lone = field(["ORIGINAL", "UNDEAD"], pieces(false));
    expect(
      candidates(lone.view).some(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === unitAtV7(lone.state, at(5, 3)).id,
      ),
    ).toBe(true);
  });

  it("researches and trains the Captain when it has a Bitten unit", () => {
    expect(ARMY_CURE_TRAINING_VALUE_V7).toBe(400);
    const seat = (
      techs: readonly TechnologyIdV7[],
      bitten: boolean,
      captain = false,
    ) => {
      const { state } = field(
        ["ORIGINAL", "UNDEAD"],
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "MARKSMAN", at: at(9, 7) },
          ...(captain
            ? [{ seat: 0, role: "CAPTAIN" as const, at: at(9, 9) }]
            : []),
          { seat: 1, role: "GUARD", at: at(2, 8) },
        ],
        {
          techs: { 0: techs },
          coins: 20,
          orphans: [at(7, 7), at(9, 7), at(9, 9)],
        },
      );
      return viewOf(bitten ? bittenBy(state, at(7, 7), at(2, 8)) : state);
    };
    const early = techsOf("GATHERING", "HUNTING", "MARKSMANSHIP");
    // Without a bite the Human order goes on to the Guard (Drill); with
    // one the Captain's technology is next.
    expect(inspectNormalArmyV7(seat(early, false)).research?.tech).toBe(
      "DRILL",
    );
    expect(inspectNormalArmyV7(seat(early, true)).research).toMatchObject({
      tech: "ADMINISTRATION",
      unlocks: "CAPTAIN",
    });
    // It is bought before a unit as soon as the Coins are there.
    expect(
      candidates(seat(early, true)).find(
        (command) => command.kind === "RESEARCH" || command.kind === "TRAIN",
      ),
    ).toEqual({ kind: "RESEARCH", tech: "ADMINISTRATION" });
    const trains = (view: PlayerViewV7) =>
      candidates(view).flatMap((command) =>
        command.kind === "TRAIN" ? [command.role] : [],
      )[0];
    const withCure = techsOf(...early, "ADMINISTRATION");
    expect(trains(seat(withCure, true))).toBe("CAPTAIN");
    expect(trains(seat(withCure, false))).not.toBe("CAPTAIN");
    // With a Captain on the board the rule is over.
    expect(trains(seat(withCure, true, true))).not.toBe("CAPTAIN");
  });
});

describe("the correction: text and events", () => {
  it("shows a Captain's cure to the player whose bite it removed", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 6 },
        { seat: 0, role: "FIGHTER", at: at(6, 4), hp: 6 },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    const state = bittenBy(base, at(5, 3), at(5, 2));
    const human = seatIdV7(state, 0);
    const undead = seatIdV7(state, 1);
    const captain = unitAtV7(state, at(5, 4)).id;
    const result = applyOkV7(state, human, {
      kind: "TEND_WOUNDED",
      unitId: captain,
    });
    expect(result.state.bitten).toEqual([]);
    const events = (viewer: number) =>
      projectEventsV7(
        state,
        result.state,
        viewer as typeof human,
        result.events,
      ).events;
    const tended = result.events.find(
      (event) => event.kind === "WOUNDED_TENDED",
    );
    if (tended?.kind !== "WOUNDED_TENDED") throw new Error("no Tend");
    expect(tended.results).toHaveLength(2);
    // The Captain's owner reads the whole Tend; the Undead player reads
    // the cure of the unit it had bitten, and nothing of the other unit.
    expect(events(human)).toContainEqual(tended);
    const seen = events(undead).find(
      (event) => event.kind === "WOUNDED_TENDED",
    );
    expect(seen).toEqual({
      ...tended,
      results: tended.results.filter((entry) => entry.curedBitten),
    });
    // A Tend that cures nothing stays its owner's.
    const plain = applyOkV7(base, human, {
      kind: "TEND_WOUNDED",
      unitId: captain,
    });
    expect(
      projectEventsV7(base, plain.state, undead, plain.events).events.some(
        (event) => event.kind === "WOUNDED_TENDED",
      ),
    ).toBe(false);
  });

  it("explains why a Guard strikes back harder than it strikes", () => {
    expect(strikesBackTextV7(6)).toBe(
      "strikes back with its Defense 3, not its Attack",
    );
    // The numbers behind it: a Guard attacking a Skeleton deals 3;
    // attacked by the Skeleton it strikes back for 8.
    const attack = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
    );
    expect(previewAt(attack, at(5, 3), at(5, 2)).damageToDefender).toBe(3);
    const defence = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    expect(previewAt(defence, at(5, 3), at(5, 2)).damageToAttacker).toBe(8);
  });
});

// The Undead hand pass at 7r55 (`pulp_wars-w49.20`, section 14 of
// docs/product/RULESET_7_TUNING_UNDEAD.md): no rule and no number changed.
// One correction to the Undead Normal AI.
describe("the hand pass at 7r55: the Undead Normal AI at an emptied center", () => {
  /**
   * The hand-played game, round 18: the Human capital (2, 8) with an empty
   * center, two Marksmen two tiles behind it and a Fighter two tiles away,
   * and a Zombie and a wounded Skeleton of seat 0 beside the center.
   */
  const emptied = (
    faction: FactionIdV7,
    zombieHp: number,
    marksmen: 0 | 1 | 2,
  ): GameStateV7 => ({
    ...field(
      [faction, "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(3, 9), hp: zombieHp },
        { seat: 0, role: "FIGHTER", at: at(3, 7), hp: 6 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        ...[at(0, 7), at(0, 9)]
          .slice(0, marksmen)
          .map((where) => ({ seat: 1, role: "MARKSMAN" as const, at: where })),
        { seat: 1, role: "FIGHTER", at: at(1, 6) },
      ],
      { coins: 0 },
    ).state,
    // (After the opening: the villages-first rule of the correction holds
    // an Undead seat's units back through round 10.)
    round: ARMY_VILLAGES_FIRST_ROUNDS_V7 + 2,
  });
  /** The policy offers the unit at `from` the step onto the center. */
  const offered = (state: GameStateV7, from: CoordV7): boolean =>
    unitCommands(viewOf(state), unitAtV7(state, from).id).some(
      (command) =>
        command.kind === "MOVE" && same(command.path.at(-1) ?? from, at(2, 8)),
    );

  it("steps no unit onto it that the Marksmen and the Fighter in sight kill there", () => {
    // A Zombie with 10 HP takes 6 from each Marksman and 5 from the
    // Fighter; the Skeleton with 6 HP 4 from each through Bones. One
    // Marksman and the Fighter are enough.
    for (const marksmen of [1, 2] as const) {
      const state = emptied("UNDEAD", 10, marksmen);
      expect(offered(state, at(3, 9))).toBe(false);
      expect(offered(state, at(3, 7))).toBe(false);
    }
  });

  it("still steps a Zombie onto it that lives through the enemy's turn", () => {
    // 17 damage in sight against 18 HP: the full Zombie goes, the wounded
    // Skeleton beside it does not.
    const full = emptied("UNDEAD", 18, 2);
    expect(offered(full, at(3, 9))).toBe(true);
    expect(offered(full, at(3, 7))).toBe(false);
    // With no shooter in sight the old rule holds: both may go, though the
    // Fighter alone would kill the Skeleton there.
    const unshot = emptied("UNDEAD", 10, 0);
    expect(offered(unshot, at(3, 9))).toBe(true);
    expect(offered(unshot, at(3, 7))).toBe(true);
  });

  it("is an Undead seat's rule: a Goblin seat storms as before", () => {
    const state = emptied("GOBLIN", 10, 2);
    expect(offered(state, at(3, 9))).toBe(true);
    expect(offered(state, at(3, 7))).toBe(true);
  });
});
