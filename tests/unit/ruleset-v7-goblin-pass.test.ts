import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  ARMY_GANG_UP_STRENGTH_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_WAR_RESEARCH_ROUNDS_V7,
  armyAssaultModeV7,
  armyRoleScoreV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import { gangUpForPolicyV7, hypotheticalBlastV7 } from "../../src/ai/v7-goblin";
import {
  PRIOR_RULESET_7_IDS,
  SURVEY_RAIDERS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  kaboomReadyV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseGameStateV7,
  technologyCapabilitiesV7,
  previewKaboomV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  BLAST_PROOF_DESCRIPTION_V7,
  CRASH_DESCRIPTION_V7,
  GOBLIN_HELP_RULES_V7,
  NO_GANG_UP_DESCRIPTION_V7,
  goblinRecruitNotesV7,
} from "../../src/render/goblin-presentation-v7";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// The Goblin pass (`pulp_wars-w49.12`, `pulp-wars-poc-7r50`,
// docs/product/RULESET_7_TUNING_GOBLIN.md): a Bomb Chucker's bomb gets no
// Gang Up, the Orc Brute is Blast-proof, a Scrap Buggy may Kaboom after
// attacking (Crash); the Goblin Normal AI's research order and army shares;
// the lab `LAB_GOBLIN_MID`. Two-seat arena (seed-2 Dry Land, 11 x 11): seat
// 0 capital (8, 8), seat 1 capital (2, 8); every tile explored and every
// land technology researched unless stated. The numbers asserted here are
// the ones the tuning document gives as reasons
// (`scripts/goblin-tuning-analysis-v7.ts`).

const at = (x: number, y: number): CoordV7 => ({ x, y });

function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: GoblinArenaOptionsV7 = {},
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const state = goblinArenaV7(factions, pieces, options);
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return { state, view: viewForV7(state, actor) };
}

/** The Normal AI's candidates for one unit, the best first. */
function unitCommands(
  view: PlayerViewV7,
  unitId: number,
): readonly CommandV7[] {
  return chooseNormalCommandV7(view)
    .candidates.map((candidate) => candidate.command)
    .filter((command) => "unitId" in command && command.unitId === unitId);
}

const viewOf = (state: GameStateV7): PlayerViewV7 => {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
};

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

/** A target at (5, 2) with two own Goblins next to it at (4, 1), (4, 3). */
function ganged(
  attacker: UnitRoleIdV7,
  attackerAt: CoordV7,
  target: UnitRoleIdV7,
  inspired = false,
): GameStateV7 {
  return goblinArenaV7(
    ["GOBLIN", "ORIGINAL"],
    [
      {
        seat: 0,
        role: attacker,
        at: attackerAt,
        activation: inspired ? { inspired: true } : {},
      },
      { seat: 0, role: "FIGHTER", at: at(4, 1) },
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: target, at: at(5, 2) },
    ],
  );
}

describe("the Goblin pass: identity", () => {
  // The Undead pass took 7r51, the Martian pass 7r52, and the Dinosaur
  // pass 7r53 (tests/unit/ruleset-v7-dinosaur-pass.test.ts), and the
  // economy rejig 7r54, so 7r50 is a prior identity.
  it("was 7r50 after 7r49, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r65");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r65.current");
    expect(PRIOR_RULESET_7_IDS.slice(-16, -14)).toEqual([
      "pulp-wars-poc-7r49",
      "pulp-wars-poc-7r50",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-16, -14)).toEqual([
      "pulpWars.save.v7r49.current",
      "pulpWars.save.v7r50.current",
    ]);
  });

  it("registers the three rules on three Goblin roles and nowhere else", () => {
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
    const roles: readonly UnitRoleIdV7[] = [
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
      "SUBMARINE",
      "SWORDSMAN",
    ];
    const special: string[] = [];
    for (const faction of factions)
      for (const role of roles) {
        const mechanics = roleMechanicsV7(role, faction);
        if (mechanics.gangUpLimit !== 2)
          special.push(`${faction} ${role} Gang Up ${mechanics.gangUpLimit}`);
        if (mechanics.blastProof)
          special.push(`${faction} ${role} blast-proof`);
        if (mechanics.kaboomAfterAttack)
          special.push(`${faction} ${role} crash`);
      }
    expect(special).toEqual([
      "GOBLIN MARKSMAN Gang Up 0",
      "GOBLIN GUARD blast-proof",
      // The correction pass: a rocket gets +1 at most.
      "GOBLIN CATAPULT Gang Up 1",
      "GOBLIN KNIGHT crash",
    ]);
    // No number of the roster moved.
    expect(
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
      ).map((role) => {
        const rule = effectiveRoleRuleV7(role, "GOBLIN");
        return [rule.label, rule.cost, rule.maxHp, rule.attack2, rule.defense2];
      }),
    ).toEqual([
      ["Goblin", 1, 6, 3, 1],
      ["Wolf Rider", 3, 10, 4, 2],
      ["Bomb Chucker", 3, 8, 4, 2],
      ["Orc Brute", 3, 15, 4, 5],
      ["Orc Warboss", 5, 12, 4, 2],
      ["Rocket Cart", 7, 8, 7, 1],
      ["Scrap Buggy", 8, 10, 6, 2],
    ]);
  });
});

