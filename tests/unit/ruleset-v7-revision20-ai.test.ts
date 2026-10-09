import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CHARGE_APPROACH_PRIORITY_V7,
  CHARGE_BREAKER_PRIORITY_V7,
  CHARGE_CAPTURER_NEAR_VALUE_V7,
  CHARGE_FIELD_DEFENSE_VALUE_V7,
  CHARGE_PUSH_CENTER_PRIORITY_V7,
  CHARGE_PUSH_CENTER_VALUE_V7,
  CHARGE_RUN_UP_CHIP_PRIORITY_V7,
  CHARGE_RUN_UP_KILL_PRIORITY_V7,
  NESTING_RESEARCH_PRIORITY_V7,
  WALLBREAKER_CHARGER_VALUE_V7,
  WALLBREAKER_RESEARCH_PRIORITY_V7,
  growthKillValueV7,
  policySiegeRuleV7,
  policyTacticalRoleV7,
} from "../../src/ai/v7-dinosaur";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  publicProjectedDamageForPolicyV7,
  scoreCommandV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import {
  FACTION_IDS_V7,
  applyCommandV7,
  canonicalHash,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  at,
  fieldDefenseV7,
  fieldV7,
  patchUnitV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// Revision 20 (`pulp_wars-0hi.2`): the Normal AI
// (docs/product/RULESET_7_REVISION_20.md section 7.3). The Triceratops is a
// front-line attacker with Charge!; every Stampede lane heuristic is gone.

const view = (state: GameStateV7) => viewForV7(state, activeIdV7(state));

/**
 * The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur seat against Humans
 * plays the army rules now (tests/unit/ruleset-v7-dinosaur-pass.test.ts),
 * whose committed Moves, attacks, and research have priorities of their
 * own. The priorities of `pulp_wars-0hi.2` are still those of a Dinosaur
 * seat in a match with a faction that plays no army rules: a Candy seat
 * here since step two of the Dwarf pass (`pulp_wars-w49.28`) made the
 * Dwarf seats army seats too (a Dwarf seat before it).
 */
const olderFieldV7: typeof fieldV7 = (pieces, options = {}) =>
  fieldV7(pieces, {
    ...options,
    factions: options.factions ?? ["DINOSAUR", "CANDY"],
  });

/** The scored candidates of the active seat's unit on `where`, best first. */
function candidates(
  state: GameStateV7,
  where: CoordV7,
  kind?: CommandV7["kind"],
): readonly ScoredAiCandidateV7[] {
  const id = unitAtV7(state, where).id;
  return chooseNormalCommandV7(view(state)).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command &&
      candidate.command.unitId === id &&
      (kind === undefined || candidate.command.kind === kind),
  );
}

const endOf = (candidate: ScoredAiCandidateV7): CoordV7 | undefined =>
  candidate.command.kind === "MOVE" ? candidate.command.path.at(-1) : undefined;

