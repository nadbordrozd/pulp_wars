import { describe, expect, it } from "vitest";
import {
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  FROST_BREATH_FREEZE_VALUE_V7,
  SHATTER_SETUP_PRIORITY_V7,
} from "../../src/ai/v7-ice-folk";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { frozenAtV7, iceFieldV7 } from "../fixtures/v7-ice-folk";
import { rejectedV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  moveV7,
  tileV7,
} from "../fixtures/v7-revision20";

// The Snow Golem and the Mammoth (`pulp_wars-3qtp`, ruleset 7r134,
// docs/product/ICE_FOLK_REDESIGN_2026-11.md sections 3.7, 3.8 and 6,
// Bead 2). Every case is a hand-built state on the Ice Folk field of
// `v7-ice-folk.ts` (seat 0 the Ice Folk, its territory x 7-9, y 7-9; seat 1
// the Humans, territory x 1-3, y 7-9; open neutral Grass elsewhere); no
// match is played. `attackV7` also checks that the attack was offered, that
// its public preview equals the resolved `COMBAT_RESOLVED` preview, and that
// every event parses.

const attackOf = (
  state: GameStateV7,
  from: { x: number; y: number },
  to: { x: number; y: number },
): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

describe("the Snow Golem (section 3.7)", () => {
  it("has the Catapult's reach and blow, Defense 1, Move 1, 9 Coins, and the Snowball", () => {
    const golem = effectiveRoleRuleV7("CATAPULT", "ICE_FOLK");
    const catapult = effectiveRoleRuleV7("CATAPULT", "ORIGINAL");
    expect(golem).toMatchObject({
      label: "Snow Golem",
      cost: 9,
      maxHp: 10,
      attack2: 6,
      defense2: 2,
      move: 1,
      minimumRange: 2,
      range: 3,
      mayUsePrimaryActionAfterMove: false,
      abilities: ["ATTACK", "CAPTURE", "SNOWBALL", "MOUNTAIN_BORN"],
    });
    // Not better than the Catapult on every axis: one Coin dearer for its
    // Defense 1 (0.5), the Snowball, Mountain-born and Glide.
    expect([
      golem.attack2,
      golem.range,
      golem.minimumRange,
      golem.move,
    ]).toEqual([
      catapult.attack2,
      catapult.range,
      catapult.minimumRange,
      catapult.move,
    ]);
    expect(golem.cost).toBe((catapult.cost ?? 0) + 1);
    expect(golem.defense2).toBeGreaterThan(catapult.defense2);
  });

  it("deals a Fighter 8 and Freezes it for one turn; the open neutral tile under it becomes Snow", () => {
    const state = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const run = attackV7(state, at(5, 4), at(5, 2));
    expect(run.combat).toMatchObject({
      snowball: true,
      attack2: 6,
      damageToDefender: 8,
      defenderDies: false,
      retaliation: false,
      fortificationIgnored: 0,
    });
    const fighter = unitAtV7(state, at(5, 2));
    expect(unitAtV7(run.state, at(5, 2)).hp).toBe(4);
    expect(frozenAtV7(run.state, at(5, 2))).toEqual({
      unitId: fighter.id,
      turnsLeft: 1,
    });
    expect(run.state.snow).toEqual([at(5, 2)]);
    expect(run.events).toContainEqual({
      kind: "UNITS_FROZEN",
      playerId: activeIdV7(state),
      sourceUnitId: unitAtV7(state, at(5, 4)).id,
      source: "SNOWBALL",
      results: [{ unitId: fighter.id, turnsLeft: 1 }],
    });
    expect(run.events).toContainEqual({
      kind: "TILES_FROZEN",
      playerId: activeIdV7(state),
      unitId: unitAtV7(state, at(5, 4)).id,
      tiles: [],
      snow: [at(5, 2)],
    });
    // The Frozen Fighter, now at 4 HP, dies to any Yeti blow (no blow back).
    const yeti = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 4 },
    ]);
    const frozen = {
      ...yeti,
      frozen: [
        {
          unitId: unitAtV7(yeti, at(5, 2)).id,
          turnsLeft: 1 as const,
        },
      ],
    };
    expect(attackV7(frozen, at(5, 3), at(5, 2)).combat).toMatchObject({
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("freezes no territory land, lays Snow under a target it kills, and destroys Field Defense without advancing", () => {
    // In the Humans' territory: the Fighter is Frozen, the land unchanged.
    const home = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(4, 5) },
      { seat: 1, role: "FIGHTER", at: at(2, 7) },
    ]);
    const shot = attackV7(home, at(4, 5), at(2, 7));
    expect(frozenAtV7(shot.state, at(2, 7))?.turnsLeft).toBe(1);
    expect(shot.state.snow).toEqual([]);
    expect(kindsV7(shot.events)).not.toContain("TILES_FROZEN");
    // A kill on open neutral land: no unit is Frozen, the tile is Snow.
    const base = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
    ]);
    const kill = attackV7(fieldDefenseV7(base, at(5, 2)), at(5, 4), at(5, 2));
    expect(kill.combat).toMatchObject({ defenderDies: true, advances: false });
    expect(kindsV7(kill.events)).not.toContain("UNITS_FROZEN");
    expect(kill.state.snow).toEqual([at(5, 2)]);
    expect(
      kill.events.find((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
    ).toMatchObject({ reason: "CATAPULT" });
    expect(tileV7(kill.state, at(5, 2)).fieldDefense).toBe(false);
    expect(unitAtV7(kill.state, at(5, 4)).role).toBe("CATAPULT");
  });

  it("cannot target an adjacent unit, and cannot attack after a Move", () => {
    const state = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 1) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const golem = unitAtV7(state, at(5, 4));
    const adjacent = attackOf(state, at(5, 4), at(5, 3));
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(adjacent);
    expect(
      queryCombatPreviewV7(view, golem.id, unitAtV7(state, at(5, 3)).id),
    ).toBeNull();
    expect(rejectedV7(state, adjacent).code).toBeDefined();
    // The Fighter 3 tiles away is in reach; after a step to (4, 4) it is
    // still 3 tiles away, but a Golem that moved does not shoot.
    const far = attackOf(state, at(5, 4), at(5, 1));
    expect(queryPlayerCommandsV7(view)).toContainEqual(far);
    const moved = moveV7(state, at(5, 4), [at(4, 4)]).state;
    const after = viewForV7(moved, activeIdV7(moved));
    expect(
      queryPlayerCommandsV7(after).filter(
        (command) => command.kind === "ATTACK" && command.unitId === golem.id,
      ),
    ).toEqual([]);
    expect(rejectedV7(moved, attackOf(moved, at(4, 4), at(5, 1))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("a Golem-frozen Guard shatters to a Mammoth blow", () => {
    // The Guard on Field Defense in its own territory takes 7 (10 left)
    // and is Frozen; the shot destroys the Field Defense.
    const base = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(6, 8) },
      { seat: 0, role: "SWORDSMAN", at: at(4, 8) },
      { seat: 1, role: "GUARD", at: at(3, 8) },
    ]);
    const state = fieldDefenseV7(base, at(3, 8));
    const shot = attackV7(state, at(6, 8), at(3, 8));
    expect(shot.combat).toMatchObject({
      snowball: true,
      damageToDefender: 7,
      defenderDies: false,
    });
    expect(unitAtV7(shot.state, at(3, 8)).hp).toBe(10);
    expect(frozenAtV7(shot.state, at(3, 8))?.turnsLeft).toBe(1);
    // The Mammoth's blow of 9 would leave 1: it shatters, with no blow
    // back.
    const blow = attackV7(shot.state, at(4, 8), at(3, 8));
    expect(blow.combat).toMatchObject({
      shatters: true,
      defenderDies: true,
      damageToDefender: 10,
      damageToAttacker: 0,
    });
  });

  it("the Normal AI scores a Snowball through its preview: the Frozen survivor is a Shatter setup", () => {
    // The Golem's shot leaves the Fighter Frozen at 4 HP beside a Yeti
    // with an attack on it on offer: the throw goes at the Shatter-setup
    // priority and carries the freeze's value.
    const state = iceFieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
    ]);
    const decision = chooseNormalCommandV7(viewForV7(state, activeIdV7(state)));
    const golemThrow = decision.candidates.find(
      (candidate) =>
        JSON.stringify(candidate.command) ===
        JSON.stringify(attackOf(state, at(5, 5), at(5, 3))),
    );
    expect(golemThrow?.score.priority).toBe(SHATTER_SETUP_PRIORITY_V7);
    expect(golemThrow?.score.strategicValue).toBeGreaterThanOrEqual(
      FROST_BREATH_FREEZE_VALUE_V7,
    );
  });
});

