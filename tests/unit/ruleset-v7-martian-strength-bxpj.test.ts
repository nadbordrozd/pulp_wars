import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import { MIND_CONTROL_PRIORITY_V7 } from "../../src/ai/v7-martian";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  calculateCombatPreviewV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { unitCandidatesV7, viewerViewV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  attackV7,
  moveV7,
  movedV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/*
 * The Martian strength pass (`pulp_wars-bxpj`, ruleset 7r145; the user,
 * 2026-11-24: "the martian brain is too nerfed ... take control of another
 * unit with no cooldown"; the heat-ray units were "underpowered because of
 * the cooldown thing"). Mind Control has no cooldown, Cooling is gone (a
 * ray fires at full power every turn its unit has not moved and at half
 * power after a Move; Heat Sinks keeps only the Human Fieldcraft unlocks),
 * and the Colossus has Attack 5. The comparison with the Human twins
 * is RULESET_7_CURRENT.md section 20.4. Hand-built states only (no match).
 */

const at = (x: number, y: number): CoordV7 => ({ x, y });

/** Ends turns until seat 0 is active again (its next turn). */
const nextOwnTurn = (state: GameStateV7): GameStateV7 =>
  endTurnUntilV7(
    endTurnUntilV7(state, seatIdV7(state, 1)).state,
    seatIdV7(state, 0),
  ).state;

/** The exact preview of seat 0's unit on `from` attacking `to`. */
function hit(state: GameStateV7, from: CoordV7, to: CoordV7): CombatPreviewV7 {
  return calculateCombatPreviewV7(
    state,
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
}

/**
 * Seat 0's `role` of `faction` on `from` shooting seat 1's full-HP
 * `target` of `targetFaction` on `to`, open Grass; `moved` tiles of Move
 * this turn first (0: unmoved). Seat 0 has every technology but Heat Sinks
 * and the Disintegrator.
 */
function shot(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  from: CoordV7,
  targetFaction: FactionIdV7,
  target: UnitRoleIdV7,
  to: CoordV7,
  moved = 0,
): CombatPreviewV7 {
  const state = martianFieldV7(
    [
      {
        seat: 0,
        role,
        at: from,
        ...(moved > 0 ? { activation: movedV7(moved) } : {}),
      },
      { seat: 1, role: target, at: to },
    ],
    {
      factions: [faction, targetFaction],
      techs: { 0: withoutTechsV7(faction, "FIELDCRAFT", "EXPLOSIVES") },
    },
  );
  return hit(state, from, to);
}

/** The whole hit (Shield and HP, capped at them) and whether it kills. */
const dealt = (preview: CombatPreviewV7) => ({
  hit: preview.damageToDefender + preview.defenderShieldDamage,
  dies: preview.defenderDies,
});

describe("the identity (pulp_wars-bxpj)", () => {
  it("is the current identity, 7r145 after 7r144", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r146");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r146.current");
    expect(PRIOR_RULESET_7_IDS.at(-2)).toBe("pulp-wars-poc-7r144");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-2)).toBe(
      "pulpWars.save.v7r144.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("retires the `cooling` and `mindControlCooldowns` lists and `coolingApplied`", () => {
    const state = martianFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(state).not.toHaveProperty("cooling");
    expect(state).not.toHaveProperty("mindControlCooldowns");
    const view = viewForV7(state, activeIdV7(state));
    expect(view).not.toHaveProperty("cooling");
    expect(view).not.toHaveProperty("mindControlCooldowns");
    for (const key of ["cooling", "mindControlCooldowns"])
      expect(
        parseGameStateV7(JSON.parse(JSON.stringify({ ...state, [key]: [] }))),
        key,
      ).toBeNull();
    const run = attackV7(state, at(3, 2), at(5, 2));
    expect(run.combat.rayPower).toBe("FULL");
    expect(run.combat).not.toHaveProperty("coolingApplied");
    const preview = queryCombatPreviewV7(
      view,
      unitAtV7(state, at(3, 2)).id,
      unitAtV7(state, at(5, 2)).id,
    );
    expect(preview).not.toHaveProperty("coolingApplied");
  });
});