describe("ruleset-7 revision-20 Normal AI: no lane heuristics", () => {
  it("has no Stampede or lane code and keeps the Dinosaur helpers on public imports", () => {
    const dinosaur = readFileSync("src/ai/v7-dinosaur.ts", "utf8");
    expect(
      [...dinosaur.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (match) => match[1],
      ),
    ).toEqual([
      "../engine/rules/ruleset-v7",
      "../engine/v7/commands",
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/view",
    ]);
    expect(dinosaur).not.toMatch(
      /GameStateV7|random|Math\.random|Date\.now|STAMPEDE|stampede/,
    );
    const policy = readFileSync("src/ai/v7.ts", "utf8");
    expect(policy).not.toMatch(/STAMPEDE|stampede|[Ll]ane/);
  });

  it("plays the Triceratops as a line unit, whatever its SIEGE label", () => {
    const triceratops = effectiveRoleRuleV7("SWORDSMAN", "DINOSAUR");
    // (The ninth unit, 7r55: it is the heavy line role and labelled so.)
    expect(triceratops.tacticalRole).toBe("LINE");
    expect(policyTacticalRoleV7(triceratops)).toBe("LINE");
    expect(policySiegeRuleV7(triceratops)).toBe(false);
    // `pulp_wars-7g3.4`: the Mammoth (Sweep) and the Boulder Yeti
    // (Boulders) are line units too.
    // (7r55: the Mammoth is the heavy role; the Musk Ox, the new
    // defender, keeps its DEFENDER label.)
    for (const role of ["SWORDSMAN", "CATAPULT"] as const) {
      expect(policyTacticalRoleV7(effectiveRoleRuleV7(role, "ICE_FOLK"))).toBe(
        "LINE",
      );
      expect(policySiegeRuleV7(effectiveRoleRuleV7(role, "ICE_FOLK"))).toBe(
        false,
      );
    }
    // Every other rule keeps its label; the other Catapult roles stay siege.
    for (const faction of FACTION_IDS_V7)
      for (const role of ["FIGHTER", "CATAPULT", "KNIGHT", "GUARD"] as const) {
        const rule = effectiveRoleRuleV7(role, faction);
        if (faction === "ICE_FOLK" && role === "CATAPULT") continue;
        expect(policyTacticalRoleV7(rule)).toBe(rule.tacticalRole);
        expect(policySiegeRuleV7(rule)).toBe(role === "CATAPULT");
      }
  });

  it("never waits for a lane: with a target two tiles away in a straight line it moves next to it", () => {
    // (The older policy, against a Dwarf seat: see `olderFieldV7`.)
    // The revision-19 Stampede position. Now the best command of the
    // Triceratops is a Move that ends next to the Guard.
    const state = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(5, 3) },
    ]);
    const best = candidates(state, at(3, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(CHARGE_APPROACH_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best);
    expect(
      end !== undefined &&
        Math.max(Math.abs(end.x - 5), Math.abs(end.y - 3)) === 1,
    ).toBe(true);
  });
});

