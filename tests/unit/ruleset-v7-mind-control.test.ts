import { describe, expect, it } from "vitest";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import {
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_LIMIT_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  isMindControlledV7,
  isSnowV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewCityCapacityV7,
  previewDisbandV7,
  previewMindControlV7,
  projectEventsV7,
  publicUnitStatsV7,
  releaseControlledV7,
  runReplayV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  kindsV7,
  patchUnitV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md, engine
// step of `pulp_wars-b5f.3`): a mind-controlled unit keeps its type and
// abilities, fights for the Brain's owner, and goes back to its original
// owner when the Brain is lost.

const BRAIN = at(4, 3);
const FAR: MartianPieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const deaths = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) =>
    event.kind === "UNIT_DIED"
      ? [{ unitId: event.unitId, cause: event.cause }]
      : [],
  );

const control = (
  state: GameStateV7,
  brain: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "MIND_CONTROL",
  unitId: idAt(state, brain),
  targetUnitId: idAt(state, target),
});

/** A Brain of seat 0 on (4, 3) with the given other pieces. */
const brainField = (
  more: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
  brain: Partial<MartianPieceV7> = {},
) =>
  martianFieldV7(
    [{ seat: 0, role: "CAPTAIN", at: BRAIN, ...brain }, ...more],
    options,
  );

/**
 * A Brain of seat 0 on (4, 3) controlling a unit of seat 1 (its original
 * owner, of `enemy`'s kind) on `where`.
 */
const controlledField = (
  enemy: FactionIdV7,
  piece: Omit<MartianPieceV7, "seat" | "controlledBy"> & {
    readonly seat?: number;
  },
  more: readonly MartianPieceV7[] = [],
  options: MartianFieldOptionsV7 = {},
) =>
  brainField([{ seat: 1, ...piece, controlledBy: BRAIN }, ...more], {
    factions: ["MARTIAN", enemy],
    ...options,
  });

const parse = (state: GameStateV7, patch: Readonly<Record<string, unknown>>) =>
  parseGameStateV7(JSON.parse(JSON.stringify({ ...state, ...patch })));