describe("the Goblin pass: a bomb gets no Gang Up", () => {
  it("gives a Bomb Chucker no Gang Up where a Rocket Cart and a Goblin get +2", () => {
    const chucker = previewAt(
      ganged("MARKSMAN", at(7, 2), "FIGHTER"),
      at(7, 2),
      at(5, 2),
    );
    expect(chucker.gangUp).toBe(0);
    expect(chucker.attack2).toBe(4);
    const cart = previewAt(
      ganged("CATAPULT", at(8, 2), "FIGHTER"),
      at(8, 2),
      at(5, 2),
    );
    // The correction pass: +1 at most for a rocket, whatever stands there.
    expect(cart.gangUp).toBe(1);
    expect(cart.attack2).toBe(9);
    const goblin = previewAt(
      ganged("FIGHTER", at(6, 2), "FIGHTER"),
      at(6, 2),
      at(5, 2),
    );
    expect(goblin.gangUp).toBe(2);
    const buggy = previewAt(
      ganged("KNIGHT", at(6, 2), "FIGHTER"),
      at(6, 2),
      at(5, 2),
    );
    expect(buggy.gangUp).toBe(2);
  });

  it("keeps the numbers the change was made for", () => {
    // Before 7r50 a Bomb Chucker with two helpers killed a full-HP Fighter,
    // Raider, Marksman, Captain, Catapult, or Knight in one throw, and with
    // WAAAGH! a Guard (17) and a Swordsman (15). Now:
    const dealt = (
      target: UnitRoleIdV7,
      inspired: boolean,
    ): [number, boolean] => {
      const preview = previewAt(
        ganged("MARKSMAN", at(7, 2), target, inspired),
        at(7, 2),
        at(5, 2),
      );
      return [preview.damageToDefender, preview.defenderDies];
    };
    expect(dealt("FIGHTER", false)).toEqual([5, false]);
    expect(dealt("MARKSMAN", false)).toEqual([6, false]);
    expect(dealt("KNIGHT", false)).toEqual([6, false]);
    expect(dealt("GUARD", false)).toEqual([6, false]);
    expect(dealt("SWORDSMAN", false)).toEqual([4, false]);
    // WAAAGH! is what strengthens a bomb (Attack 3).
    expect(dealt("FIGHTER", true)).toEqual([8, false]);
    expect(dealt("GUARD", true)).toEqual([10, false]);
    expect(dealt("SWORDSMAN", true)).toEqual([7, false]);
    // The Rocket Cart is the ranged unit that kills with helpers: a
    // Swordsman and a Guard in one shot.
    const cart = (target: UnitRoleIdV7): [number, boolean] => {
      const preview = previewAt(
        ganged("CATAPULT", at(8, 2), target),
        at(8, 2),
        at(5, 2),
      );
      return [preview.damageToDefender, preview.defenderDies];
    };
    // The correction pass (Gang Up +1 for a rocket): no longer a Swordsman
    // in one shot (15 and a kill at +2). A Guard in the open still dies,
    // because it is open to ranged attacks (Defense 1).
    expect(cart("SWORDSMAN")).toEqual([13, false]);
    expect(cart("GUARD")).toEqual([17, true]);
    expect(cart("FIGHTER")).toEqual([12, true]);
  });

  it("resolves the throw as previewed, the splash from the unboosted hit", () => {
    const state = ganged("MARKSMAN", at(7, 2), "SWORDSMAN");
    const preview = previewAt(state, at(7, 2), at(5, 2));
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(7, 2)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    const combat = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(combat.preview.gangUp).toBe(0);
    expect(combat.preview.damageToDefender).toBe(preview.damageToDefender);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(11);
    // The two Goblins beside the target take half of 4.
    expect(combat.preview.splash.map((entry) => entry.damage)).toEqual([2, 2]);
  });

  it("tells the AI's own Gang Up estimate the same", () => {
    const state = ganged("MARKSMAN", at(7, 2), "FIGHTER");
    const view = viewOf(state);
    const chucker = view.units.find((unit) => unit.role === "MARKSMAN");
    const goblin = view.units.find(
      (unit) => unit.role === "FIGHTER" && unit.ownerId === view.viewer.id,
    );
    if (chucker === undefined || goblin === undefined) throw new Error("units");
    expect(gangUpForPolicyV7(view, chucker, at(5, 2))).toBe(0);
    expect(gangUpForPolicyV7(view, goblin, at(5, 2))).toBe(1);
  });
});

