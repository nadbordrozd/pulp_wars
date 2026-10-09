import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  BARRICADE_CAP_V7,
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  BOMB_LANDING_RANGE_V7,
  barricadeDamageV7,
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
// Hammers), the Engineer's Barricade, and the Bomb Run landing up to two
// tiles from its target. The field is tests/fixtures/v7-dwarf.ts: an
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

function whirlOf(state: GameStateV7, where: CoordV7): CommandV7 {
  return { kind: "WHIRL", unitId: unitAtV7(state, where).id };
}

/** Plays an offered Whirl whose public preview must equal the result. */
function whirl(
  state: GameStateV7,
  where: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const unitId = unitAtV7(state, where).id;
  const preview = previewWhirlV7(viewForV7(state, activeIdV7(state)), unitId);
  if (preview === null) throw new Error("no Whirl preview");
  const result = playV7(state, whirlOf(state, where));
  expect(preview.exact).toBe(true);
  expect(preview.targets).toEqual(whirled(result.events).results);
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

/** The active seat plays its turn with the Normal policy; the commands. */
function policyTurn(start: GameStateV7): readonly CommandV7[] {
  const actor = activeIdV7(start);
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
    expect(queryPlayerCommandsV7(view), command.kind).toContainEqual(command);
    commands.push(command);
    if (command.kind === "END_TURN") return commands;
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

// ------------------------------------------------------------- Whirl ---

describe("the Whirligig's Whirl (section 22.15)", () => {
  it("replaces Three Hammers: one attack a turn, the Whirl, and no struck list", () => {
    const mechanics = roleMechanicsV7("KNIGHT", "DWARF");
    expect(mechanics.whirl).toBe(true);
    expect("attacksPerTurn" in mechanics).toBe(false);
    expect(roleMechanicsV7("KNIGHT", "ORIGINAL").whirl).toBe(false);
    const state = dwarfFieldV7([{ seat: 0, role: "KNIGHT", at: W }]);
    expect("struckThisTurn" in state.ninthUnit).toBe(false);
    expect(parseCommandV7({ kind: "WHIRL", unitId: 5 })).toEqual({
      ok: true,
      value: { kind: "WHIRL", unitId: 5 },
    });
    expect(parseCommandV7({ kind: "WHIRL", unitId: 5, at: W }).ok).toBe(false);
  });

  it("hits every visible hostile unit next to it at once with its ordinary attack, unanswered, and never advances", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 3 },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 1, role: "MARKSMAN", at: at(6, 4) },
      // Its own unit next to it and an enemy two tiles away: untouched.
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
    ]);
    const top = unitAtV7(state, W);
    const expected = [at(4, 2), at(5, 2), at(6, 4)].map((where) => {
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
    const result = whirl(state, W);
    expect(whirled(result.events)).toEqual({
      kind: "WHIRL_RESOLVED",
      playerId: activeIdV7(state),
      unitId: top.id,
      at: W,
      results: expected,
    });
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
    for (const [index, where] of [at(5, 2), at(6, 4)].entries())
      expect(unitAtV7(result.state, where).hp).toBe(
        unitAtV7(state, where).hp - (expected[index + 1]?.damage ?? 0),
      );
    expect(unitAtV7(result.state, at(4, 4)).hp).toBe(
      unitAtV7(state, at(4, 4)).hp,
    );
    expect(unitAtV7(result.state, at(7, 3)).hp).toBe(
      unitAtV7(state, at(7, 3)).hp,
    );
    // One primary action: no second Whirl, no attack, no Move.
    for (const kind of ["WHIRL", "ATTACK", "MOVE"] as const)
      expect(offeredOfV7(result.state, W, kind), kind).toEqual([]);
    expect(refusalV7(result.state, whirlOf(result.state, W))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: top.id },
    });
  });

  it("may follow a Move, but not an attack", () => {
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
    // After an ordinary attack the Whirl is neither offered nor accepted.
    const near = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(6, 2) },
    ]);
    const attacked = playV7(near, {
      kind: "ATTACK",
      unitId: unitAtV7(near, W).id,
      targetUnitId: unitAtV7(near, at(4, 2)).id,
    });
    expect(offeredOfV7(attacked.state, W, "WHIRL")).toEqual([]);
    expect(refusalV7(attacked.state, whirlOf(attacked.state, W)).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("needs a target, land form, and the role", () => {
    const alone = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(5, 1) },
    ]);
    expect(offeredOfV7(alone, W, "WHIRL")).toEqual([]);
    expect(refusalV7(alone, whirlOf(alone, W))).toEqual({
      code: "WHIRL_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    const hammerer = dwarfFieldV7([
      { seat: 0, role: "FIGHTER", at: W },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(offeredOfV7(hammerer, W, "WHIRL")).toEqual([]);
    expect(refusalV7(hammerer, whirlOf(hammerer, W))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const afloat = dwarfFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 1), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { water: [at(5, 1)] },
    );
    expect(offeredOfV7(afloat, at(5, 1), "WHIRL")).toEqual([]);
    expect(refusalV7(afloat, whirlOf(afloat, at(5, 1)))).toEqual({
      code: "WHIRL_NOT_LEGAL",
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
    const eggHit = whirled(whirl(nest, at(4, 6)).events).results;
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
      chilled.state.chilled.some(
        (entry) => entry.unitId === unitAtV7(ox, W).id,
      ),
    ).toBe(false);
    expect(kindsV7(chilled.events)).not.toContain("UNITS_CHILLED");
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

  it("is offered to and chosen by the Normal AI instead of a single attack", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: W },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 4 },
      { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 4 },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const whirlCommand = whirlOf(state, W);
    expect(scoreCommandV7(view, whirlCommand).priority).toBeGreaterThan(0);
    for (const command of offeredOfV7(state, W, "ATTACK"))
      expect(scoreCommandV7(view, command).priority).toBe(-1);
    expect(policyTurn(state)).toContainEqual(whirlCommand);
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

  it("is built for 3 Coins on a free, explored land tile next to the Engineer and stands with 10 HP", () => {
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
      cost: 3,
    });
    expect(result.state.barricades).toEqual([
      { at: at(5, 2), ownerId: activeIdV7(state), hp: 10 },
    ]);
    expect(
      result.state.players.find((player) => player.id === activeIdV7(state))
        ?.coins,
    ).toBe((coins ?? 0) - 3);
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
      { coins: 2 },
    );
    expect(offeredOfV7(poor, ENGINEER, "BUILD_BARRICADE")).toEqual([]);
    expect(refusalV7(poor, build(poor, at(5, 2)))).toEqual({
      code: "INSUFFICIENT_COINS",
      params: { cost: 3 },
    });
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
    // (6, 3) is within 2 of the target and farther from the Gyrocopter, but
    // a Barricade stands there.
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
        cost: 3,
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
});

