import { describe, expect, it } from "vitest";
import {
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_LIMIT_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBeamDownV7,
  previewMindControlV7,
  previewTractorBeamV7,
  projectEventsV7,
  queryCombatPreviewV7,
  roleMechanicsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BEAM_DOWN_NO_PASSENGER_V7,
  MARTIAN_HELP_RULES_V7,
  MIND_CONTROLLED_LABEL_V7,
  beamDownUnavailableTextV7,
  brainControlTextV7,
  martianAbilityNameV7,
  martianBoundaryNoticeV7,
  martianCombatLinesV7,
  martianCommandLabelV7,
  martianRecruitNotesV7,
  martianRewardLabelV7,
  martianRoleUnlockTextV7,
  martianUnitInfoLinesV7,
  mindControlPreviewLinesV7,
  mindControlReadyInV7,
  mindControlUnavailableTextV7,
  mindControlledInfoV7,
  rayPowerTextV7,
  shieldBarMaximumV7,
  shieldTextV7,
  tractorBeamPreviewLinesV7,
} from "../../src/render/martian-presentation-v7";
import {
  MARTIAN_DUEL_V7,
  MARTIAN_UI_V7,
  martianDuelFixtureV7,
  martianUiFieldV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";

// Labels and numbers are read from the registry, the engine constants and
// the public previews, so a balance retune needs no change here.
const AT = MARTIAN_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "MARTIAN").label;
const humanView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const unitAt = (view: PlayerViewV7, at: CoordV7) => {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
};
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("missing");
  return value;
}
const statsAt = (view: PlayerViewV7, at: CoordV7) => {
  const stats = view.unitStats.find(
    (entry) => entry.unitId === unitAt(view, at).id,
  )?.martian;
  if (stats === undefined) throw new Error("no Martian stats");
  return stats;
};