describe("ruleset-7 revision-20 Normal AI: Charge! run-up", () => {
  it("prefers the Move with the higher previewed run-up when exposure is equal", () => {
    // (The older policy, against a Dwarf seat: see `olderFieldV7`.)
    // A lone Guard two tiles away: some tiles next to it are one step away
    // (run-up 1) and some two (run-up 2). The exposure next to an
    // unsupported Guard is the same on every one of them.
    const state = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const guard = at(5, 2);
    const moves = candidates(state, at(3, 3), "MOVE").filter(
      (candidate) => candidate.score.priority === CHARGE_APPROACH_PRIORITY_V7,
    );
    const steps = (candidate: ScoredAiCandidateV7): number =>
      candidate.command.kind === "MOVE" ? candidate.command.path.length : 0;
    for (const candidate of moves) {
      const end = endOf(candidate);
      expect(
        end !== undefined &&
          Math.max(Math.abs(end.x - guard.x), Math.abs(end.y - guard.y)) === 1,
      ).toBe(true);
    }
    const toB = moves.filter((candidate) => steps(candidate) === 2);
    const toA = moves.filter((candidate) => steps(candidate) === 1);
    expect(toB.length).toBeGreaterThan(0);
    expect(toA.length).toBeGreaterThan(0);
    // Equal exposure (the safety value); the longer run-up scores higher.
    const safety = new Set(
      [...toA, ...toB].map((candidate) => candidate.score.safetyValue),
    );
    expect(safety.size).toBe(1);
    expect(
      Math.min(...toB.map((candidate) => candidate.score.strategicValue)),
    ).toBeGreaterThan(
      Math.max(...toA.map((candidate) => candidate.score.strategicValue)),
    );
    // The best command of the Triceratops is a two-tile Move next to it.
    const best = candidates(state, at(3, 3))[0];
    expect(toB.map((candidate) => candidate.command)).toContainEqual(
      best?.command,
    );
    // After that Move the attack is offered and previewed with the run-up.
    if (best === undefined) throw new Error("no candidate");
    const moved = applyCommandV7(state, activeIdV7(state), best.command);
    if (!moved.accepted) throw new Error("move rejected");
    const end = endOf(best);
    if (end === undefined) throw new Error("no end");
    const attack = candidates(moved.state, end, "ATTACK")[0];
    expect(attack?.command).toMatchObject({
      kind: "ATTACK",
      targetUnitId: unitAtV7(state, guard).id,
    });
    expect(
      queryCombatPreviewV7(
        view(moved.state),
        unitAtV7(moved.state, end).id,
        unitAtV7(state, guard).id,
      ),
    ).toMatchObject({ runUp: 2, attack2: 10 });
  });

  it("steps around an adjacent target when the run-up makes the Charge better", () => {
    // (The older policy, against a Dwarf seat: see `olderFieldV7`.)
    // Unmoved, the Charge deals 8 to the Fighter; after one tile it kills.
    const kill = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
    ]);
    const stepToKill = candidates(kill, at(3, 3))[0];
    expect(stepToKill?.command.kind).toBe("MOVE");
    expect(stepToKill?.score.priority).toBe(CHARGE_RUN_UP_KILL_PRIORITY_V7);
    // Against a Guard the run-up only adds damage: just above a chip attack.
    const chip = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(4, 3) },
    ]);
    const all = candidates(chip, at(3, 3));
    expect(all[0]?.command.kind).toBe("MOVE");
    expect(all[0]?.score.priority).toBe(CHARGE_RUN_UP_CHIP_PRIORITY_V7);
    expect(
      all.find((candidate) => candidate.command.kind === "ATTACK")?.score
        .priority,
    ).toBe(900);
    // A Triceratops that has moved attacks at once (no second Move exists).
    const moved = patchUnitV7(chip, at(3, 3), {
      activation: {
        ...unitAtV7(chip, at(3, 3)).activation,
        moved: true,
        movedPathLength: 1,
        handled: true,
      },
    });
    expect(candidates(moved, at(3, 3))[0]?.command.kind).toBe("ATTACK");
  });

  it("does not take a run-up tile inside visible lethal reach", () => {
    const state = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3), hp: 4 },
      { seat: 1, role: "GUARD", at: at(6, 3) },
      { seat: 1, role: "KNIGHT", at: at(7, 3) },
      { seat: 1, role: "KNIGHT", at: at(7, 2) },
    ]);
    expect(
      candidates(state, at(3, 3), "MOVE").some(
        (candidate) => candidate.score.priority >= CHARGE_APPROACH_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("ruleset-7 revision-20 Normal AI: Charge! attacks", () => {
  it("values Field Defense destroyed on a fortified target", () => {
    // Two equal Guards next to the Triceratops; one stands on Field Defense
    // in its own territory. The preview already ignores the fortification,
    // so the damage is the same and the fortified one is worth more.
    // Round 12: since the Triceratops captures (`pulp_wars-ke95`), the
    // opening's villages first (ten rounds) holds its non-lethal attacks
    // after a Move.
    const fortified = fieldDefenseV7(
      fieldV7([
        {
          seat: 0,
          role: "SWORDSMAN",
          at: at(4, 8),
          activation: { moved: true, movedPathLength: 2, handled: true },
        },
        { seat: 1, role: "GUARD", at: at(3, 7) },
        { seat: 1, role: "GUARD", at: at(5, 9) },
      ]),
      at(3, 7),
    );
    const state = { ...fortified, round: 12 };
    const attacks = candidates(state, at(4, 8), "ATTACK");
    expect(attacks.map((candidate) => candidate.command)).toEqual([
      {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(4, 8)).id,
        targetUnitId: unitAtV7(state, at(3, 7)).id,
      },
      {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(4, 8)).id,
        targetUnitId: unitAtV7(state, at(5, 9)).id,
      },
    ]);
    expect(attacks[0]?.score.priority).toBe(CHARGE_BREAKER_PRIORITY_V7);
    expect(attacks[1]?.score.priority).toBe(900);
    expect(
      (attacks[0]?.score.strategicValue ?? 0) -
        (attacks[1]?.score.strategicValue ?? 0),
    ).toBe(CHARGE_FIELD_DEFENSE_VALUE_V7);
    // The same damage on both: the fortification is ignored.
    expect(attacks[0]?.score.immediateValue).toBe(
      attacks[1]?.score.immediateValue,
    );
  });

  it("pushes a defender off a hostile center, at once when an own capturer is near", () => {
    // (The older policy, against a Dwarf seat: see `olderFieldV7`.)
    const center = at(2, 8);
    const with_ = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 8) },
      { seat: 0, role: "FIGHTER", at: at(4, 8) },
      { seat: 1, role: "GUARD", at: center },
    ]);
    const push = candidates(with_, at(3, 8))[0];
    expect(push?.command).toEqual({
      kind: "ATTACK",
      unitId: unitAtV7(with_, at(3, 8)).id,
      targetUnitId: unitAtV7(with_, center).id,
    });
    expect(push?.score.priority).toBe(CHARGE_PUSH_CENTER_PRIORITY_V7);
    expect(
      queryCombatPreviewV7(
        view(with_),
        unitAtV7(with_, at(3, 8)).id,
        unitAtV7(with_, center).id,
      ),
    ).toMatchObject({ push: "WILL_PUSH", advances: true, defenderDies: false });
    // The whole turn's decision is that Charge.
    expect(chooseNormalCommandV7(view(with_)).command).toEqual(push?.command);
    const without = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 8) },
      { seat: 1, role: "GUARD", at: center },
    ]);
    const alone = candidates(without, at(3, 8), "ATTACK")[0];
    expect(alone?.score.priority).toBe(900);
    expect(
      (push?.score.strategicValue ?? 0) - (alone?.score.strategicValue ?? 0),
    ).toBe(CHARGE_CAPTURER_NEAR_VALUE_V7);
    // The push itself is worth CHARGE_PUSH_CENTER_VALUE_V7 over the same
    // attack on open ground.
    const open = olderFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(4, 3) },
    ]);
    expect(
      (alone?.score.strategicValue ?? 0) -
        (candidates(open, at(3, 3), "ATTACK")[0]?.score.strategicValue ?? 0),
    ).toBe(CHARGE_PUSH_CENTER_VALUE_V7);
  });

  it("declines a Charge that leaves the Triceratops to die for no gain", () => {
    // The Guard is pushed and the Triceratops follows onto (4, 3), inside
    // the reach of three Marksmen that cannot hit it where it stands.
    const exposed = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(4, 3) },
      { seat: 1, role: "MARKSMAN", at: at(7, 2) },
      { seat: 1, role: "MARKSMAN", at: at(7, 3) },
      { seat: 1, role: "MARKSMAN", at: at(7, 4) },
    ]);
    const charge: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAtV7(exposed, at(3, 3)).id,
      targetUnitId: unitAtV7(exposed, at(4, 3)).id,
    };
    // It is offered and legal, and the policy does not take it.
    expect(queryPlayerCommandsV7(view(exposed))).toContainEqual(charge);
    expect(
      queryCombatPreviewV7(view(exposed), charge.unitId, charge.targetUnitId),
    ).toMatchObject({ push: "WILL_PUSH", advances: true, attackerDies: false });
    expect(candidates(exposed, at(3, 3), "ATTACK")).toEqual([]);
    // Without the Marksmen the same Charge is a candidate.
    const safe = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(4, 3) },
    ]);
    expect(candidates(safe, at(3, 3), "ATTACK")).toHaveLength(1);
    // A kill worth more than the Triceratops is still taken.
    const prize = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(3, 3), hp: 8 },
      { seat: 1, role: "JUGGERNAUT", at: at(4, 3), hp: 1 },
      { seat: 1, role: "MARKSMAN", at: at(7, 2) },
      { seat: 1, role: "MARKSMAN", at: at(7, 3) },
      { seat: 1, role: "MARKSMAN", at: at(7, 4) },
    ]);
    expect(candidates(prize, at(3, 3), "ATTACK")).toHaveLength(1);
  });
});