describe("the Mammoth (section 3.8)", () => {
  it("has Attack 3 and costs 8 Coins", () => {
    expect(effectiveRoleRuleV7("SWORDSMAN", "ICE_FOLK")).toMatchObject({
      label: "Mammoth",
      cost: 8,
      maxHp: 20,
      attack2: 6,
      defense2: 4,
      move: 1,
    });
  });

  it("deals 8, 8 and 8 to three Fighters with one retaliation of 4", () => {
    const state = iceFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    const run = attackV7(state, at(5, 4), at(5, 3));
    expect(run.combat).toMatchObject({
      sweep: true,
      damageToDefender: 8,
      damageToAttacker: 4,
      retaliation: true,
    });
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(4, 3)).id,
        at: at(4, 3),
        damage: 8,
        dies: false,
        shieldDamage: 0,
      },
      {
        unitId: unitAtV7(state, at(6, 3)).id,
        at: at(6, 3),
        damage: 8,
        dies: false,
        shieldDamage: 0,
      },
    ]);
    for (const where of [at(5, 3), at(4, 3), at(6, 3)])
      expect(unitAtV7(run.state, where).hp).toBe(4);
    expect(unitAtV7(run.state, at(5, 4)).hp).toBe(16);
  });

  it("a flank hit shatters a Frozen unit it leaves at 3 HP (no Grave, no blast), never a JUGGERNAUT", () => {
    // The flank Fighter at 11 HP would keep 3 of the Mammoth's 8.
    const state = iceFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(4, 3),
        hp: 11,
        frozen: { turnsLeft: 1 },
      },
      {
        seat: 1,
        role: "JUGGERNAUT",
        at: at(6, 3),
        hp: 4,
        frozen: { turnsLeft: 1 },
      },
    ]);
    const run = attackV7(state, at(5, 4), at(5, 3));
    const fighter = unitAtV7(state, at(4, 3));
    const giant = unitAtV7(state, at(6, 3));
    expect(run.combat.splash[0]).toEqual({
      unitId: fighter.id,
      at: at(4, 3),
      damage: 11,
      dies: true,
      shieldDamage: 0,
      shatters: true,
    });
    // The Juggernaut is never shattered: its flank hit is plain damage.
    expect(run.combat.splash[1]).toMatchObject({ unitId: giant.id });
    expect(run.combat.splash[1]).not.toHaveProperty("shatters");
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: fighter.id,
      cause: "SHATTER",
    });
    expect(
      run.events.some(
        (event) =>
          event.kind === "GRAVE_CREATED" &&
          "unitId" in event &&
          event.unitId === fighter.id,
      ),
    ).toBe(false);
    // A shattered flank Bomb Chucker does not explode.
    const goblin = iceFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 4), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(4, 3), frozen: { turnsLeft: 1 } },
      ],
      { factions: ["ICE_FOLK", "GOBLIN"] },
    );
    // (A Mammoth at 4 HP: the full-HP one's 8 kills the Bomb Chucker by
    // plain damage.)
    const chucker = attackV7(goblin, at(5, 4), at(5, 3));
    expect(chucker.combat.splash[0]).toMatchObject({
      dies: true,
      shatters: true,
    });
    expect(kindsV7(chucker.events)).not.toContain("EXPLOSION_RESOLVED");
  });

  it("each flank hit is the Mammoth's own attack on that unit, with its Armoured", () => {
    // An Ankylosaurus (Armoured) on a flank.
    const state = iceFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 5) },
      ],
      { factions: ["ICE_FOLK", "DINOSAUR"] },
    );
    const view = viewForV7(state, activeIdV7(state));
    const mammoth = unitAtV7(state, at(4, 4)).id;
    const alone = queryCombatPreviewV7(
      view,
      mammoth,
      unitAtV7(state, at(5, 3)).id,
    );
    const run = attackV7(state, at(4, 4), at(5, 4));
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(5, 3)).id,
        at: at(5, 3),
        damage: alone?.damageToDefender,
        dies: alone?.defenderDies,
        shieldDamage: 0,
      },
    ]);
    // Own units on a flank are never hit.
    expect(unitAtV7(run.state, at(5, 5)).hp).toBe(9);
  });
});