describe("the Goblin pass: the Orc Brute is Blast-proof", () => {
  it("is not hit by a Kaboom beside it, in the preview and the resolution", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(4, 2) },
        { seat: 0, role: "RAIDER", at: at(6, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
    );
    const goblin = unitAtV7(state, at(5, 2)).id;
    const brute = unitAtV7(state, at(4, 2)).id;
    const preview = previewKaboomV7(view, goblin);
    expect(
      preview?.explosions[0]?.results.map((entry) => entry.unitId),
    ).not.toContain(brute);
    // `pulp_wars-w49.35`: the Goblin's Kaboom is 6 (5 before).
    expect(preview?.totals).toMatchObject({
      hostileDamage: 12,
      friendlyDamage: 6,
    });
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "KABOOM",
      unitId: goblin,
    });
    expect(unitAtV7(result.state, at(4, 2)).hp).toBe(15);
    // The Wolf Rider on the other side is hit like anyone.
    expect(unitAtV7(result.state, at(6, 2)).hp).toBe(4);
    expect(unitAtV7(result.state, at(4, 1)).hp).toBe(6);
    const explosion = result.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (explosion?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    expect(explosion.results.map((entry) => entry.unitId)).not.toContain(brute);
  });

  it("is not hit by a death blast, also an enemy's, and keeps its tile's Field Defense rule", () => {
    // A Human Fighter kills a wounded Bomb Chucker beside an Orc Brute: the
    // blast (5 since `pulp_wars-w49.35`, 2 before) hits the Fighter that
    // advanced and not the Brute.
    const { state } = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), hp: 2 },
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2) },
      ],
    );
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    expect(unitAtV7(result.state, at(4, 2)).hp).toBe(15);
    expect(unitAtV7(result.state, at(6, 2)).hp).toBe(1);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(7);
  });

  it("is not in the splash of a bomb, its own side's or an enemy's", () => {
    const own = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(7, 2) },
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
    );
    const brute = unitAtV7(own.state, at(5, 3)).id;
    const preview = previewAt(own.state, at(7, 2), at(5, 2));
    expect(preview.splash.map((entry) => entry.unitId)).not.toContain(brute);
    expect(preview.splash).toHaveLength(2);
    const thrown = applyOkV7(own.state, seatIdV7(own.state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(own.state, at(7, 2)).id,
      targetUnitId: unitAtV7(own.state, at(5, 2)).id,
    });
    expect(unitAtV7(thrown.state, at(5, 3)).hp).toBe(15);
    expect(unitAtV7(thrown.state, at(4, 3)).hp).toBe(4);

    // A Goblin mirror: the enemy's bomb beside the Brute.
    const mirror = arena(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "MARKSMAN", at: at(7, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
    );
    expect(previewAt(mirror.state, at(7, 2), at(5, 2)).splash).toEqual([]);
  });

  it("is hit by a bomb thrown at it, by an attack, and when it is afloat", () => {
    const direct = arena(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "MARKSMAN", at: at(7, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    // The matrix: a bomb deals an Orc Brute 4.
    expect(previewAt(direct.state, at(7, 2), at(5, 2)).damageToDefender).toBe(
      4,
    );
    // Embarked, it is a passenger like any other.
    const afloat = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(5, 3), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
      { water: [at(5, 3)] },
    );
    const result = applyOkV7(afloat.state, seatIdV7(afloat.state, 0), {
      kind: "KABOOM",
      unitId: unitAtV7(afloat.state, at(5, 2)).id,
    });
    expect(unitAtV7(result.state, at(5, 3)).hp).toBe(9);
  });

  it("is left out of the AI's blast estimate", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
    );
    const blast = hypotheticalBlastV7(
      view,
      at(5, 2),
      5,
      unitAtV7(state, at(5, 2)).id,
      (owner) => owner !== view.viewer.id,
      (owner) => owner === view.viewer.id,
      (_unit, damage) => damage,
      (_unit, damage) => damage,
    );
    expect(blast).toMatchObject({
      friendlyHits: 0,
      friendlyValue: 0,
      hostileHits: 1,
    });
  });
});

describe("the Goblin pass: Crash", () => {
  /** A Buggy next to a Marksman (it will not kill) with two more enemies around. */
  function rammed(): { readonly state: GameStateV7; readonly buggy: UnitId } {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(4, 2) },
        { seat: 1, role: "CATAPULT", at: at(6, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 3)).id;
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    return { state: result.state, buggy };
  }

  it("lets a Scrap Buggy Kaboom after its attack", () => {
    const { state, buggy } = rammed();
    // The matrix: a Buggy alone deals a Marksman 10 of 12.
    expect(unitAtV7(state, at(5, 2)).hp).toBe(2);
    const view = viewOf(state);
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: buggy };
    expect(queryPlayerCommandsV7(view)).toContainEqual(kaboom);
    expect(previewKaboomV7(view, buggy)?.totals).toMatchObject({
      hostileKills: 1,
      hostileDamage: 12,
    });
    const result = applyOkV7(state, seatIdV7(state, 0), kaboom);
    expect(result.state.units.some((unit) => unit.id === buggy)).toBe(false);
    expect(
      result.state.units.some((unit) => unit.at.x === 5 && unit.at.y === 2),
    ).toBe(false);
    expect(unitAtV7(result.state, at(4, 2)).hp).toBe(7);
    expect(unitAtV7(result.state, at(6, 2)).hp).toBe(5);
  });

  it("lets it Kaboom while a Ram continuation waits", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4) },
        { seat: 1, role: "CATAPULT", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 4)).id;
    const killed = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 3)).id,
    });
    const after = unitAtV7(killed.state, at(5, 3));
    expect(after.id).toBe(buggy);
    expect(after.activation.overrunActive).toBe(true);
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: buggy };
    expect(queryPlayerCommandsV7(viewOf(killed.state))).toContainEqual(kaboom);
    const result = applyOkV7(killed.state, seatIdV7(killed.state, 0), kaboom);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(12);
    expect(unitAtV7(result.state, at(4, 2)).hp).toBe(12);
  });

  it("gives no other unit a Kaboom after its attack", () => {
    for (const role of ["FIGHTER", "RAIDER", "MARKSMAN"] as const) {
      const distance = role === "MARKSMAN" ? 2 : 1;
      const { state } = arena(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role, at: at(5, 2 + distance) },
          { seat: 1, role: "GUARD", at: at(5, 2) },
        ],
      );
      const unit = unitAtV7(state, at(5, 2 + distance)).id;
      const attacked = applyOkV7(state, seatIdV7(state, 0), {
        kind: "ATTACK",
        unitId: unit,
        targetUnitId: unitAtV7(state, at(5, 2)).id,
      });
      if (!attacked.state.units.some((item) => item.id === unit)) continue;
      const kaboom: CommandV7 = { kind: "KABOOM", unitId: unit };
      expect(queryPlayerCommandsV7(viewOf(attacked.state))).not.toContainEqual(
        kaboom,
      );
      const refused = applyCommandV7(
        attacked.state,
        seatIdV7(state, 0),
        kaboom,
      );
      expect(refused.accepted).toBe(false);
      if (!refused.accepted)
        expect(refused.error.code).toBe("UNIT_ALREADY_ACTED");
    }
  });

  it("reads one predicate: attacks do not count with Crash, other actions do", () => {
    const fresh = {
      attacked: false,
      recovered: false,
      captured: false,
      specialActed: false,
      overrunActive: false,
    };
    expect(kaboomReadyV7(fresh, false)).toBe(true);
    expect(kaboomReadyV7({ ...fresh, attacked: true }, false)).toBe(false);
    expect(kaboomReadyV7({ ...fresh, overrunActive: true }, false)).toBe(false);
    expect(kaboomReadyV7({ ...fresh, attacked: true }, true)).toBe(true);
    expect(
      kaboomReadyV7({ ...fresh, attacked: true, overrunActive: true }, true),
    ).toBe(true);
    expect(kaboomReadyV7({ ...fresh, recovered: true }, true)).toBe(false);
    expect(kaboomReadyV7({ ...fresh, specialActed: true }, true)).toBe(false);
  });
});