describe("Mind Control without a cooldown", () => {
  // The Brain on (4, 4), two Human Fighters beside it, and one far away.
  const field = () =>
    martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(3, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
  const take = (state: GameStateV7, target: CoordV7): CommandV7 => ({
    kind: "MIND_CONTROL",
    unitId: unitAtV7(state, at(4, 4)).id,
    targetUnitId: unitAtV7(state, target).id,
  });
  const offered = (state: GameStateV7, command: CommandV7): boolean =>
    queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).some(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
    );

  it("lets a Brain take a unit on consecutive turns, offered and accepted each time", () => {
    const start = field();
    expect(offered(start, take(start, at(3, 4)))).toBe(true);
    const first = applyOkV7(start, activeIdV7(start), take(start, at(3, 4)));
    expect(first.state.mindControlled).toHaveLength(1);
    // Once a turn: its primary action is spent.
    expect(offered(first.state, take(first.state, at(5, 4)))).toBe(false);
    const refused = queryPlayerCommandsV7(
      viewForV7(first.state, activeIdV7(first.state)),
    ).filter((command) => command.kind === "MIND_CONTROL");
    expect(refused).toEqual([]);
    // The very next turn it takes the second Fighter.
    const next = nextOwnTurn(first.state);
    expect(offered(next, take(next, at(5, 4)))).toBe(true);
    const second = applyOkV7(next, activeIdV7(next), take(next, at(5, 4)));
    expect(second.state.mindControlled).toHaveLength(2);
    expect(
      second.state.mindControlled.every(
        (entry) => entry.brainUnitId === unitAtV7(start, at(4, 4)).id,
      ),
    ).toBe(true);
  });

  it("is what the Normal AI picks for the Brain on both turns", () => {
    const start = field();
    const first = unitCandidatesV7(start, at(4, 4))[0];
    expect(first?.command.kind).toBe("MIND_CONTROL");
    expect(
      scoreCommandV7(viewerViewV7(start), take(start, at(3, 4))),
    ).toMatchObject({ priority: MIND_CONTROL_PRIORITY_V7 });
    const taken = applyOkV7(
      start,
      activeIdV7(start),
      first?.command ?? take(start, at(3, 4)),
    ).state;
    const next = nextOwnTurn(taken);
    const second = unitCandidatesV7(next, at(4, 4))[0];
    expect(second?.command.kind).toBe("MIND_CONTROL");
    expect(second?.score.priority).toBe(MIND_CONTROL_PRIORITY_V7);
  });

  it("lets a Brain use Psychic Command on consecutive turns too", () => {
    const start = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 5) },
      { seat: 0, role: "FIGHTER", at: at(3, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const rally: CommandV7 = {
      kind: "RALLY",
      unitId: unitAtV7(start, at(4, 5)).id,
    };
    const next = nextOwnTurn(applyOkV7(start, activeIdV7(start), rally).state);
    expect(
      queryPlayerCommandsV7(viewForV7(next, activeIdV7(next))),
    ).toContainEqual(rally);
    expect(
      applyOkV7(next, activeIdV7(next), rally).events.map(
        (event) => event.kind,
      ),
    ).toContain("UNITS_RALLIED");
  });
});