describe("ruleset-7 revision-20 Normal AI: Promotion and growth", () => {
  it("promotes a wounded eligible unit before it attacks or ends its turn", () => {
    for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const) {
      const base = fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(3, 3), hp: 3 },
          { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 2 },
        ],
        { factions: [faction, faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL"] },
      );
      const wounded = patchUnitV7(base, at(3, 3), { kills: 3 });
      const order = candidates(wounded, at(3, 3));
      expect(order[0]?.command, faction).toEqual({
        kind: "PROMOTE",
        unitId: unitAtV7(wounded, at(3, 3)).id,
      });
      // Above the kill it could make (1180) and above a capture (1400).
      expect(order[0]?.score.priority).toBe(1410);
      expect(order.some((item) => item.command.kind === "ATTACK")).toBe(true);
      expect(chooseNormalCommandV7(view(wounded)).command).toEqual(
        order[0]?.command,
      );
      // At full HP the Promotion keeps its revision-19 priority.
      const healthy = patchUnitV7(base, at(3, 3), {
        kills: 3,
        hp: unitAtV7(base, at(3, 3)).maxHp,
      });
      expect(candidates(healthy, at(3, 3))[0]?.score.priority).toBe(1320);
    }
  });

  it("values a growth kill by the HP it restores", () => {
    const state = fieldV7([
      { seat: 0, role: "KNIGHT", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(9, 3) },
    ]);
    const tRex = (hp: number, kills = 0) => {
      const grown = withKillsV7(state, at(3, 3), kills, hp);
      const unit = view(grown).units.find((item) => sameV7(item.at, at(3, 3)));
      if (unit === undefined) throw new Error("unit missing");
      return growthKillValueV7(view(grown), unit);
    };
    // The missing HP plus the stage's 4, at 5 per 2 HP.
    expect(tRex(28)).toBe(10);
    expect(tRex(18)).toBe(35);
    expect(tRex(8)).toBe(60);
    // Alpha adds its Attack; a kill that reaches no stage is worth nothing.
    expect(tRex(32, 2)).toBe(16);
    expect(tRex(12, 2)).toBe(66);
    expect(tRex(20, 1)).toBe(0);
    expect(tRex(20, 3)).toBe(0);
    // In the attack score: the same kill by a wounded T-Rex is worth more.
    const kill = (hp: number): number => {
      const fight = fieldV7([
        { seat: 0, role: "KNIGHT", at: at(3, 3), hp },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
      ]);
      return scoreCommandV7(view(fight), {
        kind: "ATTACK",
        unitId: unitAtV7(fight, at(3, 3)).id,
        targetUnitId: unitAtV7(fight, at(4, 3)).id,
      }).strategicValue;
    };
    expect(kill(18) - kill(28)).toBe(25);
  });
});