describe("the Goblin pass: the Normal AI", () => {
  it("researches Bomb Chucker, Wolf Rider, Ogre, Orc Brute, Rocket Cart, Warboss, Scrap Buggy", () => {
    // The correction pass: the Orc Brute third (it was last, and the first
    // Brute of a hand-played game came in round 20).
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the Ogre after the
    // Warboss.
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
    // The Human seat: the Swordsman third (it was fifth).
    expect(ARMY_RESEARCH_ROLES_V7.ORIGINAL).toEqual([
      "MARKSMAN",
      "GUARD",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
      "CAPTAIN",
    ]);
    expect(ARMY_WAR_RESEARCH_ROUNDS_V7).toBe(3);
  });

  it("fields a quarter Rocket Carts, a fifth Orc Brutes, and 15% Scrap Buggies", () => {
    expect(armySharesV7("GOBLIN", false)).toEqual({
      LINE: 20,
      DEFENDER: 20,
      RANGED: 20,
      SIEGE: 25,
      BREAKTHROUGH: 15,
    });
    expect(armySharesV7("GOBLIN", true)).toEqual({
      LINE: 15,
      DEFENDER: 20,
      RANGED: 20,
      SIEGE: 25,
      BREAKTHROUGH: 20,
    });
    // An army of six Goblins, three Bomb Chuckers and a Brute: the dear
    // units come first, the Rocket Cart or the Scrap Buggy.
    const counts: ArmyCountsV7 = {
      total: 10,
      byClass: {
        LINE: 6,
        DEFENDER: 1,
        RANGED: 3,
        SIEGE: 0,
        BREAKTHROUGH: 0,
        SKIRMISHER: 0,
        SUPPORT: 0,
      },
      hostileFragile: 0,
    };
    const order = (
      ["FIGHTER", "MARKSMAN", "GUARD", "CATAPULT", "KNIGHT"] as const
    )
      .map(
        (role) =>
          [role, armyRoleScoreV7("GOBLIN", role, counts, false)] as const,
      )
      .sort((left, right) => right[1] - left[1])
      .map(([role]) => role);
    expect(order.slice(0, 2)).toEqual(["CATAPULT", "KNIGHT"]);
    // Onto a threatened or frontier center neither is trained: a body is.
    const front = (
      ["FIGHTER", "MARKSMAN", "GUARD", "CATAPULT", "KNIGHT"] as const
    )
      .map(
        (role) =>
          [role, armyRoleScoreV7("GOBLIN", role, counts, true)] as const,
      )
      .sort((left, right) => right[1] - left[1])
      .map(([role]) => role);
    expect(front[0]).toBe("GUARD");
    expect(front.indexOf("KNIGHT")).toBeGreaterThan(front.indexOf("CATAPULT"));
    expect(
      armyRoleScoreV7("GOBLIN", "KNIGHT", counts, false) -
        armyRoleScoreV7("GOBLIN", "KNIGHT", counts, true),
    ).toBe(400);
    // A Goblin seat's rule: a Human Knight's score is as it was.
    expect(
      armyRoleScoreV7("ORIGINAL", "KNIGHT", counts, false) -
        armyRoleScoreV7("ORIGINAL", "KNIGHT", counts, true),
    ).toBe(0);
  });

  it("trains a Rocket Cart as soon as it has the Coins, a Wolf Rider without them", () => {
    const trained = (coins: number): readonly CommandV7[] => {
      const { view } = arena(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "GUARD", at: at(8, 7) },
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "MARKSMAN", at: at(9, 7) },
          { seat: 1, role: "FIGHTER", at: at(2, 2) },
        ],
        { coins },
      );
      return chooseNormalCommandV7(view)
        .candidates.map((candidate) => candidate.command)
        .filter((command) => command.kind === "TRAIN");
    };
    expect(trained(7)).toMatchObject([{ kind: "TRAIN", role: "CATAPULT" }]);
    expect(trained(3)).toMatchObject([{ kind: "TRAIN", role: "RAIDER" }]);
  });

  it("crashes a spent Scrap Buggy that stands among enemies", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(4, 2) },
        { seat: 1, role: "CATAPULT", at: at(6, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 3)).id;
    const attacked = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    const view = viewOf(attacked.state);
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: buggy };
    // Two kills are not needed: a kill and two more enemies in the blast.
    expect(scoreCommandV7(view, kaboom).priority).toBe(1181);
    expect(unitCommands(view, buggy)[0]).toEqual(kaboom);
  });

  it("does not crash a spent Scrap Buggy whose blast would cost more than it gains", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "MARKSMAN", at: at(6, 4) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 3)).id;
    const attacked = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    const view = viewOf(attacked.state);
    expect(
      chooseNormalCommandV7(view).candidates.some(
        (candidate) =>
          candidate.command.kind === "KABOOM" &&
          candidate.command.unitId === buggy,
      ),
    ).toBe(false);
  });

  it("Kabooms a Goblin beside its own Orc Brute, which the blast does not hurt", () => {
    // Three enemies around the Goblin and an own Brute beside it: with the
    // Brute hit (before 7r50) the friendly damage kept this blast below an
    // ordinary kill.
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(6, 1) },
      ],
    );
    const kaboom: CommandV7 = {
      kind: "KABOOM",
      unitId: unitAtV7(state, at(5, 2)).id,
    };
    expect(scoreCommandV7(view, kaboom).priority).toBe(1181);
    expect(unitCommands(view, kaboom.unitId)[0]).toEqual(kaboom);
  });
});