describe("Martian texts (section 13.2)", () => {
  it("writes the Shield row, raised by a Force Field", () => {
    expect(shieldTextV7({ shield: 1, shieldMaximum: 2 })).toBe("Shield 1 / 2");
    expect(
      shieldTextV7({ shield: FORCE_FIELD_SHIELD_V7, shieldMaximum: 2 }),
    ).toBe(
      `Shield ${FORCE_FIELD_SHIELD_V7} / ${FORCE_FIELD_SHIELD_V7} (Force Field)`,
    );
    expect(
      shieldBarMaximumV7({ shield: FORCE_FIELD_SHIELD_V7, shieldMaximum: 2 }),
    ).toBe(FORCE_FIELD_SHIELD_V7);
    expect(shieldBarMaximumV7({ shield: 0, shieldMaximum: 3 })).toBe(3);
  });

  it("names the ray's power now and why it is halved", () => {
    expect(rayPowerTextV7({ rayPower: "FULL", cooling: false })).toBe(
      "Full power",
    );
    expect(rayPowerTextV7({ rayPower: "HALF", cooling: false })).toBe(
      "Half power: moved",
    );
    expect(rayPowerTextV7({ rayPower: "HALF", cooling: true })).toBe(
      "Half power: Cooling",
    );
    expect(rayPowerTextV7({ rayPower: null, cooling: false })).toBeNull();
    const view = humanView(martianUiFixtureV7());
    expect(rayPowerTextV7(statsAt(view, AT.rayGunner))).toBe("Full power");
    expect(rayPowerTextV7(statsAt(view, AT.coolingGunner))).toBe(
      "Half power: Cooling",
    );
  });

  it("names a Brain's control and why it cannot Mind Control", () => {
    const view = humanView(martianUiFixtureV7());
    const brain = statsAt(view, AT.brain).mindControl;
    if (brain === null) throw new Error("no Mind Control block");
    expect(brainControlTextV7(brain)).toBe(
      `Controls 0 / ${MIND_CONTROL_LIMIT_V7}`,
    );
    expect(mindControlUnavailableTextV7(brain)).toBeNull();
    expect(mindControlUnavailableTextV7({ ...brain, cooldown: 1 })).toBe(
      `Recovering: ${mindControlReadyInV7(1)} turns`,
    );
    expect(mindControlUnavailableTextV7({ ...brain, cooldown: 0 })).toBe(
      "Recovering: 1 turn",
    );
    const controller = statsAt(view, AT.controller).mindControl;
    if (controller === null) throw new Error("no Mind Control block");
    expect(brainControlTextV7(controller)).toBe("Controls 1 / 1");
    expect(mindControlUnavailableTextV7(controller)).toBe(
      "Controls a unit already",
    );
  });

  it("names a controlled unit's controller, original owner and fate (section 9)", () => {
    const view = humanView(martianUiFixtureV7());
    const controlled = unitAt(view, AT.controlled);
    expect(mindControlledInfoV7(view, controlled)).toEqual({
      controllerId: view.viewer.id,
      originalOwnerId: required(
        view.mindControlled.find((entry) => entry.unitId === controlled.id),
      ).originalOwnerId,
      controllerName: "You",
      originalOwnerName: "Player 2",
      returns: true,
      byLine: `Mind-controlled by your ${label("CAPTAIN")}`,
      fateLine: `Returns to Player 2 if the ${label("CAPTAIN")} is lost`,
    });
    expect(MIND_CONTROLLED_LABEL_V7).toBe("Controlled");
    expect(mindControlledInfoV7(view, unitAt(view, AT.brain))).toBeNull();
    // An eliminated original owner: lost with the Brain.
    const state = martianUiFixtureV7();
    const gone = humanView({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? player
          : { ...player, status: "ELIMINATED" as const },
      ),
    });
    expect(
      mindControlledInfoV7(gone, unitAt(gone, AT.controlled)),
    ).toMatchObject({
      returns: false,
      fateLine: `Lost with the ${label("CAPTAIN")}`,
    });
  });

  it("explains a Brain, the Shield and a machine afloat in unit info", () => {
    const view = humanView(martianUiFixtureV7());
    // A controlled Human unit has no Martian block (the Mind Control
    // revision: its control is in the top-level `mindControl` stats).
    expect(
      view.unitStats.find(
        (entry) => entry.unitId === unitAt(view, AT.controlled).id,
      )?.martian,
    ).toBeUndefined();
    const brainLines = martianUnitInfoLinesV7(
      unitAt(view, AT.controller),
      statsAt(view, AT.controller),
    );
    expect(brainLines.find((line) => line.id === "brain")).toMatchObject({
      name: "Controls 1 / 1",
      description: "Controls a unit already",
    });
    const projector = martianUnitInfoLinesV7(
      unitAt(view, AT.projector),
      statsAt(view, AT.projector),
    );
    expect(projector[0]).toMatchObject({
      id: "shield",
      name: shieldTextV7(statsAt(view, AT.projector)),
    });
    const afloat = martianUnitInfoLinesV7(
      unitAt(view, AT.tripodAfloat),
      statsAt(view, AT.tripodAfloat),
    );
    expect(afloat.map((line) => line.id)).toContain("afloat");
  });

  it("labels the Martian commands and abilities, and leaves the others alone", () => {
    expect(martianCommandLabelV7("BEAM_DOWN", "ORIGINAL")).toBe("Beam Down");
    expect(martianCommandLabelV7("RALLY", "MARTIAN")).toBe("Psychic Command");
    expect(martianCommandLabelV7("RALLY", "ORIGINAL")).toBeNull();
    expect(martianAbilityNameV7("CHARGE", "MARTIAN")).toBe("Strafe");
    expect(martianAbilityNameV7("CHARGE", "DINOSAUR")).toBeNull();
    expect(martianRewardLabelV7("MILITIA")).toEqual([
      "Militia",
      `A free ${label("FIGHTER")}`,
    ]);
    const slots = roleMechanicsV7("JUGGERNAUT", "MARTIAN").capacitySlots;
    expect(martianRewardLabelV7("JUGGERNAUT")).toEqual([
      label("JUGGERNAUT"),
      slots > 1 ? `A giant unit (${slots} slots)` : "A giant unit",
    ]);
  });

  it("writes the unlock text of a role from its registered abilities (section 4)", () => {
    expect(martianRoleUnlockTextV7("CATAPULT")).toBe(
      `Train ${label("CATAPULT")} (strides, heat ray, Pierce)`,
    );
    expect(martianRoleUnlockTextV7("RAIDER")).toBe(
      `Train ${label("RAIDER")} (flies, Beam Down, Tractor Beam)`,
    );
    expect(martianRoleUnlockTextV7("GUARD")).toBe(
      // The Martian pass (7r52): the field needs the Force Fields technology.
      `Train ${label("GUARD")} (Force Field with Force Fields)`,
    );
    expect(martianRecruitNotesV7("KNIGHT", "MARTIAN")).toContain(
      `Takes ${roleMechanicsV7("KNIGHT", "MARTIAN").capacitySlots} slots in its city.`,
    );
    expect(martianRecruitNotesV7("KNIGHT", "ORIGINAL")).toEqual([]);
  });

  it("writes one Help sentence per rule with the registry's numbers (section 13.3)", () => {
    const rules = new Map(MARTIAN_HELP_RULES_V7);
    expect([...rules.keys()]).toEqual([
      "Shields",
      "Force Field",
      "Force Fields",
      "Heat rays",
      // The Martian pass (7r52).
      "Heat Sinks",
      "Pierce",
      "Ranges",
      "Disintegrator",
      "Walkers",
      "Flyers",
      "Launch",
      "Beam Down",
      "Mind Control",
      "Tractor Beam",
      "Psychic Command, Strafe",
    ]);
    // The Martian pass's correction: a whole field holds one attack.
    expect(rules.get("Force Field")).toBe(
      `with Force Fields, a unit that recharges next to a ${label("GUARD")} recharges to Shield ${FORCE_FIELD_SHIELD_V7}. At full HP with that Shield whole, one attack cannot kill it: it is left at 1 HP.`,
    );
    expect(rules.get("Mind Control")).toContain(
      `with ${MIND_CONTROL_HP_V7} HP or less within ${MIND_CONTROL_RANGE_V7} tiles`,
    );
    // The Mind Control revision: the unit keeps its type and goes home.
    expect(rules.get("Mind Control")).toContain(
      "keeps its type and abilities but cannot be disbanded or create units",
    );
    // `pulp_wars-b5f.2`: the Grunt's ray pistol and the Tripod's range.
    expect(rules.get("Ranges")).toBe(
      `a ${label("FIGHTER")}'s ray pistol shoots up to two tiles away at full Attack, even after moving; a ${label("CATAPULT")} fires only at units two tiles away, never at one next to it.`,
    );
    expect(rules.get("Heat Sinks")).toBe(
      `with Heat Sinks, a ${label("MARKSMAN")} does not overheat: it fires at full power every turn it does not move.`,
    );
    expect(rules.get("Heat rays")).toContain(
      `a ${label("MARKSMAN")}, ${label("CATAPULT")}, or ${label("JUGGERNAUT")} fires at full power`,
    );
  });
});