describe("ruleset-7 revision-20 Normal AI: research and production", () => {
  const research = (state: GameStateV7, tech: string) =>
    chooseNormalCommandV7(view(state)).candidates.find(
      (candidate) =>
        candidate.command.kind === "RESEARCH" &&
        candidate.command.tech === tech,
    );

  it("values Nesting for its slot, ahead of the next role technology in a crowded city", () => {
    // (The older policy, against a Dwarf seat: see `olderFieldV7`.)
    const techs = withoutTechsV7("DINOSAUR", "FORTIFICATION");
    const crowded = olderFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(6, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: techs } },
    );
    const nesting = research(crowded, "FORTIFICATION");
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): Nesting is also
    // the last step to the Ankylosaurus, which a seat outside the army
    // policy researches at 1,165 (`defenderLastStepResearchV7`), above the
    // slot's own priority; the larger of the two values stands.
    expect(NESTING_RESEARCH_PRIORITY_V7).toBe(1062);
    expect(nesting?.score.priority).toBe(1165);
    // One slot per owned city, plus the Egg effects, is the lower bound.
    expect(nesting?.score.strategicValue).toBeGreaterThanOrEqual(4 * 1 + 4);
    const roomy = olderFieldV7([{ seat: 1, role: "FIGHTER", at: at(1, 1) }], {
      techs: { 0: techs },
    });
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): with room, Nesting
    // is the next role technology (the Ankylosaurus is laid with it), at
    // the same last step to the defender (1040, the ordinary priority,
    // when it gave no unit).
    expect(research(roomy, "FORTIFICATION")?.score.priority).toBe(1165);
    // A Human seat values its Fortification as before.
    const human = olderFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(6, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["ORIGINAL", "DINOSAUR"],
        techs: { 0: withoutTechsV7("ORIGINAL", "FORTIFICATION") },
      },
    );
    expect(research(human, "FORTIFICATION")?.score.priority).not.toBe(
      NESTING_RESEARCH_PRIORITY_V7,
    );
  });

  it("values Wallbreaker when a visible hostile city has Walls and it owns a dinosaur to use it", () => {
    const walled = (attacker: "KNIGHT" | "SWORDSMAN" | "FIGHTER") =>
      walledV7({
        // (The older policy, against a Candy seat: see `olderFieldV7`.)
        defenderFaction: "CANDY",
        attackers: [{ role: attacker, at: at(4, 4) }],
        attackerTechs: withoutTechsV7("DINOSAUR", "EXPLOSIVES"),
      });
    const withTRex = research(walled("KNIGHT"), "EXPLOSIVES");
    expect(withTRex?.score.priority).toBe(WALLBREAKER_RESEARCH_PRIORITY_V7);
    expect(withTRex?.score.strategicValue).toBe(8);
    // A Triceratops already ignores Walls, and since the Dinosaur pass
    // (`pulp_wars-w49.15`) Wallbreaker is the second tile of its run-up; a
    // Caveman uses neither.
    const withTriceratops = research(walled("SWORDSMAN"), "EXPLOSIVES");
    expect(withTriceratops?.score.priority).toBe(
      WALLBREAKER_RESEARCH_PRIORITY_V7,
    );
    expect(withTriceratops?.score.strategicValue).toBe(
      WALLBREAKER_CHARGER_VALUE_V7,
    );
    expect(research(walled("FIGHTER"), "EXPLOSIVES")?.score.priority).toBe(
      1040,
    );
    // No visible Walls: the ordinary value.
    const plain = olderFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(4, 4) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      { techs: { 0: withoutTechsV7("DINOSAUR", "EXPLOSIVES") } },
    );
    expect(research(plain, "EXPLOSIVES")?.score.priority).toBe(1040);
  });

  it("counts the Nesting slot when it lays Eggs", () => {
    // Three Cavemen fill a level-1 capital without Nesting (3 slots); with
    // Nesting (4 slots) a one-slot Egg is laid.
    const pieces = [
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
      { seat: 0, role: "FIGHTER", at: at(6, 7) },
      { seat: 0, role: "FIGHTER", at: at(6, 8) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ] as const;
    const production = (state: GameStateV7) =>
      chooseNormalCommandV7(view(state))
        .candidates.map((candidate) => candidate.command)
        .filter(
          (command) => command.kind === "LAY_EGG" || command.kind === "TRAIN",
        );
    expect(
      production(
        fieldV7(pieces, {
          techs: { 0: withoutTechsV7("DINOSAUR", "FORTIFICATION") },
        }),
      ),
    ).toEqual([]);
    const laid = production(fieldV7(pieces));
    expect(laid).toHaveLength(1);
    expect(laid[0]).toMatchObject({ kind: "LAY_EGG" });
  });
});