describe("Mind Control revision: the kind resolver (section 2)", () => {
  const cases: readonly [FactionIdV7, UnitRoleIdV7, string][] = [
    ["GOBLIN", "FIGHTER", "Goblin"],
    ["ORIGINAL", "KNIGHT", "Knight"],
    ["UNDEAD", "GUARD", "Zombie"],
    ["ICE_FOLK", "CAPTAIN", "Ice Witch"],
    ["DWARF", "GUARD", "Steam Mole"],
  ];

  it.each(cases)(
    "a controlled %s %s resolves label, stats, abilities, mechanics, blocks, and movement through its kind",
    (enemy, role, label) => {
      const state = controlledField(enemy, { role, at: at(5, 3), hp: 4 });
      const unit = unitAtV7(state, at(5, 3));
      const martian = seatIdV7(state, 0);
      const original = seatIdV7(state, 1);
      expect(unit.ownerId).toBe(martian);
      expect(state.mindControlled).toEqual([
        {
          unitId: unit.id,
          brainUnitId: idAt(state, BRAIN),
          originalOwnerId: original,
        },
      ]);
      expect(isMindControlledV7(state, unit.id)).toBe(true);
      expect(unitFactionV7(state, unit)).toBe(enemy);
      const rule = unitRoleRuleV7(state, unit);
      expect(rule.label).toBe(label);
      expect(rule.maxHp).toBe(unit.maxHp);
      // The kind's abilities, less the unit-creating ones (section 5.1).
      const kindRule = unitRoleRuleV7(
        { players: state.players, mindControlled: [] },
        { id: unit.id, ownerId: original, role },
      );
      expect(rule.abilities).toEqual(
        kindRule.abilities.filter(
          (ability) => !MIND_CONTROLLED_LOST_ABILITIES_V7.includes(ability),
        ),
      );
      expect(unitRoleMechanicsV7(state, unit)).toEqual(
        unitRoleMechanicsV7(
          { players: state.players, mindControlled: [] },
          { id: unit.id, ownerId: original, role },
        ),
      );
      expect(unitMovementModeV7(state, unit)).toBe("GROUND");
      // Without an entry the same unit resolves through its owner.
      const bare = { players: state.players, mindControlled: [] };
      expect(unitFactionV7(bare, unit)).toBe("MARTIAN");
      // Public unit stats: the kind's blocks, no Martian block, the control.
      const stats = publicUnitStatsV7(state, unit);
      expect(stats.stats[0]?.base.sourceLabel).toBe(`${label} base`);
      expect(stats.martian).toBeUndefined();
      expect(stats.goblin !== undefined).toBe(enemy === "GOBLIN");
      expect(stats.iceFolk !== undefined).toBe(enemy === "ICE_FOLK");
      expect(stats.dwarf !== undefined).toBe(enemy === "DWARF");
      expect(stats.mindControl).toEqual({
        brainUnitId: idAt(state, BRAIN),
        originalOwnerId: original,
      });
      // Unit-level technology: the controller's research, the kind's tree.
      const researched = state.players.find(
        (player) => player.id === martian,
      )?.researchedTechs;
      expect(
        unitCapabilitiesV7(state, unit, researched ?? []).roleSightRadius,
      ).toBeDefined();
      // The view resolves the kind the same way, for both seats.
      for (const viewer of [martian, original]) {
        const view = viewForV7(state, viewer);
        const seen = view.units.find((candidate) => candidate.id === unit.id);
        expect(seen && unitFactionV7(view, seen)).toBe(enemy);
        expect(view.mindControlled).toEqual(state.mindControlled);
      }
    },
  );

  it("an uncontrolled unit and a match without a Martian seat resolve through the owner", () => {
    const state = martianFieldV7(
      [{ seat: 0, role: "KNIGHT", at: at(5, 3) }, FAR],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    expect(state.mindControlled).toEqual([]);
    for (const unit of state.units)
      expect(unitFactionV7(state, unit)).toBe(
        state.players.find((player) => player.id === unit.ownerId)?.faction,
      );
    // The `mindControl` stats field exists only with a Martian seat.
    expect(
      publicUnitStatsV7(state, unitAtV7(state, at(5, 3))),
    ).not.toHaveProperty("mindControl");
    const martian = brainField([FAR]);
    expect(
      publicUnitStatsV7(martian, unitAtV7(martian, BRAIN)).mindControl,
    ).toBeNull();
  });
});

describe("Mind Control revision: legality (section 3)", () => {
  it("the constants", () => {
    expect([
      MIND_CONTROL_HP_V7,
      MIND_CONTROL_RANGE_V7,
      MIND_CONTROL_COOLDOWN_TURNS_V7,
      MIND_CONTROL_LIMIT_V7,
    ]).toEqual([6, 2, 2, 1]);
    expect([...MIND_CONTROLLED_LOST_ABILITIES_V7]).toEqual([
      "RAISE_DEAD",
      "INFECT",
      "BITE",
      "HATCH",
      "ASSEMBLE",
      "MIND_CONTROL",
      "RIDES_TUNNEL",
    ]);
  });

  it("row 6: a Brain that controls a unit already is offered nothing and rejected with CONTROL_LIMIT", () => {
    const state = controlledField(
      "ORIGINAL",
      { role: "FIGHTER", at: at(3, 3), hp: 5 },
      [{ seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 }],
    );
    expect(offeredV7(state, "MIND_CONTROL")).toEqual([]);
    expect(rejectedV7(state, control(state, BRAIN, at(6, 3)))).toEqual({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "CONTROL_LIMIT" },
    });
    // The cooldown comes first (row 5 before row 6).
    const cooling = controlledField(
      "ORIGINAL",
      { role: "FIGHTER", at: at(3, 3), hp: 5 },
      [{ seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 }],
    );
    const onCooldown = checkedV7({
      ...cooling,
      mindControlCooldowns: [
        { unitId: idAt(cooling, BRAIN), turnsRemaining: 1 },
      ],
    });
    expect(
      rejectedV7(onCooldown, control(onCooldown, BRAIN, at(6, 3))).params,
    ).toEqual({ reason: "COOLDOWN" });
  });

  it("rows 11 and 12: more than 6 HP, or unhurt, is TARGET_HEALTHY", () => {
    const state = brainField(
      [
        // An Orc Brute at 7 of 15 HP: wounded but too healthy.
        { seat: 1, role: "GUARD", at: at(6, 3), hp: 7 },
        // A Goblin at its full 6 HP: within 6 but unhurt.
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 6 },
        // 5 of 6: wounded and weak enough.
        { seat: 1, role: "FIGHTER", at: at(3, 2), hp: 5 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    expect(rejectedV7(state, control(state, BRAIN, at(6, 3))).params).toEqual({
      reason: "TARGET_HEALTHY",
    });
    expect(rejectedV7(state, control(state, BRAIN, at(5, 2))).params).toEqual({
      reason: "TARGET_HEALTHY",
    });
    expect(expectOfferedAcceptedV7(state, "MIND_CONTROL")).toEqual([
      control(state, BRAIN, at(3, 2)),
    ]);
  });

  it("row 9: an already-controlled unit is immune; row 1: a controlled Brain is UNIT_ROLE_INVALID", () => {
    // Two Martian seats: seat 1's Brain controls one of seat 0's Grunts, and
    // seat 0's Brain controls seat 1's second Brain.
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "CAPTAIN", at: at(5, 3), hp: 4, controlledBy: BRAIN },
        { seat: 1, role: "CAPTAIN", at: at(7, 5) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(6, 4),
          hp: 3,
          controlledBy: at(7, 5),
        },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "MARTIAN"] },
    );
    const controlledBrain = unitAtV7(state, at(5, 3));
    expect(controlledBrain.ownerId).toBe(seatIdV7(state, 0));
    // Row 1: the controlled Brain has no Mind Control at all.
    expect(unitRoleRuleV7(state, controlledBrain).abilities).not.toContain(
      "MIND_CONTROL",
    );
    expect(
      rejectedV7(state, {
        kind: "MIND_CONTROL",
        unitId: controlledBrain.id,
        targetUnitId: idAt(state, at(6, 4)),
      }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } });
    expect(
      offeredV7(state, "MIND_CONTROL").filter(
        (command) =>
          command.kind === "MIND_CONTROL" &&
          command.unitId === controlledBrain.id,
      ),
    ).toEqual([]);
    // But it keeps its Psychic Command (section 5.3).
    expect(offeredV7(state, "RALLY")).toContainEqual({
      kind: "RALLY",
      unitId: controlledBrain.id,
    });
  });

  it("row 9 for an already-controlled target, row by row against the shared predicate", () => {
    // Seat 1's Brain on (7, 4) controls a weakened Grunt of seat 2 next to
    // our free Brain, which is at its limit of zero controlled units.
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "CAPTAIN", at: at(7, 4) },
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        {
          seat: 2,
          role: "FIGHTER",
          at: at(5, 4),
          hp: 3,
          controlledBy: at(7, 4),
        },
        { seat: 2, role: "FIGHTER", at: at(3, 4), hp: 3 },
      ],
      { factions: ["MARTIAN", "MARTIAN", "ORIGINAL"] },
    );
    expect(unitAtV7(state, at(5, 4)).ownerId).toBe(seatIdV7(state, 1));
    expect(rejectedV7(state, control(state, BRAIN, at(5, 4)))).toEqual({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
    });
    // Offered exactly when accepted, for every unit on the board.
    const offered = expectOfferedAcceptedV7(state, "MIND_CONTROL");
    const actor = activeIdV7(state);
    for (const unit of state.units)
      expect(
        offered.some(
          (command) =>
            command.kind === "MIND_CONTROL" &&
            command.unitId === idAt(state, BRAIN) &&
            command.targetUnitId === unit.id,
        ),
        `${unit.role} ${unit.at.x},${unit.at.y}`,
      ).toBe(
        applyCommandV7(state, actor, {
          kind: "MIND_CONTROL",
          unitId: idAt(state, BRAIN),
          targetUnitId: unit.id,
        }).accepted,
      );
    expect(offered).toEqual([control(state, BRAIN, at(3, 4))]);
  });
});