describe("the Goblin pass: Scouts", () => {
  it("gives a Goblin city's Survey a free Wolf Rider, like the Humans' Raider", () => {
    // (The Undead pass, 7r51: an Undead Survey grants a Ghoul.)
    expect(SURVEY_RAIDERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 1,
      // The Dinosaur pass, 7r53: a Dinosaur Survey grants a Raptor.
      DINOSAUR: 1,
      // The Martian pass, 7r52: a Martian Survey grants a Saucer.
      MARTIAN: 1,
      // Step two of the Ice Folk pass (7r59): a Sled.
      ICE_FOLK: 1,
      // The reward ladder rework (`pulp_wars-zypi`): a Gyrocopter and a
      // Donut Racer.
      DWARF: 1,
      CANDY: 1,
    });
    // A Goblin capital that reaches level 3 with three Farms (through the
    // level-2 Stockpile) and takes it: Scouts is a level-3 reward since the
    // reward ladder rework (`pulp_wars-zypi`; level 2 before).
    const base = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { techs: { 0: ["GATHERING", "FARMING"], 1: [] }, coins: 50 },
    );
    const actor = seatIdV7(base, 0);
    const capital = base.cities.find((city) => city.ownerId === actor);
    if (capital === undefined) throw new Error("capital missing");
    const farms = [at(8, 9), at(7, 9), at(9, 9)];
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          farms.some((farm) => tile.at.x === farm.x && tile.at.y === farm.y)
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
    let built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: at(8, 9) });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
      candidates: ["STOCKPILE", "MILITIA"],
    });
    built = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(7, 9) });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(9, 9) });
    const pending = built.state.pendingChoices[0];
    expect(pending).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 3,
      candidates: ["SURVEY", "WALLS"],
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 3,
      reward: "SURVEY",
    });
    const granted = chosen.events.find(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    expect(granted).toMatchObject({ role: "RAIDER", reachedLevel: 3 });
    const rider = chosen.state.units.find(
      (unit) => unit.ownerId === actor && unit.role === "RAIDER",
    );
    expect(rider).toBeDefined();
    expect(effectiveRoleRuleV7("RAIDER", "GOBLIN").label).toBe("Wolf Rider");
  });
});

