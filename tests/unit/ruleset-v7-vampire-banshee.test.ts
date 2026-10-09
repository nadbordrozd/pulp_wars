import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BAT_ESCAPE_TILES_V7,
  applyCommandV7,
  batEscapeLandingAllowedV7,
  effectiveRoleRuleV7,
  previewWailV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  wailTerrifiesV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { unitAtV7, seatIdV7, sameV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldV7,
  patchTileV7,
  patchUnitV7,
} from "../fixtures/v7-revision20";

// The Vampire and Banshee rework (`pulp_wars-ty6i`,
// docs/product/RULESET_7_CURRENT.md section 17.12): the Vampire's 13 HP,
// Feast, and Bat Escape; the Banshee's Wail at Attack 1.5, Terror, and
// Ethereal. Hand-built two-seat fields (11 x 11, open Grass outside the
// settlements; rows 0-4 west of x 6 hold none), every tile explored.

const undeadField = (
  pieces: Parameters<typeof fieldV7>[0],
  options: Parameters<typeof fieldV7>[1] = {},
): GameStateV7 =>
  fieldV7(pieces, { factions: ["UNDEAD", "ORIGINAL"], ...options });

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

const attackCommand = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CommandV7 => ({
  kind: "ATTACK",
  unitId: idAt(state, from),
  targetUnitId: idAt(state, to),
});

const moveCommand = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({ kind: "MOVE", unitId: idAt(state, from), path: [...path] });

/**
 * Applies a `MOVE` along exactly `path` for the active player: accepted,
 * and its destination offered (the query offers one cheapest path per
 * destination, which may differ from `path`).
 */
const moveOk = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): GameStateV7 => {
  const command = moveCommand(state, from, path);
  const end = path.at(-1) as CoordV7;
  expect(
    offeredV7(state, "MOVE").some(
      (offered) =>
        offered.kind === "MOVE" &&
        offered.unitId === idAt(state, from) &&
        sameV7(offered.path.at(-1) as CoordV7, end),
    ),
    `${end.x},${end.y} offered`,
  ).toBe(true);
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (!result.accepted) throw new Error(`MOVE rejected: ${result.error.code}`);
  expect(unitAtV7(result.state, end).id).toBe(idAt(state, from));
  return result.state;
};

const unitCommands = (state: GameStateV7, unitId: number) =>
  offeredV7(state).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );

describe("the rework: roster", () => {
  it("gives the Vampire 13 HP, Feast, and a two-tile Bat Escape, and the Banshee Attack 1.5, Terror, and Ethereal", () => {
    const vampire = effectiveRoleRuleV7("KNIGHT", "UNDEAD");
    expect([vampire.cost, vampire.maxHp, vampire.attack2]).toEqual([9, 13, 6]);
    expect(vampire.abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "LIFESTEAL",
      "UNANSWERED",
      "ESCAPE",
      "FEAST",
    ]);
    expect(roleMechanicsV7("KNIGHT", "UNDEAD").batEscapeTiles).toBe(
      BAT_ESCAPE_TILES_V7,
    );
    expect(BAT_ESCAPE_TILES_V7).toBe(2);
    const banshee = effectiveRoleRuleV7("MARKSMAN", "UNDEAD");
    expect([banshee.cost, banshee.maxHp, banshee.attack2]).toEqual([3, 8, 3]);
    expect(banshee.abilities).toEqual([
      "CAPTURE",
      "WAIL",
      "TERROR",
      "ETHEREAL",
    ]);
    expect(roleMechanicsV7("MARKSMAN", "UNDEAD").ignoresZocStops).toBe(true);
    // No other role of any faction has these.
    expect(roleMechanicsV7("KNIGHT", "ORIGINAL").batEscapeTiles).toBe(0);
    expect(roleMechanicsV7("RAIDER", "ORIGINAL").batEscapeTiles).toBe(0);
    expect(effectiveRoleRuleV7("KNIGHT", "ORIGINAL").abilities).not.toContain(
      "FEAST",
    );
  });
});