describe("Mind Control revision: the result (section 3)", () => {
  it("keeps the unit: ID, HP, maximum HP, kills, veteran, and statuses; no home, exhausted, its slot freed", () => {
    // Three seats: the Knight is Human, the Lich and the Zombie Undead.
    const base = brainField(
      [
        { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 5, kills: 4 },
        { seat: 2, role: "CATAPULT", at: at(10, 6) },
        { seat: 2, role: "GUARD", at: at(10, 8) },
      ],
      { factions: ["MARTIAN", "ORIGINAL", "UNDEAD"] },
    );
    const knight = unitAtV7(base, at(6, 3));
    const lich = idAt(base, at(10, 6));
    // A veteran Knight (promoted: +5 maximum HP), plagued by a Lich and
    // bitten by a Zombie of the Undead seat.
    const state = checkedV7({
      ...patchUnitV7(base, at(6, 3), { veteran: true, maxHp: 15 }),
      plagued: [{ unitId: knight.id, sourceUnitId: lich, turnsRemaining: 2 }],
      bitten: [
        {
          unitId: knight.id,
          biterPlayerId: seatIdV7(base, 2),
          biterUnitId: idAt(base, at(10, 8)),
        },
      ],
    });
    const before = unitAtV7(state, at(6, 3));
    const home = before.homeCityId;
    if (home === null) throw new Error("the Knight has a home");
    const assigned = previewCityCapacityV7(state, home)?.assigned ?? 0;
    const brain = unitAtV7(state, BRAIN);
    const view = activeViewV7(state);
    const preview = previewMindControlV7(view, brain.id, before.id);
    expect(preview).toEqual({
      unitId: brain.id,
      targetUnitId: before.id,
      at: at(6, 3),
      originalOwnerId: before.ownerId,
      role: "KNIGHT",
      faction: "ORIGINAL",
      hp: 5,
      maxHp: 15,
      controlledAfter: 1,
      controlLimit: 1,
      cooldownTurns: 2,
      releasedUnitIds: [],
    });
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(run.events[0]).toEqual({
      kind: "UNIT_MIND_CONTROLLED",
      playerId: brain.ownerId,
      unitId: brain.id,
      targetUnitId: before.id,
      targetOwnerId: before.ownerId,
      targetRole: "KNIGHT",
      at: at(6, 3),
      hp: 5,
    });
    // No death, Grave, credit, or Coins.
    expect(deaths(run.events)).toEqual([]);
    expect(run.state.graves).toEqual(state.graves);
    expect(run.state.nextEntityId).toBe(state.nextEntityId);
    expect(run.state.players.map((player) => player.coins)).toEqual(
      state.players.map((player) => player.coins),
    );
    const after = unitAtV7(run.state, at(6, 3));
    expect(after).toEqual({
      ...before,
      ownerId: brain.ownerId,
      homeCityId: null,
      captureEligible: false,
      activation: expect.objectContaining({
        moved: true,
        attacked: true,
        handled: true,
      }),
    });
    // The preview equals the result.
    expect({
      at: after.at,
      originalOwnerId: run.state.mindControlled[0]?.originalOwnerId,
      role: after.role,
      faction: unitFactionV7(run.state, after),
      hp: after.hp,
      maxHp: after.maxHp,
      controlledAfter: run.state.mindControlled.length,
    }).toEqual({
      at: preview?.at,
      originalOwnerId: preview?.originalOwnerId,
      role: preview?.role,
      faction: preview?.faction,
      hp: preview?.hp,
      maxHp: preview?.maxHp,
      controlledAfter: preview?.controlledAfter,
    });
    expect(run.state.mindControlled).toEqual([
      {
        unitId: before.id,
        brainUnitId: brain.id,
        originalOwnerId: before.ownerId,
      },
    ]);
    // Statuses stay, the Plague with its source.
    expect(run.state.plagued).toEqual(state.plagued);
    expect(run.state.bitten).toEqual(state.bitten);
    // The old city's slot is free at once.
    expect(previewCityCapacityV7(run.state, home)?.assigned).toBe(assigned - 1);
    expect(run.state.mindControlCooldowns).toEqual([
      { unitId: brain.id, turnsRemaining: 2 },
    ]);
    expect(unitAtV7(run.state, BRAIN).activation.handled).toBe(true);
    // It is the controller's unit from its next Start Turn.
    const next = endTurnUntilV7(
      endTurnUntilV7(run.state, seatIdV7(state, 1)).state,
      brain.ownerId,
    ).state;
    expect(unitAtV7(next, at(6, 3)).activation).toMatchObject({
      moved: false,
      attacked: false,
      handled: false,
    });
  });

  it("reveals the target's sight for the actor", () => {
    const base = brainField([
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 4 },
      FAR,
    ]);
    const state = unexploreV7(base, 0, [at(7, 2), at(7, 3), at(7, 4)]);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    const reveal = run.events.find(
      (event) =>
        event.kind === "TILES_REVEALED" &&
        event.playerId === seatIdV7(state, 0),
    );
    expect(reveal).toMatchObject({
      tiles: expect.arrayContaining([at(7, 2), at(7, 3), at(7, 4)]),
    });
    expect(kindsV7(run.events).indexOf("TILES_REVEALED")).toBeGreaterThan(
      kindsV7(run.events).indexOf("UNIT_MIND_CONTROLLED"),
    );
  });

  it("is projected to the victim's owner even when it sees neither tile", () => {
    const state = brainField([
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 6 },
      FAR,
    ]);
    const blind = unexploreV7(state, 1, [BRAIN, at(6, 3)]);
    const run = applyOkV7(
      blind,
      activeIdV7(blind),
      control(blind, BRAIN, at(6, 3)),
    );
    const envelope = projectEventsV7(
      blind,
      run.state,
      seatIdV7(blind, 1),
      run.events,
    );
    expect(parsePlayerEventEnvelopeV7(envelope)).toEqual({
      ok: true,
      value: envelope,
    });
    expect(
      envelope.events.filter((event) => event.kind === "UNIT_MIND_CONTROLLED"),
    ).toHaveLength(1);
  });
});