describe("the Goblin pass: LAB_GOBLIN_MID", () => {
  it("stages the Goblins for the hand player with every unit trainable", () => {
    const mission = missionByIdV7("LAB_GOBLIN_MID");
    if (mission === null) throw new Error("lab missing");
    expect(mission.hidden).toBe(true);
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    expect(setup.factions).toEqual(["GOBLIN", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.viewer.faction).toBe("GOBLIN");
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
      GUARD: 3,
      FIGHTER: 6,
      RAIDER: 3,
      MARKSMAN: 4,
    });
    expect(count(1)).toEqual({
      GUARD: 2,
      CATAPULT: 2,
      KNIGHT: 2,
      FIGHTER: 5,
      MARKSMAN: 3,
      SWORDSMAN: 3,
    });
    const cities = (seat: number): number[] => {
      const owner = state.players.find((player) => player.seat === seat);
      return state.cities
        .filter((city) => city.ownerId === owner?.id)
        .map((city) => city.level);
    };
    expect(cities(0)).toEqual([4, 3, 3, 2, 2]);
    expect(cities(1)).toEqual([4, 3, 3, 2, 2]);
    // Every Goblin unit is offered in a city with a free slot.
    const trained = new Set(
      queryPlayerCommandsV7(view).flatMap((command) =>
        command.kind === "TRAIN" ? [command.role] : [],
      ),
    );
    expect([...trained].sort()).toEqual([
      "CAPTAIN",
      "CATAPULT",
      "FIGHTER",
      "GUARD",
      "KNIGHT",
      "MARKSMAN",
      "RAIDER",
      // (Revision 2 of the lab, 7r55: the Ogre.)
      "SWORDSMAN",
    ]);
    // Four cities train on the first turn (the capital is full).
    expect(
      new Set(
        queryPlayerCommandsV7(view).flatMap((command) =>
          command.kind === "TRAIN" ? [command.cityId] : [],
        ),
      ).size,
    ).toBe(4);
  });
});

describe("the Goblin pass: unit text", () => {
  it("says each rule in a few words on its unit", () => {
    expect(goblinRecruitNotesV7("MARKSMAN", "GOBLIN")).toContain(
      `No Gang Up: ${NO_GANG_UP_DESCRIPTION_V7}`,
    );
    expect(
      goblinRecruitNotesV7("MARKSMAN", "GOBLIN").some((note) =>
        note.startsWith("Gang Up:"),
      ),
    ).toBe(false);
    expect(goblinRecruitNotesV7("GUARD", "GOBLIN")).toContain(
      `Blast-proof: ${BLAST_PROOF_DESCRIPTION_V7}`,
    );
    expect(goblinRecruitNotesV7("KNIGHT", "GOBLIN")).toContain(
      `Crash: ${CRASH_DESCRIPTION_V7}`,
    );
    for (const role of [
      "FIGHTER",
      "RAIDER",
      "CATAPULT",
      "KNIGHT",
      "GUARD",
    ] as const)
      expect(
        goblinRecruitNotesV7(role, "GOBLIN").some((note) =>
          note.startsWith("Gang Up:"),
        ),
      ).toBe(true);
    expect(goblinRecruitNotesV7("GUARD", "ORIGINAL")).toEqual([]);
    expect(GOBLIN_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Horde",
      "Gang Up",
      "Kaboom",
      "Death blasts",
      "Chain reactions",
      "Bombs",
      "Orc Brutes",
      "Crash",
      "Plunder",
      // `pulp_wars-w49.36`: Berserk replaced WAAAGH!.
      "Berserk",
      "Trolls",
      "Discipline",
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Ogre.
      "Heavyweight",
    ]);
  });
});

// ---------------------------------------------------------------------------
// The correction pass after three hand-played sessions (`ga`, `gb`, `gc`).
// ---------------------------------------------------------------------------

/** A recorded position of a hand-played game (a canonical state). */
function recorded(name: string): GameStateV7 {
  const state = parseGameStateV7(
    JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8")),
  );
  if (state === null) throw new Error(`${name}: not a current state`);
  return state;
}