describe("Martian previews (section 13.1)", () => {
  it("reads the attack lines from the public combat preview", () => {
    const view = humanView(martianDuelFixtureV7());
    const shooter = unitAt(view, MARTIAN_DUEL_V7.rayGunner);
    const target = unitAt(view, MARTIAN_DUEL_V7.shieldedGrunt);
    const preview = queryCombatPreviewV7(view, shooter.id, target.id);
    if (preview === null) throw new Error("no preview");
    const lines = martianCombatLinesV7(view, preview);
    expect(lines.notes).toContain(
      `Shield absorbs ${preview.defenderShieldDamage}`,
    );
    expect(lines.shooter).toEqual([
      "Full power",
      ...(preview.coolingApplied ? ["Leaves it Cooling next turn"] : []),
    ]);
    expect(lines.pierce).toEqual([]);
    // Retaliation on the Tripod (the Grunt's ray pistol reaches range 2):
    // its own Shield absorbs.
    const tripod = unitAt(view, MARTIAN_DUEL_V7.tripod);
    const dented = unitAt(view, MARTIAN_DUEL_V7.dentedGrunt);
    const melee = queryCombatPreviewV7(view, tripod.id, dented.id);
    if (melee === null) throw new Error("no preview");
    const meleeLines = martianCombatLinesV7(view, melee);
    if (melee.attackerShieldDamage > 0)
      expect(meleeLines.notes).toContain(
        `Your Shield absorbs ${melee.attackerShieldDamage}`,
      );
    if (melee.defenderShieldDamage > 0)
      expect(meleeLines.notes).toContain(
        `Shield absorbs ${melee.defenderShieldDamage}`,
      );
  });

  it("writes the Mind Control and Tractor Beam previews from the public previews", () => {
    const view = humanView(martianUiFixtureV7());
    const brain = unitAt(view, AT.brain);
    const weak = unitAt(view, AT.weakTarget);
    const mind = previewMindControlV7(view, brain.id, weak.id);
    if (mind === null) throw new Error("no Mind Control preview");
    expect(mindControlPreviewLinesV7(view, mind)).toEqual([
      `Becomes yours: ${effectiveRoleRuleV7("MARKSMAN", "ORIGINAL").label} (${mind.hp} / ${mind.maxHp} HP)`,
      `Mind Control recovers for ${mind.cooldownTurns} turns`,
      "Returns if this Brain is lost",
    ]);
    const mothership = unitAt(view, AT.mothership);
    const raider = unitAt(view, AT.pullTarget);
    const pull = previewTractorBeamV7(view, mothership.id, raider.id);
    if (pull === null) throw new Error("no pull preview");
    expect(pull.to).toEqual(AT.pullTo);
    expect(tractorBeamPreviewLinesV7(view, pull)).toEqual([]);
  });

  it("names why a Saucer cannot Beam Down", () => {
    const state = martianUiFixtureV7();
    const view = humanView(state);
    const saucer = unitAt(view, AT.saucer);
    expect(
      previewBeamDownV7(view, saucer.id, unitAt(view, AT.capitalGrunt).id),
    ).not.toBeNull();
    expect(beamDownUnavailableTextV7(view, saucer.id, true)).toBeNull();
    // `pulp_wars-1wy.3`: a Saucer that moved this turn still beams.
    const movedState = applyCommandV7(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: saucer.id,
      path: [{ x: AT.saucer.x - 1, y: AT.saucer.y }],
    });
    if (!movedState.accepted) throw new Error(movedState.error.code);
    const movedView = humanView(movedState.state);
    expect(
      previewBeamDownV7(
        movedView,
        saucer.id,
        unitAt(movedView, AT.capitalGrunt).id,
      ),
    ).not.toBeNull();
    expect(beamDownUnavailableTextV7(movedView, saucer.id, true)).toBeNull();
    // No unit in an own city or within two tiles of the Saucer.
    const alone = humanView(
      martianUiFieldV7([{ seat: 0, role: "RAIDER", at: AT.saucer }]),
    );
    expect(
      beamDownUnavailableTextV7(alone, unitAt(alone, AT.saucer).id, false),
    ).toBe(BEAM_DOWN_NO_PASSENGER_V7);
  });
});

