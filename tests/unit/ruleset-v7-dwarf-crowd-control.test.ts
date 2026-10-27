import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  NINTH_WHIRL_FRIENDLY_COST_V7,
  NINTH_WHIRL_NEIGHBOUR_COST_V7,
  NINTH_WHIRL_TARGET_VALUE_V7,
  whirlMoveValueV7,
} from "../../src/ai/v7-ninth-unit";
import { whirlFriendlyWarningsV7 } from "../../src/render/dwarf-presentation-v7";
import {
  BARRICADE_CAP_V7,
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  barricadeDamageV7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewAttackBarricadeV7,
  previewBuildBarricadeV7,
  previewTendWoundedV7,
  previewWhirlV7,
  projectEventsV7,
  queryBarricadeUnavailableReasonV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  reachablePlayerMovementPathsV7,
  roleMechanicsV7,
  viewForV7,
  type BarricadeV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { withEggsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  bombV7,
  dwarfFieldV7,
  offeredOfV7,
  refusalV7,
  tunnelV7,
} from "../fixtures/v7-dwarf";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { playV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  kindsV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// Dwarf crowd control (`pulp_wars-w49.33`; docs/product/RULESET_7_CURRENT.md
// sections 22.5, 22.8, and 22.15; docs/product/RULESET_7_DWARVES.md
// sections 6.2 and 9.3): the Whirligig's Whirl (which replaced Three
// Hammers) and the Engineer's Barricade (the Bomb Run landing of this
// bead was replaced by the Gyrocopter pass, `pulp_wars-w49.44`). The field is tests/fixtures/v7-dwarf.ts: an
// 11 x 11 board, seat 0 (Dwarf) capital (8, 8) with territory x 7-9,
// y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
// (5, 5), (8, 5), (5, 8); open Grass elsewhere; every technology, 100
// Coins, and every tile explored.

const W = at(5, 3);

function whirled(
  events: readonly DomainEventV7[],
): Extract<DomainEventV7, { kind: "WHIRL_RESOLVED" }> {
  const event = events.find((item) => item.kind === "WHIRL_RESOLVED");
  if (event?.kind !== "WHIRL_RESOLVED") throw new Error("no Whirl");
  return event;
}

/** The (no longer offered) `WHIRL` command of the unit on `where`. */
function whirlOf(state: GameStateV7, where: CoordV7): CommandV7 {
  return { kind: "WHIRL", unitId: unitAtV7(state, where).id };
}

/** The `ATTACK` of the unit on `from` on the unit on `to`. */
function attackOf(state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 {
  return {
    kind: "ATTACK",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  };
}

/**
 * Plays an offered attack of the Whirligig on `where` (on `target`, or its
 * first offered one), a Whirl, whose public preview must equal the result.
 */
function whirl(
  state: GameStateV7,
  where: CoordV7,
  target?: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const unitId = unitAtV7(state, where).id;
  const preview = previewWhirlV7(viewForV7(state, activeIdV7(state)), unitId);
  if (preview === null) throw new Error("no Whirl preview");
  const command =
    target === undefined
      ? offeredOfV7(state, where, "ATTACK")[0]
      : attackOf(state, where, target);
  if (command === undefined) throw new Error("no attack offered");
  expect(offeredOfV7(state, where, "ATTACK")).toContainEqual(command);
  const result = playV7(state, command);
  expect(preview.exact).toBe(true);
  expect(
    preview.targets.map((entry) => ({
      unitId: entry.unitId,
      at: entry.at,
      damage: entry.damage,
      dies: entry.dies,
      shieldDamage: entry.shieldDamage,
    })),
  ).toEqual(whirled(result.events).results);
  return result;
}

/** The ordinary attack's damage of the unit on `from` on the unit on `to`. */
function attackDamage(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const preview = estimateCombatV7(
    state,
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (preview === null) throw new Error("no estimate");
  return {
    damage: preview.damageToDefender,
    shieldDamage: preview.defenderShieldDamage,
  };
}

/** The offered Move of the unit on `from` that ends on `to`. */
function moveTo(state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 {
  const command = offeredOfV7(state, from, "MOVE").find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.path.at(-1)?.x === to.x &&
      candidate.path.at(-1)?.y === to.y,
  );
  if (command === undefined) throw new Error(`no Move to ${to.x},${to.y}`);
  return command;
}

const unitOn = (state: GameStateV7, where: CoordV7) =>
  state.units.find((unit) => unit.at.x === where.x && unit.at.y === where.y);

function withBarricades(
  state: GameStateV7,
  entries: readonly { at: CoordV7; seat: number; hp?: number }[],
): GameStateV7 {
  return checkedV7({
    ...state,
    barricades: [
      ...state.barricades,
      ...entries.map((entry): BarricadeV7 => ({
        at: entry.at,
        ownerId: seatIdV7(state, entry.seat),
        hp: entry.hp ?? BARRICADE_HP_V7,
      })),
    ].sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x),
  });
}

/**
 * The active seat plays its turn with the Normal policy; each command with
 * the state it was chosen in.
 */
function policyTurnSteps(
  start: GameStateV7,
): readonly { readonly state: GameStateV7; readonly command: CommandV7 }[] {
  const actor = activeIdV7(start);
  const steps: { state: GameStateV7; command: CommandV7 }[] = [];
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
    expect(queryPlayerCommandsV7(view), command.kind).toContainEqual(command);
    steps.push({ state, command });
    if (command.kind === "END_TURN") return steps;
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

/** The active seat plays its turn with the Normal policy; the commands. */
function policyTurn(start: GameStateV7): readonly CommandV7[] {
  return policyTurnSteps(start).map((step) => step.command);
}

// ------------------------------------------------------------- Whirl ---

describe("the Whirligig's Whirl is its attack (section 22.15, pulp_wars-befg)", () => {
  it("replaces Three Hammers and the WHIRL command: one attack a turn, 18 HP, Defense 2", () => {
    const mechanics = roleMechanicsV7("KNIGHT", "DWARF");
    expect(mechanics.whirl).toBe(true);
    expect("attacksPerTurn" in mechanics).toBe(false);
    expect(roleMechanicsV7("KNIGHT", "ORIGINAL").whirl).toBe(false);
    const rule = effectiveRoleRuleV7("KNIGHT", "DWARF");
    expect(rule).toMatchObject({
      label: "Whirligig",
      maxHp: 18,
      attack2: 6,
      defense2: 4,
      move: 3,
    });
    expect(rule.abilities).toEqual(["ATTACK", "CAPTURE", "CLOCKWORK"]);
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect("struckThisTurn" in state.ninthUnit).toBe(false);
    expect(unitAtV7(state, W)).toMatchObject({ hp: 18, maxHp: 18 });
    // The command kind stays parseable (its ordinal), but is never offered
    // and always refused: the Whirl is the ATTACK.
    expect(parseCommandV7({ kind: "WHIRL", unitId: 5 })).toEqual({
      ok: true,
      value: { kind: "WHIRL", unitId: 5 },
    });
    expect(offeredOfV7(state, W, "WHIRL")).toEqual([]);
    expect(refusalV7(state, whirlOf(state, W))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "KNIGHT" },
    });
    expect(offeredOfV7(state, W, "ATTACK")).toHaveLength(1);
  });

  it("hits every unit next to it at once, friend and foe, unanswered, and never advances", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 3 },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 1, role: "MARKSMAN", at: at(6, 4) },
      // Its own unit next to it is hit too; an enemy two tiles away is not.
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
    ]);
    const top = unitAtV7(state, W);
    const expected = [at(4, 2), at(5, 2), at(4, 4), at(6, 4)].map((where) => {
      const unit = unitAtV7(state, where);
      const hit = attackDamage(state, W, where);
      return {
        unitId: unit.id,
        at: where,
        damage: hit.damage,
        dies: hit.damage >= unit.hp,
        shieldDamage: hit.shieldDamage,
      };
    });
    expect(expected[0]?.dies).toBe(true);
    expect(expected[2]?.damage).toBeGreaterThan(0);
    // Whichever enemy next to it is the target, the same units are hit.
    for (const target of [at(5, 2), at(6, 4)]) {
      const result = whirl(state, W, target);
      expect(whirled(result.events)).toEqual({
        kind: "WHIRL_RESOLVED",
        playerId: activeIdV7(state),
        unitId: top.id,
        at: W,
        results: expected,
      });
    }
    const result = whirl(state, W);
    // No exchange: nothing struck back, nobody advanced, the kill counts.
    expect(kindsV7(result.events)).not.toContain("COMBAT_RESOLVED");
    expect(unitAtV7(result.state, W)).toMatchObject({
      id: top.id,
      hp: top.hp,
      kills: 1,
      activation: { attacked: true, attacksUsed: 1, handled: true },
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(4, 2)).id,
      cause: "ATTACK",
    });
    expect(unitOn(result.state, at(4, 2))).toBeUndefined();
    for (const [index, where] of [at(5, 2), at(4, 4), at(6, 4)].entries())
      expect(unitAtV7(result.state, where).hp).toBe(
        unitAtV7(state, where).hp - (expected[index + 1]?.damage ?? 0),
      );
    expect(unitAtV7(result.state, at(7, 3)).hp).toBe(
      unitAtV7(state, at(7, 3)).hp,
    );
    // One primary action: no second attack, no Move.
    for (const kind of ["ATTACK", "MOVE"] as const)
      expect(offeredOfV7(result.state, W, kind), kind).toEqual([]);
    expect(
      refusalV7(result.state, attackOf(result.state, W, at(5, 2))),
    ).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: top.id },
    });
  });

  it("is previewed as unanswered, with every unit it hits and the friendly ones marked", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const attacker = unitAtV7(state, W);
    const target = unitAtV7(state, at(5, 2));
    const combat = queryCombatPreviewV7(view, attacker.id, target.id);
    expect(combat).toMatchObject({
      damageToAttacker: 0,
      attackerDies: false,
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
    });
    const preview = previewWhirlV7(view, attacker.id);
    const own = unitAtV7(state, at(4, 4));
    expect(
      preview?.targets.map((entry) => [entry.unitId, entry.friendly]),
    ).toEqual([
      [target.id, false],
      [own.id, true],
    ]);
    expect(preview).toMatchObject({
      kills: 0,
      friendlyHits: 1,
      friendlyKills: 0,
    });
    if (preview === null) throw new Error("no Whirl preview");
    const ownHit = preview.targets[1];
    expect(ownHit?.damage).toBe(attackDamage(state, W, at(4, 4)).damage);
    expect(whirlFriendlyWarningsV7(view, preview)).toEqual([
      `Also hits your Hammerer: −${ownHit?.damage}`,
    ]);
    // Not a preview for another unit, nor for a Whirligig without an attack.
    expect(previewWhirlV7(view, own.id)).toBeNull();
    const alone = dwarfFieldV7([{ seat: 0, role: "KNIGHT", at: W }]);
    expect(
      previewWhirlV7(
        viewForV7(alone, activeIdV7(alone)),
        unitAtV7(alone, W).id,
      ),
    ).toBeNull();
  });

  it("credits only its hostile kills: an own unit it kills is a loss and nobody's kill", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 2 },
      { seat: 0, role: "FIGHTER", at: at(4, 4), hp: 2 },
    ]);
    const actor = activeIdV7(state);
    const coins = (s: GameStateV7) =>
      s.players.find((player) => player.id === actor)?.coins;
    const own = unitAtV7(state, at(4, 4));
    const result = whirl(state, W);
    const hits = whirled(result.events).results;
    expect(hits.every((entry) => entry.dies)).toBe(true);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: own.id,
      cause: "ATTACK",
    });
    expect(unitOn(result.state, at(4, 4))).toBeUndefined();
    // One kill (the enemy Fighter), not two.
    expect(unitAtV7(result.state, W).kills).toBe(1);
    const onlyOwn = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 4), hp: 2 },
    ]);
    const lost = whirl(onlyOwn, W);
    expect(unitOn(lost.state, at(4, 4))).toBeUndefined();
    expect(unitAtV7(lost.state, W).kills).toBe(0);
    expect(coins(lost.state)).toBe(coins(onlyOwn));
  });

  it("may follow a Move; one attack a turn", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 6) },
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const moved = playV7(state, moveTo(state, at(4, 6), at(4, 3)));
    const result = whirl(moved.state, at(4, 3));
    expect(whirled(result.events).results.map((entry) => entry.at)).toEqual([
      at(3, 2),
      at(5, 2),
    ]);
    expect(offeredOfV7(result.state, at(4, 3), "ATTACK")).toEqual([]);
  });

  it("needs an enemy next to it and land form", () => {
    const alone = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 1) },
    ]);
    // Its own unit next to it is no target.
    expect(offeredOfV7(alone, W, "ATTACK")).toEqual([]);
    expect(refusalV7(alone, attackOf(alone, W, at(5, 2))).code).toBe(
      "TARGET_ALLIED",
    );
    const afloat = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 1), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { water: [at(5, 1)] },
    );
    expect(offeredOfV7(afloat, at(5, 1), "ATTACK")).toEqual([]);
    expect(refusalV7(afloat, attackOf(afloat, at(5, 1), at(5, 2)))).toEqual({
      code: "ATTACK_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
  });

  it("hits flyers, Eggs, and units afloat as the attack formula allows", () => {
    const martian = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: W },
        // A Saucer (a flyer, Shield 2) and a Grunt afloat.
        { seat: 1, role: "RAIDER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), form: "EMBARKED" },
      ],
      { factions: ["DWARF", "MARTIAN"], water: [at(6, 2)] },
    );
    const hits = whirled(whirl(martian, W).events).results;
    expect(hits.map((entry) => entry.at)).toEqual([at(4, 2), at(6, 2)]);
    expect(hits[0]?.shieldDamage).toBeGreaterThan(0);
    for (const [index, where] of [at(4, 2), at(6, 2)].entries())
      expect({
        damage: hits[index]?.damage,
        shieldDamage: hits[index]?.shieldDamage,
      }).toEqual(attackDamage(martian, W, where));
    const nest = withEggsV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "KNIGHT", at: at(4, 6) },
          { seat: 1, role: "FIGHTER", at: at(4, 5) },
        ],
        { factions: ["DWARF", "DINOSAUR"] },
      ),
      // A Raptor's Egg.
      [{ seat: 1, role: "RAIDER", at: at(3, 7) }],
    );
    const eggHit = whirled(whirl(nest, at(4, 6), at(4, 5)).events).results;
    expect(eggHit.map((entry) => entry.at)).toEqual([at(4, 5), at(3, 7)]);
    expect(eggHit[1]).toMatchObject(attackDamage(nest, at(4, 6), at(3, 7)));
  });

  it("strikes at full strength however damaged (clockwork), and Armoured and Plated apply", () => {
    const pieces = (hp?: number) => [
      { seat: 0, role: "KNIGHT" as const, at: W, ...(hp ? { hp } : {}) },
      // An Ankylosaurus (Armoured).
      { seat: 1, role: "GUARD" as const, at: at(5, 2) },
    ];
    const fresh = dwarfFieldV7(pieces(), { factions: ["DWARF", "DINOSAUR"] });
    const wounded = dwarfFieldV7(pieces(3), {
      factions: ["DWARF", "DINOSAUR"],
    });
    const full = whirled(whirl(fresh, W).events).results[0];
    const hurt = whirled(whirl(wounded, W).events).results[0];
    expect(hurt?.damage).toBe(full?.damage);
    expect(full).toMatchObject(attackDamage(fresh, W, at(5, 2)));
    expect(
      estimateCombatV7(
        fresh,
        unitAtV7(fresh, W).id,
        unitAtV7(fresh, at(5, 2)).id,
      )?.defenderArmoured,
    ).toBe(true);
  });

  it("draws no Shock Field and no Frostbite", () => {
    const trooper = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: W },
        // A Shielded Shock Trooper.
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
      ],
      { factions: ["DWARF", "MARTIAN"] },
    );
    const view = viewForV7(trooper, activeIdV7(trooper));
    expect(
      queryCombatPreviewV7(
        view,
        unitAtV7(trooper, W).id,
        unitAtV7(trooper, at(5, 2)).id,
      )?.shockDamage,
    ).toBe(0);
    const shocked = whirl(trooper, W);
    expect(unitAtV7(shocked.state, W).hp).toBe(unitAtV7(trooper, W).hp);
    const ox = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: W },
        // A Musk Ox (Frostbite).
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
      { factions: ["DWARF", "ICE_FOLK"] },
    );
    const chilled = whirl(ox, W);
    expect(
      chilled.state.frozen.some((entry) => entry.unitId === unitAtV7(ox, W).id),
    ).toBe(false);
    expect(kindsV7(chilled.events)).not.toContain("UNITS_FROZEN");
  });

  it("sets off the death blast of an exploding unit it kills, which hits the Whirligig", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: W },
        { seat: 1, role: "CATAPULT", at: at(5, 2), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["DWARF", "GOBLIN"] },
    );
    const result = whirl(state, W);
    expect(kindsV7(result.events)).toContain("EXPLOSION_RESOLVED");
    expect(unitAtV7(result.state, W).hp).toBeLessThan(unitAtV7(state, W).hp);
    expect(unitAtV7(result.state, W).kills).toBe(1);
  });

  it("is projected like a Wail to the other seat", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const result = whirl(state, W);
    const other = seatIdV7(state, 1);
    const projected = projectEventsV7(state, result.state, other, [
      ...result.events,
    ]);
    expect(projected.events.map((event) => event.kind)).toContain(
      "WHIRL_RESOLVED",
    );
  });
});