describe("the rework: Feast", () => {
  // Vampire (3, 2) at 5 of 13 HP; a 1-HP Human Fighter (4, 2) and a 1-HP
  // Guard (5, 2) east of it, and a full Fighter (6, 3) beyond.
  const feastField = () =>
    undeadField([
      { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
      { seat: 1, role: "GUARD", at: at(5, 2), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);

  it("heals the Vampire fully after a kill and allows one more attack, offered and previewed", () => {
    const state = feastField();
    const vampireId = idAt(state, at(3, 2));
    const first = attackV7(state, at(3, 2), at(4, 2));
    expect(first.combat).toMatchObject({
      defenderDies: true,
      advances: true,
      feast: true,
      attackerHeal: 8,
      attacksUsed: 1,
      attacksRemaining: 1,
      escapeAvailable: true,
      overrunContinues: false,
    });
    expect(first.attacker).toMatchObject({ at: at(4, 2), hp: 13, kills: 1 });
    expect(first.attacker?.activation).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      escapeAvailable: true,
      overrunActive: false,
      handled: false,
    });
    expect(first.state.feastedThisTurn).toEqual([vampireId]);
    const view = activeViewV7(first.state);
    expect(view.feastedThisTurn).toEqual([vampireId]);
    expect(
      publicUnitStatsV7(first.state, unitAtV7(first.state, at(4, 2))).statuses,
    ).toEqual(
      expect.arrayContaining([
        "Feast: may attack again",
        "Escape: may fly up to 2 tiles",
      ]),
    );
    // The Feast attack is offered and previewed; Bat Escape too.
    const offered = unitCommands(first.state, vampireId);
    expect(offered).toContainEqual(
      attackCommand(first.state, at(4, 2), at(5, 2)),
    );
    expect(offered.some((command) => command.kind === "MOVE")).toBe(true);
    // The second attack kills too: a full heal again, no third attack, and
    // Bat Escape stays available.
    const wounded = patchUnitV7(first.state, at(4, 2), { hp: 6 });
    expect(wounded.feastedThisTurn).toEqual([vampireId]);
    const second = attackV7(wounded, at(4, 2), at(5, 2));
    expect(second.combat).toMatchObject({
      defenderDies: true,
      feast: true,
      attackerHeal: 7,
      attacksUsed: 2,
      attacksRemaining: 0,
      escapeAvailable: true,
    });
    expect(second.attacker).toMatchObject({ at: at(5, 2), hp: 13, kills: 2 });
    expect(second.attacker?.activation).toMatchObject({
      attacksUsed: 2,
      escapeAvailable: true,
      handled: false,
    });
    // At most two attacks a turn: the full Fighter next to it is not
    // attackable, and the Vampire's only commands are its escape Moves (and
    // the turn-level commands).
    expect(
      rejectedV7(second.state, attackCommand(second.state, at(5, 2), at(6, 3))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
    expect(
      queryCombatPreviewV7(
        activeViewV7(second.state),
        vampireId,
        idAt(second.state, at(6, 3)),
      ),
    ).toBeNull();
    const after = unitCommands(second.state, vampireId);
    expect(after.length).toBeGreaterThan(0);
    expect(
      after.every(
        (command) => command.kind === "MOVE" || command.kind === "WAIT",
      ),
    ).toBe(true);
    expectOfferedAcceptedV7(second.state, "MOVE");
    // End Turn empties the list.
    const ended = applyCommandV7(second.state, activeIdV7(second.state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.feastedThisTurn).toEqual([]);
  });

  it("gives nothing for an attack that does not kill", () => {
    const state = undeadField([
      { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 5 },
      { seat: 1, role: "GUARD", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(3, 1), hp: 1 },
    ]);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({
      defenderDies: false,
      feast: false,
      attacksRemaining: 0,
      escapeAvailable: true,
    });
    // Lifesteal only.
    expect(run.combat.attackerHeal).toBe(run.combat.damageToDefender);
    expect(run.state.feastedThisTurn).toEqual([]);
    expect(
      rejectedV7(run.state, attackCommand(run.state, at(3, 2), at(3, 1))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
  });

  it("ends with the Bat Escape or a Wait", () => {
    const state = feastField();
    const first = attackV7(state, at(3, 2), at(4, 2));
    const vampireId = idAt(first.state, at(4, 2));
    const flown = moveOk(first.state, at(4, 2), [at(4, 3)]);
    expect(flown.feastedThisTurn).toEqual([vampireId]);
    expect(unitAtV7(flown, at(4, 3)).activation).toMatchObject({
      escapeAvailable: false,
      handled: true,
    });
    expect(
      rejectedV7(flown, attackCommand(flown, at(4, 3), at(5, 2))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
    const waited = playV7(first.state, { kind: "WAIT", unitId: vampireId });
    expect(
      rejectedV7(waited.state, attackCommand(waited.state, at(4, 2), at(5, 2))),
    ).toMatchObject({ code: "UNIT_ALREADY_ACTED" });
  });

  it("counts each Feast kill once in the score ledger", () => {
    const state = feastField();
    const undead = seatIdV7(state, 0);
    const human = seatIdV7(state, 1);
    const ledger = (after: GameStateV7, id: PlayerId) =>
      after.scoreLedger.find((entry) => entry.playerId === id);
    const fighter = effectiveRoleRuleV7("FIGHTER", "ORIGINAL").cost ?? 0;
    const guard = effectiveRoleRuleV7("GUARD", "ORIGINAL").cost ?? 0;
    const first = attackV7(state, at(3, 2), at(4, 2));
    expect(ledger(first.state, undead)).toMatchObject({
      killValue: fighter,
      hpLost: 0,
    });
    expect(ledger(first.state, human)).toMatchObject({ lossValue: fighter });
    const second = attackV7(first.state, at(4, 2), at(5, 2));
    expect(ledger(second.state, undead)).toMatchObject({
      killValue: fighter + guard,
      lossValue: 0,
      hpLost: 0,
    });
    expect(ledger(second.state, human)).toMatchObject({
      lossValue: fighter + guard,
    });
  });

  it("keeps the Normal AI legal with a Feast pending", () => {
    const first = attackV7(feastField(), at(3, 2), at(4, 2));
    const view = activeViewV7(first.state);
    const legal = queryPlayerCommandsV7(view);
    const decision = chooseNormalCommandV7(view);
    for (const candidate of decision.candidates)
      expect(legal).toContainEqual(candidate.command);
    if (decision.command !== null)
      expect(
        applyCommandV7(first.state, activeIdV7(first.state), decision.command)
          .accepted,
      ).toBe(true);
  });
});

describe("the rework: Frozen and Frostbite", () => {
  const iceField = (pieces: Parameters<typeof fieldV7>[0]) =>
    fieldV7(pieces, { factions: ["UNDEAD", "ICE_FOLK"] });

  it("lets a Frozen Vampire neither Feast nor Escape", () => {
    const state = iceField([
      { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
    ]);
    const first = attackV7(state, at(3, 2), at(4, 2));
    expect(first.combat.feast).toBe(true);
    const vampire = unitAtV7(first.state, at(4, 2));
    const frozen = checkedV7({
      ...first.state,
      frozen: [{ unitId: vampire.id, turnsLeft: 1 }],
    });
    expect(
      rejectedV7(frozen, attackCommand(frozen, at(4, 2), at(5, 2))),
    ).toMatchObject({ code: "UNIT_FROZEN" });
    expect(
      rejectedV7(frozen, moveCommand(frozen, at(4, 2), [at(4, 3)])),
    ).toMatchObject({ code: "UNIT_FROZEN" });
    expect(unitCommands(frozen, vampire.id)).toEqual(
      unitCommands(frozen, vampire.id).filter(
        (command) => command.kind !== "ATTACK" && command.kind !== "MOVE",
      ),
    );
    expect(publicUnitStatsV7(frozen, vampire).statuses).not.toContain(
      "Feast: may attack again",
    );
  });

  it("gives no Feast for a kill that Frostbite freezes", () => {
    // A 1-HP Musk Ox: the adjacent kill still Frostbites the Vampire.
    const state = iceField([
      { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 5 },
      { seat: 1, role: "GUARD", at: at(4, 2), hp: 1 },
    ]);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({
      defenderDies: true,
      frostbiteApplied: true,
      feast: false,
      attacksRemaining: 0,
      escapeAvailable: false,
    });
    expect(run.combat.attackerHeal).toBe(1);
    expect(run.state.feastedThisTurn).toEqual([]);
  });
});

describe("the rework: Bat Escape", () => {
  // Vampire (3, 2) strikes a full Guard (3, 1) and survives; an own
  // Skeleton (3, 3), enemy Fighters (4, 3) and (2, 4), water (2, 1),
  // (1, 2), and (0, 2).
  const escapeField = (options: Parameters<typeof fieldV7>[1] = {}) => {
    const state = undeadField(
      [
        { seat: 0, role: "KNIGHT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(3, 1) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 4) },
      ],
      { water: [at(2, 1), at(1, 2), at(0, 2)], ...options },
    );
    return playV7(state, attackCommand(state, at(3, 2), at(3, 1))).state;
  };

  it("flies up to two tiles over any unit and through enemy zones of control", () => {
    const state = escapeField();
    // Over the own Skeleton, then into and through hostile zones of
    // control (next to both enemy Fighters).
    const overOwn = moveOk(state, at(3, 2), [at(3, 3), at(3, 4)]);
    expect(unitAtV7(overOwn, at(3, 4)).activation).toMatchObject({
      escapeAvailable: false,
      handled: true,
    });
    // Over an enemy Fighter.
    moveOk(state, at(3, 2), [at(4, 3), at(5, 4)]);
    // Next to an enemy and on, and over water, ending on land.
    moveOk(state, at(3, 2), [at(2, 3), at(1, 4)]);
    moveOk(state, at(3, 2), [at(2, 1), at(1, 0)]);
    // At most two tiles, whatever the Roads: never its whole Move 3.
    expect(
      rejectedV7(
        state,
        moveCommand(state, at(3, 2), [at(4, 2), at(5, 2), at(6, 2)]),
      ),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BUDGET_EXCEEDED" },
    });
  });

  it("never lands on water, a unit, or a Barricade", () => {
    const state = escapeField();
    expect(
      rejectedV7(state, moveCommand(state, at(3, 2), [at(2, 2), at(1, 2)])),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BAT_ESCAPE_LANDING" },
    });
    expect(
      rejectedV7(state, moveCommand(state, at(3, 2), [at(3, 3)])),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "OCCUPIED" },
    });
    expect(
      rejectedV7(state, moveCommand(state, at(3, 2), [at(4, 3)])),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "OCCUPIED" },
    });
    // The query offers exactly what the reducer accepts: never a water or
    // occupied tile, and the tiles past the units and zones of control.
    const vampireId = idAt(state, at(3, 2));
    const moves = expectOfferedAcceptedV7(state, "MOVE").filter(
      (command) => command.kind === "MOVE" && command.unitId === vampireId,
    );
    const ends = moves.flatMap((command) =>
      command.kind === "MOVE" ? [command.path.at(-1) as CoordV7] : [],
    );
    for (const end of [
      at(2, 1),
      at(1, 2),
      at(0, 2),
      at(3, 3),
      at(4, 3),
      at(2, 4),
    ])
      expect(ends.some((where) => sameV7(where, end))).toBe(false);
    for (const end of [at(3, 4), at(5, 4), at(1, 4), at(1, 0)])
      expect(
        ends.some((where) => sameV7(where, end)),
        `${end.x},${end.y} in ${JSON.stringify(ends)}`,
      ).toBe(true);
    for (const command of moves)
      if (command.kind === "MOVE")
        expect(command.path.length).toBeLessThanOrEqual(2);

    // A Barricade (a Dwarf seat's) blocks the landing.
    const dwarf = fieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(3, 1) },
      ],
      { factions: ["UNDEAD", "DWARF"] },
    );
    const struck = playV7(dwarf, attackCommand(dwarf, at(3, 2), at(3, 1)));
    const barricaded = checkedV7({
      ...struck.state,
      barricades: [{ at: at(4, 4), ownerId: seatIdV7(dwarf, 1), hp: 10 }],
    });
    expect(
      rejectedV7(
        barricaded,
        moveCommand(barricaded, at(3, 2), [at(4, 3), at(4, 4)]),
      ),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BARRICADE" },
    });
  });

  it("lands only on a land tile it may stand on, never on a curiosity", () => {
    const base = {
      explored: true,
      ice: false,
      engineering: false,
      mountainBorn: false,
      curiosity: false,
    };
    expect(batEscapeLandingAllowedV7({ ...base, terrain: "GRASS" })).toBe(true);
    expect(batEscapeLandingAllowedV7({ ...base, terrain: "FOREST" })).toBe(
      true,
    );
    expect(
      batEscapeLandingAllowedV7({ ...base, terrain: "GRASS", curiosity: true }),
    ).toBe(false);
    expect(
      batEscapeLandingAllowedV7({ ...base, terrain: "GRASS", explored: false }),
    ).toBe(false);
    expect(batEscapeLandingAllowedV7({ ...base, terrain: "RIFT" })).toBe(false);
    expect(
      batEscapeLandingAllowedV7({ ...base, terrain: "SHALLOW_WATER" }),
    ).toBe(false);
    expect(batEscapeLandingAllowedV7({ ...base, terrain: "DEEP_WATER" })).toBe(
      false,
    );
    expect(
      batEscapeLandingAllowedV7({
        ...base,
        terrain: "SHALLOW_WATER",
        ice: true,
      }),
    ).toBe(true);
    expect(batEscapeLandingAllowedV7({ ...base, terrain: "MOUNTAIN" })).toBe(
      false,
    );
    expect(
      batEscapeLandingAllowedV7({
        ...base,
        terrain: "MOUNTAIN",
        engineering: true,
      }),
    ).toBe(true);
  });

  it("is not stopped by terrain in flight, and an ordinary Move is unchanged", () => {
    // A Forest on (2, 2) would end a walking Move there.
    const state = patchTileV7(escapeField(), at(2, 2), {
      terrain: "FOREST",
      biome: "WOODLAND",
    });
    moveOk(state, at(3, 2), [at(2, 2), at(1, 1)]);
    // Before its attack the Vampire walks as before: Move 3, stopped by
    // zones of control, never through an enemy.
    const fresh = undeadField([
      { seat: 0, role: "KNIGHT", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
    ]);
    moveOk(fresh, at(3, 2), [at(2, 2), at(1, 2), at(0, 2)]);
    expect(
      rejectedV7(fresh, moveCommand(fresh, at(3, 2), [at(4, 3), at(5, 4)])),
    ).toMatchObject({ code: "MOVEMENT_ILLEGAL" });
    expect(
      rejectedV7(fresh, moveCommand(fresh, at(3, 2), [at(4, 2), at(5, 2)])),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ZOC_STOPS_MOVE" },
    });
  });
});