describe("Martian log lines (section 13.2)", () => {
  it("logs a Beam Down, a Mind Control and a pull", () => {
    let state = martianUiFixtureV7();
    const notice = (command: Parameters<typeof applyCommandV7>[2]) => {
      const before = state;
      const result = applyCommandV7(state, state.humanPlayerId, command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      return martianBoundaryNoticeV7(
        projectEventsV7(before, state, state.humanPlayerId, result.events)
          .events,
        humanView(before),
        humanView(state),
      );
    };
    const view = humanView(state);
    const saucer = unitAt(view, AT.saucer);
    const passenger = unitAt(view, AT.capitalGrunt);
    const to = previewBeamDownV7(view, saucer.id, passenger.id)
      ?.destinations[0];
    if (to === undefined) throw new Error("no destination");
    expect(
      notice({
        kind: "BEAM_DOWN",
        unitId: saucer.id,
        passengerUnitId: passenger.id,
        to,
      }),
    ).toEqual({
      text: `Your ${label("RAIDER")} beamed down a ${label("FIGHTER")}`,
      toast: true,
    });
    expect(
      notice({
        kind: "MIND_CONTROL",
        unitId: unitAt(view, AT.brain).id,
        targetUnitId: unitAt(view, AT.weakTarget).id,
      })?.text,
    ).toBe(
      `Your ${label("CAPTAIN")} took control of Player 2's ${effectiveRoleRuleV7("MARKSMAN", "ORIGINAL").label}`,
    );
    expect(
      notice({
        kind: "TRACTOR_BEAM",
        unitId: unitAt(view, AT.mothership).id,
        targetUnitId: unitAt(view, AT.pullTarget).id,
      })?.text,
    ).toBe(
      `Your ${label("KNIGHT")} pulled Player 2's ${effectiveRoleRuleV7("RAIDER", "ORIGINAL").label}`,
    );
  });

  it("logs a controlled unit going home to its owner when the Brain is lost", () => {
    const state = martianUiFixtureV7("GOBLIN");
    const view = humanView(state);
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "DISBAND",
      unitId: unitAt(view, AT.controller).id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    const notice = martianBoundaryNoticeV7(
      projectEventsV7(state, result.state, state.humanPlayerId, result.events)
        .events,
      view,
      humanView(result.state),
    );
    expect(notice).toEqual({
      text: `${effectiveRoleRuleV7("FIGHTER", "GOBLIN").label} returned to Player 2`,
      toast: true,
    });
  });
});