/** The active seat plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly events: readonly { readonly kind: string }[];
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const commands: CommandV7[] = [];
  const events: { readonly kind: string }[] = [];
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
    if (command.kind === "END_TURN") return { commands, events };
    const result = applyOkV7(state, actor, command);
    events.push(...result.events);
    state = result.state;
  }
  throw new Error("the turn did not end");
}

describe("the Goblin pass, correction: rules", () => {
  it("caps a rocket's Gang Up at +1: the numbers by ground", () => {
    // Rows of `scripts/goblin-tuning-analysis-v7.ts rocket`: alone, and
    // with one Goblin beside the target, in the open.
    const shot = (target: UnitRoleIdV7, helper: boolean): [number, boolean] => {
      const state = goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "CATAPULT", at: at(8, 2) },
          ...(helper
            ? [{ seat: 0, role: "FIGHTER" as const, at: at(4, 1) }]
            : []),
          { seat: 1, role: target, at: at(5, 2) },
        ],
      );
      const preview = previewAt(state, at(8, 2), at(5, 2));
      expect(preview.gangUp).toBe(helper ? 1 : 0);
      return [preview.damageToDefender, preview.defenderDies];
    };
    expect(shot("GUARD", false)).toEqual([12, false]);
    expect(shot("GUARD", true)).toEqual([17, true]);
    expect(shot("SWORDSMAN", false)).toEqual([9, false]);
    expect(shot("SWORDSMAN", true)).toEqual([13, false]);
    expect(shot("KNIGHT", true)).toEqual([13, true]);
  });

  it("pays 2 Coins of Plunder a kill", () => {
    expect(
      technologyCapabilitiesV7(["SCOUTING", "ROADS", "COMMERCE"], "GOBLIN")
        .plunderCoins,
    ).toBe(2);
    expect(
      technologyCapabilitiesV7(["SCOUTING", "ROADS"], "GOBLIN").plunderCoins,
    ).toBe(0);
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
      ],
    );
    const actor = seatIdV7(state, 0);
    const before = state.players.find((player) => player.id === actor)?.coins;
    const result = applyOkV7(state, actor, {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    expect(result.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: actor,
      kills: 1,
      coins: 2,
    });
    expect(
      result.state.players.find((player) => player.id === actor)?.coins,
    ).toBe((before ?? 0) + 2);
  });
});

describe("the Goblin pass, correction: the Normal AI", () => {
  it("weighs a unit with Gang Up half as much again, and commits a joined battle with the numbers at 70%", () => {
    expect(ARMY_GANG_UP_STRENGTH_V7).toBe(150);
    // The recorded position (below): 284 near against 287, fourteen units
    // against eight, the battle joined.
    const facts = {
      hostile: 287,
      near: 284,
      coming: 317,
      hostileUnits: 8,
      nearUnits: 14,
      comingUnits: 15,
    };
    expect(armyAssaultModeV7({ ...facts, contact: true })).toBe("COMMIT");
    // Without the numbers a joined battle still needs the weight.
    expect(
      armyAssaultModeV7({
        ...facts,
        nearUnits: 11,
        comingUnits: 11,
        contact: true,
      }),
    ).not.toBe("COMMIT");
    // And at less than 70% of the weight the numbers do not carry it.
    expect(
      armyAssaultModeV7({ ...facts, near: 190, coming: 190, contact: true }),
    ).not.toBe("COMMIT");
  });

  it("attacks in the recorded position where 17 Goblin units stood in front of 11 Human units (gc, round 17)", () => {
    // tests/fixtures/ruleset-v7-goblin-standing-army.json: the state at the
    // start of the Goblin seat's turn in round 17 of the hand-played game
    // `gc` (dry land 14 x 14, seed 11). In the game the seat made no attack
    // in this turn and two or three in each of rounds 15 to 20, and lost
    // seventeen units in round 21.
    const state = recorded("ruleset-v7-goblin-standing-army");
    expect(state.round).toBe(17);
    const turn = policyTurn(state);
    const attackers = turn.commands.flatMap((command) =>
      command.kind === "ATTACK"
        ? [state.units.find((unit) => unit.id === command.unitId)?.role]
        : [],
    );
    expect(attackers.length).toBeGreaterThanOrEqual(5);
    // Two of them are bombs (in the game: none).
    expect(
      attackers.filter((role) => role === "MARKSMAN").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("researches the Swordsman in the recorded position where the Human seat stalled (gb, round 15)", () => {
    // tests/fixtures/ruleset-v7-human-research-stall.json: the Human AI's
    // turn in round 15 of the hand-played game `gb`. It owned five
    // technologies (it bought Forestry here and owned seven in round 25).
    const state = recorded("ruleset-v7-human-research-stall");
    expect(state.round).toBe(15);
    const actor = state.turnOrder[state.activeSeatIndex];
    expect(
      state.players.find((player) => player.id === actor)?.researchedTechs,
    ).toHaveLength(5);
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the recorded seat
    // owns the root and not Fortification, where the Guard (the second unit
    // of the Human order) is now; it researches that (Engineering, the
    // first step to the Champion, before 7r56). What the test is for is
    // that the seat buys a technology of its order here.
    expect(policyTurn(state).commands).toContainEqual({
      kind: "RESEARCH",
      tech: "FORTIFICATION",
    });
  });

  it("moves a Bomb Chucker up to a throw that is worth its splash on an own Goblin", () => {
    // An own Goblin stands beside the target, which was a reason not to
    // come ("the Bomb Chucker walked up and then did not throw"). The step
    // to the firing tile has the priority of a throw (1175 or 1187) when
    // the throw would be accepted, and not when the splash kills the Goblin.
    const position = (goblinHp: number): number => {
      const { state, view } = arena(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "MARKSMAN", at: at(7, 5) },
          { seat: 0, role: "FIGHTER", at: at(4, 3), hp: goblinHp },
          { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
          { seat: 1, role: "MARKSMAN", at: at(6, 1) },
        ],
      );
      return scoreCommandV7(view, {
        kind: "MOVE",
        unitId: unitAtV7(state, at(7, 5)).id,
        path: [at(7, 4)],
      }).priority;
    };
    expect(position(6)).toBeGreaterThanOrEqual(1175);
    expect(position(2)).toBeLessThan(1175);
  });

  it("crashes a spent Scrap Buggy that the enemy would kill, on one enemy", () => {
    // Its attack did not kill; one enemy in the blast, no own unit: before
    // the correction an army seat's Kaboom needed a kill or two enemies.
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 0) },
        { seat: 1, role: "MARKSMAN", at: at(7, 1) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 3)).id;
    const attacked = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    const view = viewOf(attacked.state);
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: buggy };
    expect(scoreCommandV7(view, kaboom).priority).toBeGreaterThan(0);
    expect(unitCommands(view, buggy)[0]).toEqual(kaboom);
  });

  it("does not crash where the blast would kill an own Goblin", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3), hp: 3 },
        // A Guard: the Buggy's hit and its blast together do not kill it.
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 0) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 3)).id;
    const attacked = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    });
    expect(
      unitCommands(viewOf(attacked.state), buggy).some(
        (command) => command.kind === "KABOOM",
      ),
    ).toBe(false);
  });

  it("rams on: a Scrap Buggy that killed attacks the next target in reach", () => {
    // The Buggy killed a Catapult and stands on its tile with the Ram
    // (Overrun) continuation waiting and a hurt Marksman beside it.
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4) },
        { seat: 1, role: "CATAPULT", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), hp: 8 },
        { seat: 1, role: "GUARD", at: at(2, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(5, 4)).id;
    const killed = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(unitAtV7(killed.state, at(5, 3)).activation.overrunActive).toBe(
      true,
    );
    expect(unitCommands(viewOf(killed.state), buggy)[0]).toEqual({
      kind: "ATTACK",
      unitId: buggy,
      targetUnitId: unitAtV7(killed.state, at(5, 2)).id,
    });
  });

  it("steps a Goblin beside the target of its Rocket Cart", () => {
    // A Swordsman in the open three tiles from the Cart: the rocket deals 9
    // alone and 13 with one Goblin beside the target (the most it gets).
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(5, 5) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
      ],
    );
    const goblin = unitAtV7(state, at(3, 3)).id;
    expect(previewAt(state, at(5, 5), at(5, 2)).damageToDefender).toBe(9);
    const top = unitCommands(view, goblin)[0];
    if (top?.kind !== "MOVE") throw new Error("the Goblin does not move");
    const end = top.path[top.path.length - 1] ?? at(-9, -9);
    expect(Math.max(Math.abs(end.x - 5), Math.abs(end.y - 2))).toBe(1);
    const moved = applyOkV7(state, seatIdV7(state, 0), top);
    expect(previewAt(moved.state, at(5, 5), at(5, 2)).damageToDefender).toBe(
      13,
    );
  });

  it("stands an Orc Brute beside its Bomb Chuckers rather than apart", () => {
    // Two Bomb Chuckers and a Brute walking up; a Human Knight in sight.
    // Of two tiles equally near the enemy the Brute takes the one beside
    // the shooters.
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 5) },
        { seat: 0, role: "MARKSMAN", at: at(6, 5) },
        { seat: 0, role: "GUARD", at: at(5, 7) },
        { seat: 1, role: "KNIGHT", at: at(5, 1) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 1) },
      ],
    );
    const brute = unitAtV7(state, at(5, 7)).id;
    const beside: CommandV7 = { kind: "MOVE", unitId: brute, path: [at(5, 6)] };
    const apart: CommandV7 = { kind: "MOVE", unitId: brute, path: [at(4, 8)] };
    const scoreOf = (command: CommandV7): number =>
      scoreCommandV7(view, command).strategicValue;
    expect(scoreOf(beside) - scoreOf(apart)).toBeGreaterThanOrEqual(12);
  });
});

// The Goblin hand pass at `7r55` (`pulp_wars-w49.19`,
// docs/product/RULESET_7_TUNING_GOBLIN.md section 13): no rule changed. One
// policy correction: a unit that can step back and kill with its ordinary
// attack does not blow itself up for that kill.
describe("the Goblin hand pass at 7r55: the Normal AI", () => {
  // A Bomb Chucker beside a Fighter with 3 HP, two Marksmen in reach of it
  // (the enemy kills it next turn). The recorded case: twice in one
  // hand-played game such a Bomb Chucker blew itself up (4 damage) for the
  // one kill, where a step back and a bomb kill the Fighter too.
  const beside = (
    chucker: GoblinPieceV7["activation"] = {},
  ): { readonly state: GameStateV7; readonly view: PlayerViewV7 } =>
    arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 3), activation: chucker },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 3 },
        { seat: 1, role: "MARKSMAN", at: at(5, 0) },
        { seat: 1, role: "MARKSMAN", at: at(7, 1) },
      ],
    );

  it("steps a Bomb Chucker back and throws rather than blow it up for the same kill", () => {
    const { state, view } = beside();
    const chucker = unitAtV7(state, at(5, 3)).id;
    const fighter = unitAtV7(state, at(5, 2)).id;
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: chucker };
    // The blast would kill the Fighter and nothing else.
    const blast = previewKaboomV7(view, chucker);
    expect(blast?.totals.hostileKills).toBe(1);
    expect(blast?.explosions[0]?.results.map((hit) => hit.unitId)).toEqual([
      fighter,
    ]);
    expect(scoreCommandV7(view, kaboom).priority).toBeLessThan(0);
    const top = unitCommands(view, chucker)[0];
    if (top?.kind !== "MOVE") throw new Error("the Bomb Chucker does not move");
    const end = top.path[top.path.length - 1] ?? at(-9, -9);
    expect(Math.max(Math.abs(end.x - 5), Math.abs(end.y - 2))).toBe(2);
    const moved = applyOkV7(state, seatIdV7(state, 0), top);
    const throwIt: CommandV7 = {
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: fighter,
    };
    expect(unitCommands(viewOf(moved.state), chucker)[0]).toEqual(throwIt);
    expect(
      queryCombatPreviewV7(viewOf(moved.state), chucker, fighter)?.defenderDies,
    ).toBe(true);
  });

  it("still blows it up where it has moved and cannot throw", () => {
    const { state, view } = beside({ moved: true });
    const chucker = unitAtV7(state, at(5, 3)).id;
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: chucker };
    expect(scoreCommandV7(view, kaboom).priority).toBeGreaterThan(0);
    expect(unitCommands(view, chucker)[0]).toEqual(kaboom);
  });
});