// ---------------------------------------------------------- Bomb Run ---

describe("the Bomb Run lands up to two tiles from its target (section 6.2 rule 10)", () => {
  const GYRO = at(5, 2);
  const state = dwarfFieldV7([
    { seat: 0, role: "RAIDER", at: GYRO },
    { seat: 1, role: "FIGHTER", at: at(5, 3) },
    { seat: 1, role: "FIGHTER", at: at(1, 1) },
  ]);

  it("offers every reachable landing within 2 of the target and farther from the start", () => {
    expect(BOMB_LANDING_RANGE_V7).toBe(2);
    const landings = offeredOfV7(state, GYRO, "BOMB_RUN")
      .filter(
        (command) =>
          command.kind === "BOMB_RUN" &&
          command.targetUnitId === unitAtV7(state, at(5, 3)).id,
      )
      .map((command) => (command.kind === "BOMB_RUN" ? command.to : null));
    // Distance 2 from the start (row 4 and columns 3 and 7), within 2 of
    // (5, 3); and distance 3 (row 5 and beyond) within 2 of (5, 3), except
    // the village (5, 5).
    for (const to of [at(5, 4), at(3, 4), at(7, 4), at(4, 5), at(6, 5)])
      expect(landings, `${to.x},${to.y}`).toContainEqual(to);
    expect(landings).not.toContainEqual(at(5, 5));
    for (const to of landings) {
      if (to === null) throw new Error("no landing");
      expect(
        Math.max(Math.abs(to.x - 5), Math.abs(to.y - 3)),
      ).toBeLessThanOrEqual(2);
      expect(Math.max(Math.abs(to.x - 5), Math.abs(to.y - 2))).toBeGreaterThan(
        1,
      );
    }
  });

  it("lands at distance 1 and at distance 2 from the target", () => {
    const near = playV7(state, bombV7(state, GYRO, at(5, 3), at(5, 4)));
    expect(unitAtV7(near.state, at(5, 4)).id).toBe(unitAtV7(state, GYRO).id);
    const far = playV7(state, bombV7(state, GYRO, at(5, 3), at(4, 5)));
    expect(
      far.events.find((event) => event.kind === "UNIT_BOMBED"),
    ).toMatchObject({ from: GYRO, to: at(4, 5), at: at(5, 3) });
    expect(unitAtV7(far.state, at(4, 5)).id).toBe(unitAtV7(state, GYRO).id);
  });

  it("refuses a landing 3 from the target, one not farther from the start, and one a Move cannot reach", () => {
    const refusal = (to: CoordV7) =>
      refusalV7(state, bombV7(state, GYRO, at(5, 3), to));
    const landing = {
      code: "BOMB_RUN_NOT_LEGAL",
      params: { reason: "LANDING" },
    };
    // 3 from the target.
    expect(refusal(at(2, 5))).toEqual(landing);
    // Within 2 of the target but no farther from the start than it is.
    expect(refusal(at(4, 3))).toEqual(landing);
    expect(refusal(at(6, 1))).toEqual(landing);
    // Within 2 and farther, but 4 from the start (beyond Move 3).
    const longRange = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: GYRO },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      refusalV7(longRange, bombV7(longRange, GYRO, at(5, 4), at(5, 6))),
    ).toEqual(landing);
    // A village center.
    expect(refusal(at(5, 5))).toEqual(landing);
  });
});