describe("the Normal AI and the Whirligig's attack (pulp_wars-befg)", () => {
  const isHostile =
    (state: GameStateV7) =>
    (ownerId: number): boolean =>
      ownerId !== activeIdV7(state);

  it("whirls into a crowd of enemies with no own unit next to it", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 4 },
      { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 4 },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const attacks = offeredOfV7(state, W, "ATTACK");
    expect(attacks).toHaveLength(2);
    for (const command of attacks)
      expect(scoreCommandV7(view, command).priority).toBeGreaterThan(0);
    expect(
      policyTurn(state).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === unitAtV7(state, W).id,
      ),
    ).toBe(true);
  });

  it("does not hurt its own units for one enemy it does not kill", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    for (const command of offeredOfV7(state, W, "ATTACK"))
      expect(scoreCommandV7(view, command).priority).toBe(-1);
    // Over its whole turn it never whirls into its own unit (it may step
    // away from it first).
    const whirligigId = unitAtV7(state, W).id;
    for (const step of policyTurnSteps(state))
      if (step.command.kind === "ATTACK" && step.command.unitId === whirligigId)
        expect(
          previewWhirlV7(viewForV7(step.state, activeIdV7(state)), whirligigId)
            ?.friendlyHits,
        ).toBe(0);
  });

  it("takes friendly fire when it kills several enemies worth much more", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 2 },
      { seat: 1, role: "CAPTAIN", at: at(5, 2), hp: 2 },
      { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 2 },
      // A healthy own Hammerer, lightly scratched by the Whirl.
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const preview = previewWhirlV7(view, unitAtV7(state, W).id);
    expect(preview).toMatchObject({
      kills: 3,
      friendlyHits: 1,
      friendlyKills: 0,
    });
    for (const command of offeredOfV7(state, W, "ATTACK"))
      expect(scoreCommandV7(view, command).priority).toBeGreaterThan(0);
    // Two kills against a dead own unit: not worth it.
    const costly = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 2 },
      { seat: 0, role: "MARKSMAN", at: at(6, 4), hp: 2 },
    ]);
    const costlyView = viewForV7(costly, activeIdV7(costly));
    expect(previewWhirlV7(costlyView, unitAtV7(costly, W).id)).toMatchObject({
      kills: 2,
      friendlyKills: 1,
    });
    for (const command of offeredOfV7(costly, W, "ATTACK"))
      expect(scoreCommandV7(costlyView, command).priority).toBe(-1);
  });

  it("goes into an enemy crowd away from its own units, and its own units stop parking next to it", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(6, 2) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const whirligig = view.units.find(
      (unit) => unit.id === unitAtV7(state, at(5, 5)).id,
    );
    const hammerer = view.units.find(
      (unit) => unit.id === unitAtV7(state, at(6, 4)).id,
    );
    if (whirligig === undefined || hammerer === undefined) throw new Error();
    const hostile = isHostile(state);
    // (5, 1) has both enemies next to it and no own unit; (5, 3) has both
    // enemies and the own Hammerer next to it.
    const clear = whirlMoveValueV7(view, whirligig, at(5, 1), hostile);
    const crowded = whirlMoveValueV7(view, whirligig, at(5, 3), hostile);
    expect(clear).toBe(NINTH_WHIRL_TARGET_VALUE_V7);
    expect(crowded).toBe(
      NINTH_WHIRL_TARGET_VALUE_V7 - NINTH_WHIRL_FRIENDLY_COST_V7,
    );
    expect(clear).toBeGreaterThan(crowded);
    // The Hammerer pays for ending next to a Whirligig with enemies near,
    // and nothing elsewhere.
    expect(whirlMoveValueV7(view, hammerer, at(4, 4), hostile)).toBe(
      -NINTH_WHIRL_NEIGHBOUR_COST_V7,
    );
    expect(whirlMoveValueV7(view, hammerer, at(2, 4), hostile)).toBe(0);
    // Without an enemy near the Whirligig, standing beside it is free.
    const quiet = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(3, 4) },
      { seat: 1, role: "FIGHTER", at: at(0, 0) },
    ]);
    const quietView = viewForV7(quiet, activeIdV7(quiet));
    const quietHammerer = quietView.units.find(
      (unit) => unit.id === unitAtV7(quiet, at(3, 4)).id,
    );
    if (quietHammerer === undefined) throw new Error();
    expect(
      whirlMoveValueV7(quietView, quietHammerer, at(4, 4), isHostile(quiet)),
    ).toBe(0);
  });
});