describe("Mind Control revision: faction rules under control (section 5)", () => {
  it("a controlled Goblin Kabooms beside its old friends and earns its controller no Plunder", () => {
    const state = controlledField(
      "GOBLIN",
      { role: "FIGHTER", at: at(5, 3), hp: 4 },
      [
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const goblin = idAt(state, at(5, 3));
    expect(offeredV7(state, "KABOOM")).toContainEqual({
      kind: "KABOOM",
      unitId: goblin,
    });
    const run = playV7(state, { kind: "KABOOM", unitId: goblin });
    const blast = run.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(blast).toMatchObject({
      playerId: seatIdV7(state, 0),
      unitId: goblin,
      cause: "KABOOM",
    });
    // The Goblin seat's unit beside it died; Plunder is a seat rule, and the
    // Martian seat has none.
    expect(deaths(run.events)).toContainEqual({
      unitId: idAt(state, at(6, 3)),
      cause: "EXPLOSION",
    });
    expect(kindsV7(run.events)).not.toContain("PLUNDER_AWARDED");
    expect(run.state.mindControlled).toEqual([]);
  });

  it("a controlled Bomb Chucker's death blast fires when it dies, and its killer's seat earns Plunder", () => {
    const state = controlledField(
      "GOBLIN",
      { role: "MARKSMAN", at: at(5, 3), hp: 2 },
      [
        { seat: 1, role: "GUARD", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(6, 3), at(5, 3));
    expect(run.combat.defenderDies).toBe(true);
    expect(
      run.events.find((event) => event.kind === "EXPLOSION_RESOLVED"),
    ).toMatchObject({ unitId: idAt(state, at(5, 3)), cause: "DEATH" });
    expect(
      run.events.find((event) => event.kind === "PLUNDER_AWARDED"),
    ).toMatchObject({ playerId: seatIdV7(state, 1) });
    // Its entry ended with it; the Brain's limit is free again.
    expect(run.state.mindControlled).toEqual([]);
  });

  it("a controlled Necromancer Frenzies but has no Raise Dead", () => {
    const base = controlledField(
      "UNDEAD",
      { role: "CAPTAIN", at: at(5, 3), hp: 4 },
      [
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const state = checkedV7({ ...base, graves: [at(5, 4)] });
    const necromancer = idAt(state, at(5, 3));
    expect(offeredV7(state, "RAISE_DEAD")).toEqual([]);
    expect(
      rejectedV7(state, { kind: "RAISE_DEAD", unitId: necromancer }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } });
    const run = playV7(state, { kind: "RALLY", unitId: necromancer });
    expect(run.events[0]).toMatchObject({
      kind: "UNITS_RALLIED",
      captainId: necromancer,
      unitIds: [idAt(state, at(6, 3))],
    });
    expect(unitAtV7(run.state, at(6, 3)).activation.inspired).toBe(true);
  });

  it("a controlled Zombie neither infects nor bites", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "GUARD", at: at(5, 3), hp: 6, controlledBy: BRAIN },
        // A Human Fighter it kills and a Guard it only wounds.
        { seat: 2, role: "FIGHTER", at: at(6, 3), hp: 1 },
        { seat: 2, role: "GUARD", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "UNDEAD", "ORIGINAL"] },
    );
    const zombie = unitAtV7(state, at(5, 3));
    expect(unitRoleRuleV7(state, zombie).abilities).toEqual([
      "ATTACK",
      "CAPTURE",
    ]);
    const kill = attackV7(state, at(5, 3), at(6, 3));
    expect(kill.combat.defenderInfected).toBe(false);
    expect(kindsV7(kill.events)).not.toContain("UNIT_INFECTED");
    expect(deaths(kill.events)).toEqual([
      { unitId: idAt(state, at(6, 3)), cause: "ATTACK" },
    ]);
    const wound = attackV7(state, at(5, 3), at(5, 4));
    expect(wound.combat.defenderBitten).toBe(false);
    expect(wound.state.bitten).toEqual([]);
  });

  it("a controlled Mole tunnels alone and a controlled Hammerer cannot ride", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 0, role: "CAPTAIN", at: at(3, 5) },
        { seat: 1, role: "GUARD", at: at(5, 3), hp: 6, controlledBy: BRAIN },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(4, 4),
          hp: 6,
          controlledBy: at(3, 5),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "DWARF"] },
    );
    const mole = idAt(state, at(5, 3));
    const hammerer = unitAtV7(state, at(4, 4));
    expect(unitRoleRuleV7(state, hammerer).abilities).not.toContain(
      "RIDES_TUNNEL",
    );
    const tunnels = expectOfferedAcceptedV7(state, "TUNNEL");
    expect(tunnels.length).toBeGreaterThan(0);
    for (const command of tunnels)
      expect(command.kind === "TUNNEL" && command.rider).toBeNull();
    const first = tunnels[0] as Extract<CommandV7, { kind: "TUNNEL" }>;
    expect(
      rejectedV7(state, {
        ...first,
        rider: { unitId: hammerer.id, to: at(first.to.x, first.to.y + 1) },
      }).code,
    ).toBe("TUNNEL_NOT_LEGAL");
    // It burrows for its controller and stays controlled underground.
    const run = playV7(state, first);
    expect(run.state.burrowed).toEqual([
      {
        unit: expect.objectContaining({
          id: mole,
          ownerId: seatIdV7(state, 0),
        }),
        moleUnitId: null,
      },
    ]);
    expect(run.state.mindControlled.map((entry) => entry.unitId)).toContain(
      mole,
    );
  });

  it("a controlled Engineer repairs but cannot Assemble", () => {
    const state = controlledField(
      "DWARF",
      { role: "CAPTAIN", at: at(5, 3), hp: 4 },
      [
        { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 5 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const engineer = idAt(state, at(5, 3));
    expect(offeredV7(state, "ASSEMBLE")).toEqual([]);
    expect(
      rejectedV7(state, { kind: "ASSEMBLE", unitId: engineer, to: at(6, 2) }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } });
    const run = playV7(state, { kind: "TEND_WOUNDED", unitId: engineer });
    expect(run.events[0]).toMatchObject({
      kind: "WOUNDED_TENDED",
      captainId: engineer,
    });
    expect(unitAtV7(run.state, at(6, 3)).hp).toBe(7);
  });

  it("Charge follows the controller's research; Overrun stays with the Knight", () => {
    const pieces: readonly MartianPieceV7[] = [
      { seat: 1, role: "GUARD", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ];
    const rider = {
      role: "RAIDER" as const,
      at: at(5, 3),
      hp: 4,
      activation: { moved: true, movedPathLength: 2 },
    };
    const charge = (state: GameStateV7) =>
      attackV7(state, at(5, 3), at(6, 3)).combat.chargeApplied;
    expect(charge(controlledField("ORIGINAL", rider, pieces))).toBe(true);
    expect(
      charge(
        controlledField("ORIGINAL", rider, pieces, {
          techs: { 0: [], 1: [] },
        }),
      ),
    ).toBe(false);
    const knight = controlledField("ORIGINAL", {
      role: "KNIGHT",
      at: at(5, 3),
      hp: 4,
    });
    expect(
      unitRoleRuleV7(knight, unitAtV7(knight, at(5, 3))).abilities,
    ).toContain("OVERRUN");
  });

  it("is never disbanded, is promoted by its kind's rules, and captures without being re-homed", () => {
    // Control starts it not capture-eligible; a turn on the village later
    // it is (the patch stands for that).
    const state = patchUnitV7(
      controlledField(
        "ORIGINAL",
        { role: "FIGHTER", at: at(5, 5), hp: 6, kills: 3 },
        [{ seat: 1, role: "FIGHTER", at: at(1, 1) }],
      ),
      at(5, 5),
      { captureEligible: true },
    );
    const unit = idAt(state, at(5, 5));
    expect(rejectedV7(state, { kind: "DISBAND", unitId: unit })).toEqual({
      code: "DISBAND_NOT_LEGAL",
      params: { reason: "MIND_CONTROLLED" },
    });
    expect(previewDisbandV7(state, seatIdV7(state, 0), unit)).toBeNull();
    const promoted = playV7(state, { kind: "PROMOTE", unitId: unit });
    expect(unitAtV7(promoted.state, at(5, 5))).toMatchObject({
      veteran: true,
      maxHp: 17,
      hp: 17,
    });
    const capital = cityOfV7(state, 0);
    const assigned = previewCityCapacityV7(state, capital.id)?.assigned;
    const run = playV7(state, { kind: "CAPTURE", unitId: unit });
    const village = run.state.cities.find((city) => sameV7(city.at, at(5, 5)));
    expect(village?.ownerId).toBe(seatIdV7(state, 0));
    expect(unitAtV7(run.state, at(5, 5)).homeCityId).toBeNull();
    expect(run.state.mindControlled).toEqual(state.mindControlled);
    expect(previewCityCapacityV7(run.state, capital.id)?.assigned).toBe(
      assigned,
    );
  });
});

describe("Mind Control revision: a controlled Ice Witch's Blizzard (section 5.3)", () => {
  // Three seats on the 14 x 14 arena: Martian (capital (2, 2)), Ice Folk
  // (capital (11, 11)), Human (capital (11, 2)). Brain A controls the Witch
  // on (5, 4); Brain B controls an Ice Folk Snow Hunter next to her; Brain C
  // controls a Human Knight. An Ice Folk Yeti of the Ice seat stands next
  // to her too.
  const witchField = (controlled: boolean) =>
    martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 0, role: "CAPTAIN", at: at(3, 6) },
        { seat: 0, role: "CAPTAIN", at: at(8, 4) },
        {
          seat: 1,
          role: "CAPTAIN",
          at: at(5, 4),
          hp: 4,
          ...(controlled ? { controlledBy: BRAIN } : {}),
        },
        {
          seat: 1,
          role: "MARKSMAN",
          at: at(4, 5),
          hp: 4,
          controlledBy: at(3, 6),
        },
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "MARKSMAN", at: at(4, 7) },
        { seat: 0, role: "MARKSMAN", at: at(6, 6) },
        {
          seat: 2,
          role: "KNIGHT",
          at: at(7, 3),
          hp: 4,
          controlledBy: at(8, 4),
        },
      ],
      { factions: ["MARTIAN", "ICE_FOLK", "ORIGINAL"] },
    );

  it("still makes Snow and halves ranged hits only for Ice Folk units of her controller", () => {
    const state = witchField(true);
    // Her Blizzard is a body rule: Snow around her.
    expect(isSnowV7(activeViewV7(state), at(6, 5))).toBe(true);
    // A Martian ray on the Ice seat's Yeti beside her: not halved any more.
    const ray = attackV7(state, at(6, 6), at(6, 4));
    expect(ray.combat.blizzardHalved).toBe(false);
    // While she was the Ice seat's own, the same ray was halved.
    const free = attackV7(witchField(false), at(6, 6), at(6, 4));
    expect(free.combat.blizzardHalved).toBe(true);
    // The Ice seat's Snow Hunter on Brain B's controlled Snow Hunter beside
    // her: halved, because it is an Ice Folk unit of her controller.
    const iceTurn = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    const hunter = attackV7(iceTurn, at(4, 7), at(4, 5));
    expect(hunter.combat.blizzardHalved).toBe(true);
  });

  it("stops the controller's own ground units in her Snow", () => {
    const state = witchField(true);
    // The controlled Knight (a Human kind) enters her Snow and tries to go on.
    expect(
      rejectedV7(state, {
        kind: "MOVE",
        unitId: idAt(state, at(7, 3)),
        path: [at(6, 3), at(6, 2)],
      }),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "SNOW_STOPS_MOVE" },
    });
  });
});