describe("the rework: Terror", () => {
  // Banshee (3, 2); a full Fighter (4, 2) survives the Wail, a 1-HP Fighter
  // (2, 2) dies; an own Skeleton (5, 3) then attacks (4, 2).
  const terrorField = () =>
    undeadField([
      { seat: 0, role: "MARKSMAN", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(2, 2), hp: 1 },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
    ]);

  it("keeps every enemy the Wail wounds from striking back this turn", () => {
    const state = terrorField();
    const survivor = idAt(state, at(4, 2));
    const banshee = idAt(state, at(3, 2));
    // Without the Wail, the Skeleton's attack is answered.
    const answered = attackV7(state, at(5, 3), at(4, 2));
    expect(answered.combat).toMatchObject({
      retaliation: true,
      noRetaliationReason: null,
    });
    const preview = previewWailV7(activeViewV7(state), banshee);
    expect(
      preview?.targets.map((target) => [
        target.unitId,
        target.dies,
        target.terror,
      ]),
    ).toEqual([
      [idAt(state, at(2, 2)), true, false],
      [survivor, false, true],
    ]);
    const wailed = playV7(state, { kind: "WAIL", unitId: banshee });
    expect(wailed.events[0]).toMatchObject({
      kind: "WAIL_RESOLVED",
      terrified: [survivor],
    });
    expect(wailed.state.terrorThisTurn).toEqual([survivor]);
    expect(activeViewV7(wailed.state).terrorThisTurn).toEqual([survivor]);
    expect(
      publicUnitStatsV7(wailed.state, unitAtV7(wailed.state, at(4, 2)))
        .statuses,
    ).toContain("Terror: will not strike back this turn");
    // The Skeleton's attack is now unanswered, and the public preview says
    // why (attackV7 checks that it equals the resolution).
    const run = attackV7(wailed.state, at(5, 3), at(4, 2));
    expect(run.combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "TERROR",
      damageToAttacker: 0,
    });
    // The Human player sees the mark in its own view too.
    expect(viewForV7(wailed.state, seatIdV7(state, 1)).terrorThisTurn).toEqual([
      survivor,
    ]);
    // It ends with the Undead turn.
    const ended = applyCommandV7(wailed.state, activeIdV7(wailed.state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.terrorThisTurn).toEqual([]);
  });

  it("terrifies no target it does not wound", () => {
    // A 1-HP Banshee deals a full Juggernaut 0.
    const state = undeadField([
      { seat: 0, role: "MARKSMAN", at: at(3, 2), hp: 1 },
      { seat: 1, role: "JUGGERNAUT", at: at(4, 2) },
    ]);
    const wailed = playV7(state, {
      kind: "WAIL",
      unitId: idAt(state, at(3, 2)),
    });
    expect(wailed.events[0]).toMatchObject({
      kind: "WAIL_RESOLVED",
      results: [{ damage: 0 }],
      terrified: [],
    });
    expect(wailed.state.terrorThisTurn).toEqual([]);
  });
});