describe("ruleset-7 revision-20 Normal AI: against Dinosaurs", () => {
  it("includes the run-up in the threat estimate of a visible Triceratops", () => {
    // A Human Guard (15 HP, Defense 3) weighs tiles 3, 2, and 1 tiles from a
    // hostile Triceratops: Attack 5, 4, and 3 (sections 2.5 rows 5, 4, 3).
    for (const [from, to, damage] of [
      [7, 6, 14],
      [6, 5, 10],
      [5, 4, 7],
    ] as const) {
      const state = fieldV7(
        [
          { seat: 0, role: "GUARD", at: at(from, 3) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
        ],
        { factions: ["ORIGINAL", "DINOSAUR"] },
      );
      expect(
        scoreCommandV7(view(state), {
          kind: "MOVE",
          unitId: unitAtV7(state, at(from, 3)).id,
          path: [at(to, 3)],
        }).safetyValue,
      ).toBe(-damage);
    }
    // Four tiles away it is out of reach (Move 2, then melee).
    const far = fieldV7(
      [
        { seat: 0, role: "GUARD", at: at(8, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(
      scoreCommandV7(view(far), {
        kind: "MOVE",
        unitId: unitAtV7(far, at(8, 3)).id,
        path: [at(7, 3)],
      }).safetyValue,
    ).toBe(0);
  });

  it("does not rely on Walls or Field Defense against a Triceratops, or on Walls against a dinosaur", () => {
    // The Human seat's Guard on its Walled center with Field Defense,
    // estimated from the Human seat's public view.
    const estimate = (
      role: "SWORDSMAN" | "KNIGHT" | "RAIDER" | "FIGHTER",
      attackerFaction: FactionIdV7,
    ): number => {
      const dinosaurTurn = walledV7({
        attackers: [{ role, at: at(7, 8) }],
        attackerFaction,
        fieldDefense: true,
      });
      const state = checkedV7({
        ...dinosaurTurn,
        activeSeatIndex: dinosaurTurn.turnOrder.indexOf(
          seatIdV7(dinosaurTurn, 0),
        ),
      });
      const own = view(state);
      const find = (where: CoordV7) => {
        const unit = own.units.find((item) => sameV7(item.at, where));
        if (unit === undefined) throw new Error("unit missing");
        return unit;
      };
      return publicProjectedDamageForPolicyV7(
        own,
        find(at(7, 8)),
        find(at(8, 8)),
        at(8, 8),
      );
    };
    // Triceratops: no fortification at all (section 2.5: 7).
    expect(estimate("SWORDSMAN", "DINOSAUR")).toBe(7);
    // T-Rex and Raptor: the Walls are assumed ignored (another seat's
    // research is not public); the Field Defense level stays (section 4.2).
    expect(estimate("KNIGHT", "DINOSAUR")).toBe(9);
    expect(estimate("RAIDER", "DINOSAUR")).toBeGreaterThan(
      estimate("RAIDER", "ORIGINAL"),
    );
    // A Caveman and every non-Dinosaur attacker face the full level 3.
    expect(estimate("FIGHTER", "DINOSAUR")).toBe(
      estimate("FIGHTER", "ORIGINAL"),
    );
    // Tuning 3 (`pulp_wars-w49.3`): the Human Knight has Attack 4 (5 at 3).
    expect(estimate("KNIGHT", "ORIGINAL")).toBe(7);
  });

  it("values killing a wounded dinosaur before its next kill fully heals it", () => {
    const kill = (hp: number): number => {
      const state = patchUnitV7(
        fieldV7(
          [
            { seat: 0, role: "KNIGHT", at: at(3, 3) },
            { seat: 1, role: "KNIGHT", at: at(4, 3) },
          ],
          { factions: ["ORIGINAL", "DINOSAUR"] },
        ),
        at(4, 3),
        { hp },
      );
      const score = scoreCommandV7(view(state), {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(3, 3)).id,
        targetUnitId: unitAtV7(state, at(4, 3)).id,
      });
      expect(
        queryCombatPreviewV7(
          view(state),
          unitAtV7(state, at(3, 3)).id,
          unitAtV7(state, at(4, 3)).id,
        )?.defenderDies,
      ).toBe(true);
      return score.strategicValue;
    };
    // The target's own value falls with its HP (1 per HP); the growth it is
    // denied rises faster (half of 5 per 2 missing HP).
    const weak = kill(2);
    const weaker = kill(1);
    expect(weaker).toBeGreaterThanOrEqual(weak);
  });
});

describe("ruleset-7 revision-20 Normal AI: determinism and bounds", () => {
  it("decides identically for equal views and offers only accepted commands", () => {
    const state = fieldDefenseV7(
      fieldV7([
        { seat: 0, role: "SWORDSMAN", at: at(4, 6) },
        { seat: 0, role: "KNIGHT", at: at(5, 6), hp: 9 },
        { seat: 0, role: "RAIDER", at: at(6, 6) },
        { seat: 0, role: "CAPTAIN", at: at(6, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "MARKSMAN", at: at(1, 6) },
      ]),
      at(3, 7),
    );
    const first = chooseNormalCommandV7(view(state));
    const second = chooseNormalCommandV7(view(structuredClone(state)));
    expect(canonicalHash(second)).toBe(canonicalHash(first));
    for (const candidate of first.candidates)
      expect(
        applyCommandV7(state, activeIdV7(state), candidate.command).accepted,
        JSON.stringify(candidate.command),
      ).toBe(true);
    expect(NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7).toBe(128);
  });

  const PAIRINGS = FACTION_IDS_V7.flatMap((left) =>
    FACTION_IDS_V7.map((right) => [left, right] as const),
  );

  it.each(PAIRINGS)(
    "plays %s against %s without a stall, a policy error, or an over-long turn",
    (left, right) => {
      const setup = {
        ...goblinSetupV7([left, right], 4),
        mapType: "PANGEA" as const,
      };
      const match = runAiMatchV7(setup, {
        maxRounds: 30,
        recordCheckpointHashes: false,
      });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(
        match.commandLog.some(
          (record) => (record.command.kind as string) === "STAMPEDE",
        ),
      ).toBe(false);
      // At most 128 commands in one owner turn.
      let run = 0;
      for (const record of match.commandLog) {
        run = record.command.kind === "END_TURN" ? 0 : run + 1;
        expect(run).toBeLessThanOrEqual(
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        );
      }
    },
    600_000,
  );
});