describe("Mind Control revision: release when the Brain is lost (section 4.2)", () => {
  /** A Brain of seat 0 at 1 HP without a Shield, controlling `piece`. */
  const fragile = (
    enemy: FactionIdV7,
    piece: Omit<MartianPieceV7, "seat" | "controlledBy">,
    more: readonly MartianPieceV7[],
    options: MartianFieldOptionsV7 = {},
  ) => controlledField(enemy, piece, more, { activeSeat: 1, ...options });
  const weaken = (state: GameStateV7, hp = 1) =>
    checkedV7({
      ...patchUnitV7(state, BRAIN, { hp }),
      shields: state.shields.filter(
        (entry) => entry.unitId !== idAt(state, BRAIN),
      ),
    });

  it("killed: released right after the Brain's death events and before the advance, exhausted, homeless, revealing", () => {
    const base = fragile(
      "ORIGINAL",
      { role: "FIGHTER", at: at(6, 3), hp: 4, kills: 2 },
      [{ seat: 1, role: "KNIGHT", at: at(4, 4) }],
    );
    const state = unexploreV7(weaken(base), 1, [at(7, 2), at(7, 3), at(7, 4)]);
    const fighter = unitAtV7(state, at(6, 3));
    const original = seatIdV7(state, 1);
    const run = attackV7(state, at(4, 4), BRAIN);
    const kinds = kindsV7(run.events);
    const released = run.events.find((event) => event.kind === "UNIT_RELEASED");
    expect(released).toEqual({
      kind: "UNIT_RELEASED",
      unitId: fighter.id,
      brainUnitId: idAt(state, BRAIN),
      fromPlayerId: seatIdV7(state, 0),
      toPlayerId: original,
      at: at(6, 3),
    });
    expect(kinds.indexOf("UNIT_DIED")).toBeLessThan(
      kinds.indexOf("UNIT_RELEASED"),
    );
    expect(kinds.indexOf("UNIT_RELEASED")).toBeLessThan(
      kinds.indexOf("UNIT_MOVED"),
    );
    // Its sight is revealed for its owner right after.
    expect(run.events[kinds.indexOf("UNIT_RELEASED") + 1]).toMatchObject({
      kind: "TILES_REVEALED",
      playerId: original,
      tiles: expect.arrayContaining([at(7, 2), at(7, 3), at(7, 4)]),
    });
    expect(unitAtV7(run.state, at(6, 3))).toEqual({
      ...fighter,
      ownerId: original,
      homeCityId: null,
      captureEligible: false,
      activation: expect.objectContaining({ handled: true, attacked: true }),
    });
    expect(run.state.mindControlled).toEqual([]);
    // No death, credit, or Grave for the released unit.
    expect(deaths(run.events)).toEqual([
      { unitId: idAt(state, BRAIN), cause: "ATTACK" },
    ]);
    expect(run.attacker?.kills).toBe(1);
    // The release is shown to both seats.
    for (const seat of [0, 1]) {
      const envelope = projectEventsV7(
        state,
        run.state,
        seatIdV7(state, seat),
        run.events,
      );
      expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
      expect(envelope.events).toContainEqual(released);
    }
  });

  it("shattered: a Brain shattered by an Ice Folk attack releases its unit", () => {
    for (let hp = 8; hp >= 1; hp -= 1) {
      const base = fragile(
        "ICE_FOLK",
        { role: "FIGHTER", at: at(6, 3), hp: 4 },
        [{ seat: 1, role: "FIGHTER", at: at(4, 4) }],
      );
      const weak = weaken(base, hp);
      const state = checkedV7({
        ...weak,
        chilled: [{ unitId: idAt(weak, BRAIN), sluggish: false, turnsLeft: 2 }],
      });
      const preview = attackV7(state, at(4, 4), BRAIN);
      if (!preview.combat.shatters) continue;
      expect(deaths(preview.events)).toContainEqual({
        unitId: idAt(state, BRAIN),
        cause: "SHATTER",
      });
      expect(kindsV7(preview.events)).toContain("UNIT_RELEASED");
      expect(unitAtV7(preview.state, at(6, 3)).ownerId).toBe(
        seatIdV7(state, 1),
      );
      return;
    }
    throw new Error("no Brain HP shatters");
  });

  it("infected: a Brain killed by a Zombie rises, and its unit is released", () => {
    const state = weaken(
      fragile("UNDEAD", { role: "FIGHTER", at: at(6, 3), hp: 4 }, [
        { seat: 1, role: "GUARD", at: at(4, 4) },
      ]),
    );
    const run = attackV7(state, at(4, 4), BRAIN);
    expect(run.combat.defenderInfected).toBe(true);
    const kinds = kindsV7(run.events);
    expect(kinds.indexOf("UNIT_INFECTED")).toBeLessThan(
      kinds.indexOf("UNIT_RELEASED"),
    );
    expect(unitAtV7(run.state, at(6, 3)).ownerId).toBe(seatIdV7(state, 1));
    expect(unitAtV7(run.state, BRAIN).ownerId).toBe(seatIdV7(state, 1));
  });

  it("disbanded: the Brain's owner is refunded for the Brain only", () => {
    const state = controlledField(
      "ORIGINAL",
      { role: "FIGHTER", at: at(6, 3), hp: 4 },
      [FAR],
    );
    const coins = state.players.find((player) => player.seat === 0)?.coins;
    const run = playV7(state, { kind: "DISBAND", unitId: idAt(state, BRAIN) });
    expect(kindsV7(run.events)).toEqual(
      expect.arrayContaining(["UNIT_DISBANDED", "UNIT_RELEASED"]),
    );
    expect(unitAtV7(run.state, at(6, 3)).ownerId).toBe(seatIdV7(state, 1));
    expect(run.state.players.find((player) => player.seat === 0)?.coins).toBe(
      (coins ?? 0) + 2,
    );
  });

  it("mind-controlled: a Brain taken by another Martian seat releases its unit, to the actor here", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "CAPTAIN", at: at(6, 3), hp: 4 },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(7, 3),
          hp: 3,
          controlledBy: at(6, 3),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "MARTIAN"] },
    );
    const grunt = idAt(state, at(7, 3));
    const enemyBrain = idAt(state, at(6, 3));
    expect(
      previewMindControlV7(activeViewV7(state), idAt(state, BRAIN), enemyBrain)
        ?.releasedUnitIds,
    ).toEqual([grunt]);
    const run = playV7(state, control(state, BRAIN, at(6, 3)));
    expect(kindsV7(run.events).slice(0, 2)).toEqual([
      "UNIT_MIND_CONTROLLED",
      "UNIT_RELEASED",
    ]);
    expect(unitAtV7(run.state, at(7, 3)).ownerId).toBe(seatIdV7(state, 0));
    expect(run.state.mindControlled).toEqual([
      {
        unitId: enemyBrain,
        brainUnitId: idAt(state, BRAIN),
        originalOwnerId: seatIdV7(state, 1),
      },
    ]);
  });

  it("displaced: a Brain removed from the board by any cause releases its unit (the shared release)", () => {
    const state = controlledField(
      "ORIGINAL",
      { role: "FIGHTER", at: at(6, 3), hp: 4 },
      [FAR],
    );
    const events: DomainEventV7[] = [];
    const release = releaseControlledV7(
      state.units.filter((unit) => unit.id !== idAt(state, BRAIN)),
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    expect(events.map((event) => event.kind)).toEqual(["UNIT_RELEASED"]);
    expect(release.mindControlled).toEqual([]);
    expect(
      release.units.find((unit) => unit.id === idAt(state, at(6, 3)))?.ownerId,
    ).toBe(seatIdV7(state, 1));
    // Released twice in one command, it is released once.
    const again = releaseControlledV7(
      release.units,
      release.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    expect(again.released).toEqual([]);
    expect(events).toHaveLength(1);
  });

  it("embarked: an embarked controlled unit is released afloat", () => {
    const state = weaken(
      fragile(
        "ORIGINAL",
        { role: "FIGHTER", at: at(6, 3), hp: 4, form: "EMBARKED" },
        [{ seat: 1, role: "KNIGHT", at: at(4, 4) }],
        { water: [at(6, 3)] },
      ),
    );
    const run = attackV7(state, at(4, 4), BRAIN);
    expect(unitAtV7(run.state, at(6, 3))).toMatchObject({
      ownerId: seatIdV7(state, 1),
      form: "EMBARKED",
    });
  });

  it("burrowed: a controlled Mole underground is released in the burrowed list and surfaces for its owner", () => {
    const base = controlledField(
      "DWARF",
      { role: "GUARD", at: at(5, 3), hp: 6 },
      [{ seat: 1, role: "FIGHTER", at: at(4, 4) }],
    );
    const tunnel = offeredV7(base, "TUNNEL")[0] as Extract<
      CommandV7,
      { kind: "TUNNEL" }
    >;
    const dug = playV7(weaken(base), tunnel).state;
    const dwarf = seatIdV7(base, 1);
    const dwarfTurn = endTurnUntilV7(dug, dwarf).state;
    const run = attackV7(dwarfTurn, at(4, 4), BRAIN);
    expect(kindsV7(run.events)).toContain("UNIT_RELEASED");
    expect(run.state.burrowed).toEqual([
      {
        unit: expect.objectContaining({
          id: idAt(base, at(5, 3)),
          ownerId: dwarf,
        }),
        moleUnitId: null,
      },
    ]);
    expect(run.state.mindControlled).toEqual([]);
    // It surfaces at its owner's next Start Turn, not at the Martian's.
    const martianTurn = endTurnUntilV7(run.state, seatIdV7(base, 0));
    expect(kindsV7(martianTurn.events)).not.toContain("UNIT_SURFACED");
    const back = endTurnUntilV7(martianTurn.state, dwarf);
    expect(
      back.events.find((event) => event.kind === "UNIT_SURFACED"),
    ).toMatchObject({ playerId: dwarf, unitId: idAt(base, at(5, 3)) });
  });

  it("to an eliminated original owner: removed with BRAIN_LOST, no credit or Grave", () => {
    // Martian, Human, Goblin: the Goblin takes the Human's only city, then
    // kills the Brain that controls a Human Fighter.
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN, hp: 1, shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 4, controlledBy: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(9, 9) },
        {
          seat: 2,
          role: "FIGHTER",
          at: at(11, 11),
          captureEligible: true,
        },
        { seat: 2, role: "GUARD", at: at(4, 4) },
      ],
      { factions: ["MARTIAN", "ORIGINAL", "GOBLIN"], activeSeat: 2 },
    );
    const human = seatIdV7(state, 1);
    const captured = playV7(state, {
      kind: "CAPTURE",
      unitId: idAt(state, at(11, 11)),
    });
    expect(captured.events).toContainEqual({
      kind: "PLAYER_ELIMINATED",
      playerId: human,
    });
    // The Human's own Fighter died with its seat; the controlled one stays.
    expect(hasUnitAtV7(captured.state, at(9, 9))).toBe(false);
    expect(unitAtV7(captured.state, at(6, 3)).ownerId).toBe(seatIdV7(state, 0));
    expect(captured.state.mindControlled).toEqual(state.mindControlled);
    const run = attackV7(captured.state, at(4, 4), BRAIN);
    expect(deaths(run.events)).toEqual([
      { unitId: idAt(state, BRAIN), cause: "ATTACK" },
      { unitId: idAt(state, at(6, 3)), cause: "BRAIN_LOST" },
    ]);
    expect(kindsV7(run.events)).not.toContain("UNIT_RELEASED");
    expect(hasUnitAtV7(run.state, at(6, 3))).toBe(false);
    expect(run.attacker?.kills).toBe(1);
  });

  it("controller eliminated: its controlled units are released before its units are removed", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 4, controlledBy: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true },
      ],
      { activeSeat: 1 },
    );
    const run = playV7(state, {
      kind: "CAPTURE",
      unitId: idAt(state, at(8, 8)),
    });
    const kinds = kindsV7(run.events);
    expect(kinds.indexOf("UNIT_RELEASED")).toBeGreaterThan(-1);
    expect(kinds.indexOf("UNIT_RELEASED")).toBeLessThan(
      kinds.indexOf("PLAYER_ELIMINATED"),
    );
    expect(
      run.events.findIndex(
        (event) => event.kind === "UNIT_DIED" && event.cause === "ELIMINATION",
      ),
    ).toBeGreaterThan(kinds.indexOf("UNIT_RELEASED"));
    expect(deaths(run.events)).toEqual([
      { unitId: idAt(state, BRAIN), cause: "ELIMINATION" },
    ]);
    expect(unitAtV7(run.state, at(6, 3)).ownerId).toBe(seatIdV7(state, 1));
    expect(run.state.mindControlled).toEqual([]);
  });
});