describe("the rework: Ethereal", () => {
  // A Road along row 3 (x 2-4, outside every territory); an enemy Fighter
  // (3, 2) puts (3, 3) in its zone of control.
  const roadField = (role: "MARKSMAN" | "FIGHTER") => {
    let state = undeadField([
      { seat: 0, role, at: at(2, 3) },
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
    ]);
    for (const x of [2, 3, 4])
      state = patchTileV7(state, at(x, 3), { road: true });
    return state;
  };

  it("lets a Banshee move through enemy zones of control, unlike a Skeleton", () => {
    const banshee = roadField("MARKSMAN");
    playV7(banshee, moveCommand(banshee, at(2, 3), [at(3, 3), at(4, 3)]));
    const skeleton = roadField("FIGHTER");
    expect(
      rejectedV7(
        skeleton,
        moveCommand(skeleton, at(2, 3), [at(3, 3), at(4, 3)]),
      ),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ZOC_STOPS_MOVE" },
    });
    // It still never ends on, or passes, an enemy.
    expect(
      rejectedV7(banshee, moveCommand(banshee, at(2, 3), [at(3, 2)])),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "OCCUPIED" },
    });
  });
});

describe("the rework: mind control", () => {
  // A Martian Brain (4, 3) controls an Undead Vampire (5, 3) or Banshee.
  const controlled = (role: "KNIGHT" | "MARKSMAN") =>
    martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3) },
        { seat: 1, role, at: at(5, 3), hp: 5, controlledBy: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(7, 3), hp: 1 },
      ],
      { factions: ["MARTIAN", "UNDEAD"] },
    );

  it("lets a controlled Vampire Feast and Bat Escape by its own role rules", () => {
    const state = controlled("KNIGHT");
    const vampire = unitAtV7(state, at(5, 3));
    expect(vampire.ownerId).toBe(seatIdV7(state, 0));
    expect(unitRoleRuleV7(state, vampire).abilities).toContain("FEAST");
    expect(unitRoleMechanicsV7(state, vampire).batEscapeTiles).toBe(2);
    const first = attackV7(state, at(5, 3), at(6, 3));
    expect(first.combat).toMatchObject({
      feast: true,
      attacksRemaining: 1,
      attackerHeal: 8,
    });
    expect(first.state.feastedThisTurn).toEqual([vampire.id]);
    const second = attackV7(first.state, at(6, 3), at(7, 3));
    expect(second.combat).toMatchObject({ feast: true, attacksRemaining: 0 });
    moveOk(second.state, at(7, 3), [at(8, 2), at(9, 1)]);
  });

  it("lets a controlled Banshee keep Terror and Ethereal", () => {
    const state = controlled("MARKSMAN");
    const banshee = unitAtV7(state, at(5, 3));
    expect(unitRoleRuleV7(state, banshee).abilities).toEqual([
      "CAPTURE",
      "WAIL",
      "TERROR",
      "ETHEREAL",
    ]);
    expect(wailTerrifiesV7(state, banshee)).toBe(true);
    expect(unitRoleMechanicsV7(state, banshee).ignoresZocStops).toBe(true);
  });
});