describe("heat rays without Cooling", () => {
  for (const [role, full, half] of [
    ["MARKSMAN", 6, 3],
    ["CATAPULT", 8, 4],
    ["JUGGERNAUT", 10, 5],
  ] as const)
    it(`a ${effectiveRoleRuleV7(role, "MARTIAN").label} fires at full power standing still on consecutive turns, and at half after a Move`, () => {
      let state = martianFieldV7(
        [
          { seat: 0, role, at: at(3, 2) },
          { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
        ],
        { techs: { 0: withoutTechsV7("MARTIAN", "FIELDCRAFT") } },
      );
      for (let turn = 0; turn < 2; turn += 1) {
        const run = attackV7(state, at(3, 2), at(5, 2));
        expect(run.combat, `turn ${turn}`).toMatchObject({
          rayPower: "FULL",
          attack2: full,
        });
        state = nextOwnTurn(run.state);
      }
      // A Move of one tile, then the shot: half power.
      const moved = moveV7(state, at(3, 2), [at(3, 3)]).state;
      expect(attackV7(moved, at(3, 3), at(5, 2)).combat).toMatchObject({
        rayPower: "HALF",
        attack2: half,
      });
    });
});

describe("Heat Sinks no longer changes the ray", () => {
  const gunner = (
    techs: readonly ReturnType<typeof withoutTechsV7>[number][],
    activation: NonNullable<MartianPieceV7["activation"]>,
  ) =>
    martianFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 2), activation },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
      ],
      { techs: { 0: techs } },
    );
  const all = withoutTechsV7("MARTIAN");
  const none = withoutTechsV7("MARTIAN", "FIELDCRAFT");

  it("halves a Ray Gunner after a one-tile Move with or without Heat Sinks, and the public preview and stats agree", () => {
    for (const techs of [all, none]) {
      expect(hit(gunner(techs, movedV7(1)), at(3, 2), at(5, 2))).toMatchObject({
        rayPower: "HALF",
        attack2: 3,
      });
      expect(hit(gunner(techs, {}), at(3, 2), at(5, 2))).toMatchObject({
        rayPower: "FULL",
        attack2: 6,
      });
    }
    const moved = moveV7(gunner(all, {}), at(3, 2), [at(3, 3)]).state;
    expect(attackV7(moved, at(3, 3), at(5, 2)).combat).toMatchObject({
      rayPower: "HALF",
    });
    const view = viewForV7(moved, activeIdV7(moved));
    expect(
      queryCombatPreviewV7(
        view,
        unitAtV7(moved, at(3, 3)).id,
        unitAtV7(moved, at(5, 2)).id,
      ),
    ).toMatchObject({ rayPower: "HALF" });
    expect(
      view.unitStats.find(
        (entry) => entry.unitId === unitAtV7(moved, at(3, 3)).id,
      )?.martian?.rayPower,
    ).toBe("HALF");
  });

  it("keeps only the Human Fieldcraft unlocks on the Martian Fieldcraft", () => {
    const fieldcraft = (faction: FactionIdV7) =>
      factionTreeV7(faction).nodes.find((node) => node.id === "FIELDCRAFT")
        ?.unlocks;
    expect(fieldcraft("MARTIAN")).toEqual(fieldcraft("ORIGINAL"));
    expect(technologyNameV7("FIELDCRAFT", "MARTIAN")).toBe("Heat Sinks");
  });
});