// -------------------------------------------------------- Barricades ---

describe("the Engineer's Barricade (section 22.8)", () => {
  const ENGINEER = at(5, 3);
  const build = (
    state: GameStateV7,
    to: CoordV7,
    from: CoordV7 = ENGINEER,
  ): CommandV7 => ({
    kind: "BUILD_BARRICADE",
    unitId: unitAtV7(state, from).id,
    to,
  });

  it("is built for 1 Coin on a free, explored land tile next to the Engineer and stands with 10 HP", () => {
    // `pulp_wars-cln2`: 1 Coin (3 before).
    expect(BARRICADE_COST_V7).toBe(1);
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2) },
      ],
      { water: [at(6, 4)] },
    );
    const offered = offeredOfV7(state, ENGINEER, "BUILD_BARRICADE").map(
      (command) => (command.kind === "BUILD_BARRICADE" ? command.to : null),
    );
    // Not on a unit (4, 2) and (6, 2), nor on water (6, 4).
    expect(offered).toEqual([at(5, 2), at(4, 3), at(6, 3), at(4, 4), at(5, 4)]);
    const view = viewForV7(state, activeIdV7(state));
    const engineer = unitAtV7(state, ENGINEER);
    expect(previewBuildBarricadeV7(view, engineer.id)).toEqual({
      unitId: engineer.id,
      cost: BARRICADE_COST_V7,
      hp: BARRICADE_HP_V7,
      standing: 0,
      cap: BARRICADE_CAP_V7,
      tiles: offered,
    });
    expect(queryBarricadeUnavailableReasonV7(view, engineer.id)).toBeNull();
    const coins = state.players.find(
      (player) => player.id === activeIdV7(state),
    )?.coins;
    const result = playV7(state, build(state, at(5, 2)));
    expect(result.events[0]).toEqual({
      kind: "BARRICADE_BUILT",
      playerId: activeIdV7(state),
      unitId: engineer.id,
      at: at(5, 2),
      cost: 1,
    });
    expect(result.state.barricades).toEqual([
      { at: at(5, 2), ownerId: activeIdV7(state), hp: 10 },
    ]);
    expect(
      result.state.players.find((player) => player.id === activeIdV7(state))
        ?.coins,
    ).toBe((coins ?? 0) - 1);
    expect(unitAtV7(result.state, ENGINEER).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // One primary action a turn.
    expect(offeredOfV7(result.state, ENGINEER, "BUILD_BARRICADE")).toEqual([]);
    expect(refusalV7(result.state, build(result.state, at(4, 3))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("refuses a tile that is not free, next to it, land, or explored", () => {
    let state = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 5) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [at(7, 6)] },
    );
    state = checkedV7({ ...state, treasureChests: [at(6, 6)] });
    state = withBarricades(state, [{ at: at(7, 4), seat: 0 }]);
    state = unexploreV7(state, 0, [at(6, 4)]);
    const offered = offeredOfV7(state, at(6, 5), "BUILD_BARRICADE").map(
      (command) => (command.kind === "BUILD_BARRICADE" ? command.to : null),
    );
    // Not on a village center (5, 5), a chest (6, 6), water (7, 6), a
    // Barricade (7, 4), or an unexplored tile (6, 4).
    expect(offered).toEqual([at(5, 4), at(7, 5), at(5, 6)]);
    for (const to of [at(5, 5), at(6, 6), at(7, 6), at(7, 4), at(6, 4)])
      expect(
        refusalV7(state, build(state, to, at(6, 5))),
        `${to.x},${to.y}`,
      ).toEqual({
        code: "INVALID_TILE",
        params: { action: "BUILD_BARRICADE" },
      });
    // Two tiles away.
    expect(refusalV7(state, build(state, at(6, 7), at(6, 5))).code).toBe(
      "INVALID_TILE",
    );
  });

  it("is capped at 4 standing per player, needs the Coins, the role, and land form", () => {
    const base = dwarfFieldV7([
      { seat: 0, role: "CAPTAIN", at: ENGINEER },
      { seat: 0, role: "FIGHTER", at: at(2, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const capped = withBarricades(base, [
      { at: at(0, 0), seat: 0 },
      { at: at(1, 0), seat: 0 },
      { at: at(2, 0), seat: 0 },
      { at: at(3, 0), seat: 0, hp: 1 },
      // Another player's Barricade does not count.
      { at: at(4, 0), seat: 1 },
    ]);
    expect(offeredOfV7(capped, ENGINEER, "BUILD_BARRICADE")).toEqual([]);
    expect(
      queryBarricadeUnavailableReasonV7(
        viewForV7(capped, activeIdV7(capped)),
        unitAtV7(capped, ENGINEER).id,
      ),
    ).toBe("CAP");
    expect(refusalV7(capped, build(capped, at(5, 2)))).toEqual({
      code: "BARRICADE_NOT_LEGAL",
      params: { reason: "CAP" },
    });
    // Three standing: one more is allowed.
    const three = withBarricades(base, [
      { at: at(0, 0), seat: 0 },
      { at: at(1, 0), seat: 0 },
      { at: at(2, 0), seat: 0 },
    ]);
    expect(offeredOfV7(three, ENGINEER, "BUILD_BARRICADE")).not.toEqual([]);
    const poor = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { coins: 0 },
    );
    expect(offeredOfV7(poor, ENGINEER, "BUILD_BARRICADE")).toEqual([]);
    expect(refusalV7(poor, build(poor, at(5, 2)))).toEqual({
      code: "INSUFFICIENT_COINS",
      params: { cost: 1 },
    });
    // One Coin is enough.
    const penny = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { coins: 1 },
    );
    expect(offeredOfV7(penny, ENGINEER, "BUILD_BARRICADE")).not.toEqual([]);
    expect(refusalV7(base, build(base, at(2, 3), at(2, 2)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const afloat = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 1), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [at(5, 1)] },
    );
    expect(refusalV7(afloat, build(afloat, at(5, 2), at(5, 1)))).toEqual({
      code: "BARRICADE_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
  });

  it("blocks every unit's Move through and onto it, of every owner, flyers too", () => {
    const state = withBarricades(
      dwarfFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 4) },
          { seat: 0, role: "RAIDER", at: at(4, 5) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        {},
      ),
      [{ at: at(4, 3), seat: 0 }],
    );
    const view = viewForV7(state, activeIdV7(state));
    for (const where of [at(4, 4), at(4, 5)]) {
      const unit = view.units.find(
        (item) => item.at.x === where.x && item.at.y === where.y,
      );
      if (unit === undefined) throw new Error("no unit");
      expect(
        reachablePlayerMovementPathsV7(view, unit).some((path) =>
          path.path.some((step) => step.x === 4 && step.y === 3),
        ),
      ).toBe(false);
    }
    expect(
      refusalV7(state, {
        kind: "MOVE",
        unitId: unitAtV7(state, at(4, 4)).id,
        path: [at(4, 3)],
      }),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "BARRICADE" } });
    // The Gyrocopter flies over units, never over a Barricade.
    expect(
      refusalV7(state, {
        kind: "MOVE",
        unitId: unitAtV7(state, at(4, 5)).id,
        path: [at(4, 4), at(4, 3), at(4, 2)],
      }),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "BARRICADE" } });
  });

  it("interrupts a Move into a Barricade the mover had not explored", () => {
    const start = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "KNIGHT", at: at(4, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [{ at: at(4, 3), seat: 1 }],
    );
    const state = unexploreV7(start, 0, [at(4, 3)]);
    const view = viewForV7(state, activeIdV7(state));
    expect(view.barricades).toEqual([]);
    const result = playV7(state, moveTo(state, at(4, 6), at(4, 3)));
    expect(result.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: unitAtV7(state, at(4, 6)).id,
      at: at(4, 3),
      reason: "BARRICADE",
    });
    // It stays on the last tile it entered.
    const mover = result.state.units.find(
      (unit) => unit.id === unitAtV7(state, at(4, 6)).id,
    );
    expect(mover?.at).not.toEqual(at(4, 3));
    expect(mover?.activation.moved).toBe(true);
    // Now it is known: the view shows it.
    expect(viewForV7(result.state, activeIdV7(state)).barricades).toEqual([
      { at: at(4, 3), ownerId: seatIdV7(state, 1), hp: 10 },
    ]);
  });

  it("keeps a tunnel and a bombing run from coming down on it", () => {
    const state = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "GUARD", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(7, 2) },
      ]),
      [
        { at: at(5, 6), seat: 1 },
        { at: at(6, 3), seat: 1 },
      ],
    );
    const tunnels = offeredOfV7(state, at(5, 4), "TUNNEL");
    expect(
      tunnels.some(
        (command) =>
          command.kind === "TUNNEL" &&
          ((command.to.x === 5 && command.to.y === 6) ||
            (command.rider?.to.x === 5 && command.rider.to.y === 6)),
      ),
    ).toBe(false);
    expect(refusalV7(state, tunnelV7(state, at(5, 4), at(5, 6)))).toEqual({
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "DESTINATION" },
    });
    expect(
      refusalV7(
        state,
        tunnelV7(state, at(5, 4), at(4, 6), { from: at(4, 4), to: at(5, 6) }),
      ),
    ).toEqual({
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "RIDER_DESTINATION" },
    });
    // (6, 3) is within the Gyrocopter's Move (a landing since the
    // Gyrocopter pass), but a Barricade stands there.
    expect(
      offeredOfV7(state, at(5, 2), "BOMB_RUN").some(
        (command) =>
          command.kind === "BOMB_RUN" &&
          command.to.x === 6 &&
          command.to.y === 3,
      ),
    ).toBe(false);
    expect(
      refusalV7(state, bombV7(state, at(5, 2), at(7, 2), at(6, 3))),
    ).toEqual({ code: "BOMB_RUN_NOT_LEGAL", params: { reason: "LANDING" } });
  });

  it("is attacked by hostile units for the ordinary damage, unanswered, and destroyed at 0 HP", () => {
    const state = withBarricades(
      dwarfFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(5, 4) },
          { seat: 1, role: "MARKSMAN", at: at(4, 5) },
          { seat: 0, role: "FIGHTER", at: at(1, 1) },
        ],
        { activeSeat: 1 },
      ),
      [{ at: at(4, 3), seat: 0 }],
    );
    const attack = (
      current: GameStateV7,
      from: CoordV7,
    ): Extract<CommandV7, { kind: "ATTACK_BARRICADE" }> => ({
      kind: "ATTACK_BARRICADE",
      unitId: unitAtV7(current, from).id,
      at: at(4, 3),
    });
    const view = viewForV7(state, activeIdV7(state));
    // Attack 2 against Defense 2, both at full HP: 5.
    expect(previewAttackBarricadeV7(view, attack(state, at(4, 4)))).toEqual({
      unitId: unitAtV7(state, at(4, 4)).id,
      at: at(4, 3),
      ownerId: seatIdV7(state, 0),
      damage: 5,
      hpAfter: 5,
      destroys: false,
    });
    const first = playV7(state, attack(state, at(4, 4)));
    expect(first.events[0]).toEqual({
      kind: "BARRICADE_ATTACKED",
      playerId: activeIdV7(state),
      unitId: unitAtV7(state, at(4, 4)).id,
      at: at(4, 3),
      ownerId: seatIdV7(state, 0),
      damage: 5,
      hpAfter: 5,
      destroyed: false,
    });
    expect(first.state.barricades).toEqual([
      { at: at(4, 3), ownerId: seatIdV7(state, 0), hp: 5 },
    ]);
    // Nothing answered, nobody advanced, no kill; the attacker is spent.
    expect(unitAtV7(first.state, at(4, 4))).toMatchObject({
      hp: 12,
      kills: 0,
      activation: { attacked: true, handled: true },
    });
    expect(offeredOfV7(first.state, at(4, 4), "ATTACK_BARRICADE")).toEqual([]);
    // A shot from two tiles destroys it (Attack 2 against half HP: 6).
    const shot = previewAttackBarricadeV7(
      viewForV7(first.state, activeIdV7(state)),
      attack(first.state, at(4, 5)),
    );
    expect(shot).toMatchObject({ damage: 5, hpAfter: 0, destroys: true });
    const second = playV7(first.state, attack(first.state, at(4, 5)));
    expect(second.events[0]).toMatchObject({
      kind: "BARRICADE_ATTACKED",
      damage: 5,
      hpAfter: 0,
      destroyed: true,
    });
    expect(second.state.barricades).toEqual([]);
    expect(offeredOfV7(second.state, at(5, 4), "ATTACK_BARRICADE")).toEqual([]);
    // Nobody advances onto its tile.
    expect(unitOn(second.state, at(4, 3))).toBeUndefined();
    expect(
      barricadeDamageV7({
        attack2: 4,
        attackerHp: 12,
        attackerMaxHp: 12,
        unflinching: false,
        barricadeHp: 10,
      }),
    ).toBe(5);
  });

  it("is not attacked by its owner, an ally, from out of range, or where none stands", () => {
    const state = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [
        { at: at(4, 3), seat: 0 },
        { at: at(6, 4), seat: 1 },
      ],
    );
    const attack = (from: CoordV7, where: CoordV7): CommandV7 => ({
      kind: "ATTACK_BARRICADE",
      unitId: unitAtV7(state, from).id,
      at: where,
    });
    expect(offeredOfV7(state, at(4, 4), "ATTACK_BARRICADE")).toEqual([]);
    expect(refusalV7(state, attack(at(4, 4), at(4, 3))).code).toBe(
      "TARGET_ALLIED",
    );
    expect(refusalV7(state, attack(at(6, 6), at(6, 4))).code).toBe(
      "TARGET_OUT_OF_RANGE",
    );
    expect(refusalV7(state, attack(at(4, 4), at(3, 3))).code).toBe(
      "TARGET_NOT_FOUND",
    );
    // A Gyrocopter has no ordinary attack.
    const gyro = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "RAIDER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [{ at: at(4, 3), seat: 1 }],
    );
    expect(
      refusalV7(gyro, {
        kind: "ATTACK_BARRICADE",
        unitId: unitAtV7(gyro, at(4, 4)).id,
        at: at(4, 3),
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
  });

  it("is repaired by an adjacent Engineer like a machine, up to 10 HP, and never by itself", () => {
    const state = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [
        { at: at(5, 2), seat: 0, hp: 3 },
        { at: at(6, 3), seat: 0, hp: 8 },
        // Two tiles away, and another seat's: untouched.
        { at: at(5, 1), seat: 0, hp: 3 },
        { at: at(4, 4), seat: 1, hp: 3 },
      ],
    );
    const engineer = unitAtV7(state, ENGINEER);
    expect(offeredOfV7(state, ENGINEER, "TEND_WOUNDED")).toEqual([
      { kind: "TEND_WOUNDED", unitId: engineer.id },
    ]);
    expect(
      previewTendWoundedV7(viewForV7(state, activeIdV7(state)), engineer.id),
    ).toEqual({
      results: [],
      barricades: [
        { at: at(5, 2), amount: 4, hpAfter: 7 },
        { at: at(6, 3), amount: 2, hpAfter: 10 },
      ],
    });
    const result = playV7(state, { kind: "TEND_WOUNDED", unitId: engineer.id });
    expect(result.events.slice(0, 2)).toEqual([
      {
        kind: "BARRICADE_REPAIRED",
        playerId: activeIdV7(state),
        unitId: engineer.id,
        at: at(5, 2),
        amount: 4,
        hpAfter: 7,
      },
      {
        kind: "BARRICADE_REPAIRED",
        playerId: activeIdV7(state),
        unitId: engineer.id,
        at: at(6, 3),
        amount: 2,
        hpAfter: 10,
      },
    ]);
    expect(result.state.barricades.map((entry) => entry.hp)).toEqual([
      3, 7, 10, 3,
    ]);
    // No regeneration over the turns.
    const later = applyOkV7(
      applyOkV7(result.state, activeIdV7(result.state), { kind: "END_TURN" })
        .state,
      seatIdV7(state, 1),
      { kind: "END_TURN" },
    ).state;
    expect(later.barricades.map((entry) => entry.hp)).toEqual([3, 7, 10, 3]);
  });

  it("stays when its Engineer dies", () => {
    const state = withBarricades(
      dwarfFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: ENGINEER, hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(5, 4) },
        ],
        { activeSeat: 1 },
      ),
      [{ at: at(5, 2), seat: 0 }],
    );
    const result = playV7(state, {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 4)).id,
      targetUnitId: unitAtV7(state, ENGINEER).id,
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, ENGINEER).id,
      cause: "ATTACK",
    });
    expect(result.state.barricades).toEqual(state.barricades);
  });

  it("is saved, validated, and public once its tile is explored", () => {
    const state = withBarricades(
      dwarfFieldV7([
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [
        { at: at(5, 2), seat: 0, hp: 7 },
        { at: at(9, 2), seat: 0 },
      ],
    );
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const owner = seatIdV7(state, 0);
    const invalid = (barricades: unknown): unknown => ({
      ...state,
      barricades,
    });
    for (const [label, barricades] of [
      ["unsorted", [state.barricades[1], state.barricades[0]]],
      ["duplicate", [state.barricades[0], state.barricades[0]]],
      ["0 HP", [{ at: at(5, 2), ownerId: owner, hp: 0 }]],
      ["11 HP", [{ at: at(5, 2), ownerId: owner, hp: 11 }]],
      ["on a unit", [{ at: ENGINEER, ownerId: owner, hp: 5 }]],
      ["on a village", [{ at: at(5, 5), ownerId: owner, hp: 5 }]],
      ["unknown owner", [{ at: at(5, 2), ownerId: 99, hp: 5 }]],
      ["extra key", [{ at: at(5, 2), ownerId: owner, hp: 5, x: 1 }]],
      [
        "over the cap",
        [0, 1, 2, 3, 4].map((x) => ({ at: at(x, 0), ownerId: owner, hp: 5 })),
      ],
    ] as const)
      expect(parseGameStateV7(invalid(barricades)), label).toBeNull();
    const water = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [at(0, 0)] },
    );
    expect(
      parseGameStateV7({
        ...water,
        barricades: [{ at: at(0, 0), ownerId: owner, hp: 5 }],
      }),
    ).toBeNull();
    // A match without a Dwarf seat has none.
    const human = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    expect(
      parseGameStateV7({
        ...human,
        barricades: [{ at: at(5, 2), ownerId: owner, hp: 5 }],
      }),
    ).toBeNull();
    // Fog: another seat sees a Barricade on a tile it has explored, with
    // its owner and HP, and nothing of one on a tile it has not.
    const fogged = unexploreV7(state, 1, [at(9, 2)]);
    expect(viewForV7(fogged, seatIdV7(state, 1)).barricades).toEqual([
      { at: at(5, 2), ownerId: owner, hp: 7 },
    ]);
    // Every event parses.
    for (const event of [
      {
        kind: "BARRICADE_BUILT",
        playerId: owner,
        unitId: 5,
        at: at(5, 2),
        cost: 1,
      },
      {
        kind: "BARRICADE_REPAIRED",
        playerId: owner,
        unitId: 5,
        at: at(5, 2),
        amount: 4,
        hpAfter: 9,
      },
      {
        kind: "BARRICADE_ATTACKED",
        playerId: seatIdV7(state, 1),
        unitId: 5,
        at: at(5, 2),
        ownerId: owner,
        damage: 5,
        hpAfter: 0,
        destroyed: true,
      },
    ])
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    expect(
      parseEventV7({
        kind: "BARRICADE_ATTACKED",
        playerId: owner,
        unitId: 5,
        at: at(5, 2),
        ownerId: owner,
        damage: 5,
        hpAfter: 5,
        destroyed: false,
      }).ok,
    ).toBe(false);
  });

  it("leaves the Normal AI legal: it walks around Barricades and may ignore them", () => {
    const state = withBarricades(
      dwarfFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(4, 4) },
          { seat: 1, role: "RAIDER", at: at(3, 3) },
          { seat: 1, role: "MARKSMAN", at: at(2, 5) },
          { seat: 0, role: "CAPTAIN", at: at(6, 3) },
          { seat: 0, role: "FIGHTER", at: at(7, 4) },
        ],
        { activeSeat: 1 },
      ),
      [
        { at: at(5, 3), seat: 0 },
        { at: at(5, 4), seat: 0 },
        { at: at(4, 3), seat: 0, hp: 2 },
      ],
    );
    expect(policyTurn(state).at(-1)).toEqual({ kind: "END_TURN" });
  });

  it("is never built by the Normal AI, even at 1 Coin with Coins to spare (no spam)", () => {
    // `pulp_wars-cln2`: the cheap Barricade stays out of the AI's plays:
    // BUILD_BARRICADE has no score, so it is never chosen.
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: ENGINEER },
        { seat: 0, role: "CAPTAIN", at: at(7, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "MARKSMAN", at: at(6, 1) },
      ],
      { coins: 50 },
    );
    const view = viewForV7(state, activeIdV7(state));
    const builds = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "BUILD_BARRICADE",
    );
    expect(builds.length).toBeGreaterThan(0);
    for (const command of builds)
      expect(scoreCommandV7(view, command).priority).toBe(-1);
    expect(
      policyTurn(state).filter((command) => command.kind === "BUILD_BARRICADE"),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------- Bomb Run ---
// The landing rule of `pulp_wars-w49.33` (up to two tiles past the target)
// was replaced by the Gyrocopter pass (`pulp_wars-w49.44`): see
// tests/unit/ruleset-v7-gyrocopter-pass.test.ts.