describe("Mind Control revision: state parsing (section 2.1)", () => {
  it("rejects every malformed mindControlled entry", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 4, controlledBy: BRAIN },
        { seat: 0, role: "CAPTAIN", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "CAPTAIN", at: at(1, 1) },
        { seat: 1, role: "FIGHTER", at: at(1, 2), hp: 4 },
        { seat: 1, role: "GUARD", at: at(1, 3), hp: 4 },
        { seat: 1, role: "PATROL_BOAT", at: at(9, 1), form: "NAVAL" },
      ],
      { factions: ["MARTIAN", "MARTIAN"], water: [at(9, 1)] },
    );
    expect(parse(state, {})).not.toBeNull();
    const brain = idAt(state, BRAIN);
    const unit = idAt(state, at(5, 3));
    const martian = seatIdV7(state, 0);
    const original = seatIdV7(state, 1);
    const entry = {
      unitId: unit,
      brainUnitId: brain,
      originalOwnerId: original,
    };
    /** The unit on `where` handed to seat 0 without a home. */
    const handed = (where: CoordV7, change: Partial<UnitStateV7> = {}) =>
      state.units.map((candidate) =>
        sameV7(candidate.at, where)
          ? { ...candidate, ownerId: martian, homeCityId: null, ...change }
          : candidate,
      );
    const otherBrain = idAt(state, at(6, 6));
    // A second Brain controlling a second unit is legal.
    const second = {
      units: handed(at(1, 2)),
      mindControlled: [
        entry,
        {
          unitId: idAt(state, at(1, 2)),
          brainUnitId: otherBrain,
          originalOwnerId: original,
        },
      ].sort((left, right) => left.unitId - right.unitId),
    };
    expect(parse(state, second)).not.toBeNull();
    const bad: readonly [string, Readonly<Record<string, unknown>>][] = [
      ["duplicate", { mindControlled: [entry, entry] }],
      [
        "unsorted",
        { ...second, mindControlled: [...second.mindControlled].reverse() },
      ],
      ["no unit", { mindControlled: [{ ...entry, unitId: 9999 }] }],
      [
        "naval form",
        {
          units: handed(at(9, 1)),
          mindControlled: [
            entry,
            {
              unitId: idAt(state, at(9, 1)),
              brainUnitId: otherBrain,
              originalOwnerId: original,
            },
          ].sort((left, right) => left.unitId - right.unitId),
        },
      ],
      [
        "a home",
        {
          units: state.units.map((candidate) =>
            candidate.id === unit
              ? { ...candidate, homeCityId: cityOfV7(state, 0).id }
              : candidate,
          ),
        },
      ],
      [
        "original owner is the owner",
        { mindControlled: [{ ...entry, originalOwnerId: martian }] },
      ],
      [
        "original owner not a player",
        { mindControlled: [{ ...entry, originalOwnerId: 99 }] },
      ],
      ["no Brain", { mindControlled: [{ ...entry, brainUnitId: 9999 }] }],
      [
        "the Brain is not a Brain",
        { mindControlled: [{ ...entry, brainUnitId: idAt(state, at(3, 3)) }] },
      ],
      [
        "the Brain is another owner's",
        { mindControlled: [{ ...entry, brainUnitId: idAt(state, at(1, 1)) }] },
      ],
      [
        "more than the limit for one Brain",
        {
          ...second,
          mindControlled: second.mindControlled.map((item) => ({
            ...item,
            brainUnitId: brain,
          })),
        },
      ],
      [
        "the Brain is itself controlled",
        {
          units: handed(at(1, 1)),
          mindControlled: [
            {
              unitId: idAt(state, at(1, 1)),
              brainUnitId: otherBrain,
              originalOwnerId: original,
            },
            { ...entry, brainUnitId: idAt(state, at(1, 1)) },
          ].sort((left, right) => left.unitId - right.unitId),
        },
      ],
      [
        "a Juggernaut-role unit",
        {
          units: state.units.map((candidate) =>
            candidate.id === unit
              ? {
                  ...candidate,
                  role: "JUGGERNAUT",
                  hp: 4,
                  maxHp: 32,
                  captureEligible: false,
                }
              : candidate,
          ),
        },
      ],
      ["extra keys", { mindControlled: [{ ...entry, extra: 1 }] }],
      ["not a list", { mindControlled: "none" }],
      ["old key", { mindControlled: undefined, thralls: [] }],
    ];
    for (const [name, patch] of bad)
      expect(parse(state, patch), name).toBeNull();
  });

  it("rejects a two-slot kind, a construct kind, and a non-Martian owner", () => {
    // A Dinosaur T-Rex (two slots) and a Dwarf Gunner (a construct).
    const dino = controlledField("DINOSAUR", {
      role: "FIGHTER",
      at: at(5, 3),
      hp: 4,
    });
    const caveman = idAt(dino, at(5, 3));
    expect(
      parse(dino, {
        units: dino.units.map((candidate) =>
          candidate.id === caveman
            ? {
                ...candidate,
                role: "KNIGHT",
                maxHp: 28,
                captureEligible: false,
              }
            : candidate,
        ),
      }),
    ).toBeNull();
    const dwarf = controlledField("DWARF", {
      role: "FIGHTER",
      at: at(5, 3),
      hp: 4,
    });
    const hammerer = idAt(dwarf, at(5, 3));
    expect(
      parse(dwarf, {
        units: dwarf.units.map((candidate) =>
          candidate.id === hammerer
            ? { ...candidate, role: "MARKSMAN", maxHp: 10 }
            : candidate,
        ),
      }),
    ).toBeNull();
    // Without a Martian seat no entry is legal at all.
    const humans = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 4 },
      ],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    const goblin = unitAtV7(humans, at(5, 3));
    expect(
      parse(humans, {
        units: humans.units.map((candidate) =>
          candidate.id === goblin.id
            ? {
                ...candidate,
                ownerId: seatIdV7(humans, 0),
                homeCityId: null,
              }
            : candidate,
        ),
        mindControlled: [
          {
            unitId: goblin.id,
            brainUnitId: idAt(humans, BRAIN),
            originalOwnerId: goblin.ownerId,
          },
        ],
      }),
    ).toBeNull();
  });
});