describe("the Martian rays against their Human twins (section 20.4)", () => {
  const ray = (
    role: UnitRoleIdV7,
    target: UnitRoleIdV7,
    targetFaction: FactionIdV7,
    moved: number,
    range = 2,
  ) =>
    dealt(
      shot(
        "MARTIAN",
        role,
        at(3, 2),
        targetFaction,
        target,
        at(3 + range, 2),
        moved,
      ),
    );
  const human = (
    role: UnitRoleIdV7,
    target: UnitRoleIdV7,
    targetFaction: FactionIdV7,
    range = 2,
  ) =>
    dealt(
      shot("ORIGINAL", role, at(3, 2), targetFaction, target, at(3 + range, 2)),
    );

  it("a full-power Ray Gunner one-shots a full-HP Goblin, a half-power one does not; the Marksman does", () => {
    expect(effectiveRoleRuleV7("FIGHTER", "GOBLIN")).toMatchObject({
      label: "Goblin",
      maxHp: 6,
    });
    // (12 by the formula, capped at its 6 HP.)
    expect(ray("MARKSMAN", "FIGHTER", "GOBLIN", 0)).toEqual({
      hit: 6,
      dies: true,
    });
    expect(ray("MARKSMAN", "FIGHTER", "GOBLIN", 1)).toEqual({
      hit: 5,
      dies: false,
    });
    // (7 by the formula.)
    expect(human("MARKSMAN", "FIGHTER", "GOBLIN")).toEqual({
      hit: 6,
      dies: true,
    });
  });

  it("a Ray Gunner hits a Fighter for 8 at full power and 3 at half; a Marksman for 5", () => {
    expect(ray("MARKSMAN", "FIGHTER", "ORIGINAL", 0).hit).toBe(8);
    expect(ray("MARKSMAN", "FIGHTER", "ORIGINAL", 1).hit).toBe(3);
    expect(human("MARKSMAN", "FIGHTER", "ORIGINAL").hit).toBe(5);
  });

  it("a full-power Tripod kills a Fighter that a Catapult leaves standing, and outhits it on a Guard; at half power it is below it", () => {
    // Fighter (12 HP, Defense 2).
    expect(ray("CATAPULT", "FIGHTER", "ORIGINAL", 0)).toEqual({
      hit: 12,
      dies: true,
    });
    expect(ray("CATAPULT", "FIGHTER", "ORIGINAL", 1)).toEqual({
      hit: 5,
      dies: false,
    });
    expect(human("CATAPULT", "FIGHTER", "ORIGINAL")).toEqual({
      hit: 8,
      dies: false,
    });
    // Guard (17 HP, Defense 1 against a shot from two tiles).
    expect(ray("CATAPULT", "GUARD", "ORIGINAL", 0).hit).toBe(14);
    expect(ray("CATAPULT", "GUARD", "ORIGINAL", 1).hit).toBe(6);
    expect(human("CATAPULT", "GUARD", "ORIGINAL").hit).toBe(10);
  });

  it("a full-power Colossus kills a Champion from two tiles that a Juggernaut's blow leaves standing; at half power it is below it", () => {
    expect(ray("JUGGERNAUT", "SWORDSMAN", "ORIGINAL", 0)).toEqual({
      hit: 15,
      dies: true,
    });
    expect(ray("JUGGERNAUT", "SWORDSMAN", "ORIGINAL", 1)).toEqual({
      hit: 6,
      dies: false,
    });
    expect(human("JUGGERNAUT", "SWORDSMAN", "ORIGINAL", 1)).toEqual({
      hit: 11,
      dies: false,
    });
    // A Fighter (12 HP): both kill it unmoved (16 and 12 by the formula);
    // the half-power ray deals 6.
    expect(ray("JUGGERNAUT", "FIGHTER", "ORIGINAL", 0).dies).toBe(true);
    expect(ray("JUGGERNAUT", "FIGHTER", "ORIGINAL", 1)).toEqual({
      hit: 6,
      dies: false,
    });
    expect(human("JUGGERNAUT", "FIGHTER", "ORIGINAL", 1).dies).toBe(true);
  });

  it("keeps the numbers of the comparison table: Ray Gunner and Tripod unchanged, Colossus Attack 5", () => {
    const numbers = (role: UnitRoleIdV7, faction: FactionIdV7) => {
      const rule = effectiveRoleRuleV7(role, faction);
      return [rule.cost, rule.maxHp, rule.attack2, rule.defense2, rule.move];
    };
    expect(numbers("MARKSMAN", "MARTIAN")).toEqual([4, 8, 6, 2, 1]);
    expect(numbers("MARKSMAN", "ORIGINAL")).toEqual([4, 12, 4, 2, 1]);
    expect(numbers("CATAPULT", "MARTIAN")).toEqual([9, 12, 8, 2, 2]);
    expect(numbers("CATAPULT", "ORIGINAL")).toEqual([8, 10, 6, 1, 1]);
    expect(numbers("JUGGERNAUT", "MARTIAN")).toEqual([null, 32, 10, 5, 2]);
    expect(numbers("JUGGERNAUT", "ORIGINAL")).toEqual([null, 40, 8, 8, 1]);
  });
});