describe("Mind Control revision: saves and replays (section 5.4)", () => {
  it("a Normal AI match replays and saves mid-control exactly", () => {
    // Martian against Ice Folk, seed 9 (seed 4 until the balance round,
    // `pulp_wars-1wy.3`): the Normal AI's first Mind Control comes at about
    // command 250. The replay of the command log reaches the same state,
    // with the controlled unit, and a save of it loads back (the loader
    // replays the log, so a save needs a real match).
    const setup = goblinSetupV7(["MARTIAN", "ICE_FOLK"], 9);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    let perTurn = 0;
    for (
      let step = 0;
      step < 1500 && state.mindControlled.length === 0;
      step += 1
    ) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined || state.outcome !== null) break;
      const command = chooseNormalTurnCommandV7(
        viewForV7(state, actor),
        perTurn,
      ) ?? {
        kind: "END_TURN" as const,
      };
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      perTurn = command.kind === "END_TURN" ? 0 : perTurn + 1;
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    }
    expect(state.mindControlled).toHaveLength(1);
    const rerun = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(rerun.stateHash).toBe(canonicalHash(state));
    expect(rerun.state.mindControlled).toEqual(state.mindControlled);
    const loaded = parseSaveV7(
      JSON.stringify(
        createSaveEnvelopeV7({ state, replay }, "2026-10-03T12:00:00.000Z"),
      ),
    );
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind === "VALID")
      expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
  }, 600_000);
});
