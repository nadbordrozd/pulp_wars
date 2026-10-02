import { describe, expect, it } from "vitest";
import {
  ALPHA_ATTACK2_V7,
  EGG_HP_V7,
  GOBLIN_ROLE_MECHANICS_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isEggLaidRoleV7,
  previewLayEggV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  ABANDON_EGG_LABEL_V7,
  ARMOURED_PREVIEW_V7,
  DINOSAUR_HELP_RULES_V7,
  CHARGE_DESCRIPTION_V7,
  CHARGE_LABEL_V7,
  HATCH_NEW_EGG_V7,
  LAY_EGG_NO_TILE_V7,
  PROMOTE_TOOLTIP_V7,
  PROMOTION_HELP_TIP_V7,
  abandonEggTooltipV7,
  bigBodyRolesV7,
  chargePreviewLinesV7,
  chargeRunUpBonusV7,
  chargeRunUpMaximumV7,
  cityCapacityTextV7,
  dinosaurAbilityDescriptionV7,
  dinosaurAbilityNameV7,
  dinosaurBoundaryNoticeV7,
  dinosaurCombatNoteV7,
  dinosaurCombatSemanticNoteV7,
  dinosaurCommandLabelV7,
  dinosaurFieldDefenseBlockedV7,
  dinosaurRecruitNotesV7,
  dinosaurRewardLabelV7,
  dinosaurUnitInfoLinesV7,
  eggCountdownTextV7,
  eggInfoTextV7,
  eggRefundV7,
  growthChipTextV7,
  growthInfoTextV7,
  hatchBlockedEggsV7,
  layEggRowTextV7,
  layEggUnavailableTextV7,
  matchHasDinosaurV7,
  nestingCitySlotsV7,
  nestingEggHpBonusV7,
  nestingUnlockTextV7,
  slotCapacityTooltipV7,
  slotsTextV7,
  turnsTextV7,
  unitDisplayNameV7,
} from "../../src/render/dinosaur-presentation-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { tacticalAttachmentsV7 } from "../../src/render/tactical-presentation-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { withTileV7 } from "../fixtures/v7-dinosaur-arena";
import { walledV7 } from "../fixtures/v7-revision20";
import {
  DINOSAUR_BLAST_V7,
  DINOSAUR_CITY_V7,
  DINOSAUR_ENEMY_V7,
  DINOSAUR_SHOWCASE_V7,
  dinosaurBlastFixtureV7,
  dinosaurCityFixtureV7,
  dinosaurCityFullFixtureV7,
  dinosaurCityPoorFixtureV7,
  dinosaurEnemyFixtureV7,
  dinosaurShowcaseFixtureV7,
  dinosaurUiFieldV7,
} from "../fixtures/v7-dinosaur-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

// Every Dinosaur number in these expectations comes from the registry or a
// public preview: the balance beads may tune hatch times, slots, costs, HP,
// Attack, the Egg, growth and the Charge! run-up. The
// fixtures fix the outcomes instead (a 1 HP target dies, a Juggernaut
// survives), so retuning never changes which sentence is expected.

const AT = DINOSAUR_SHOWCASE_V7;
const EGG_ROLES = UNIT_ROLE_IDS_V7.filter((role) =>
  isEggLaidRoleV7(role, "DINOSAUR"),
);
const label = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "DINOSAUR").label;
const mechanics = (role: UnitRoleIdV7) => roleMechanicsV7(role, "DINOSAUR");
const hatchTurns = (role: UnitRoleIdV7): number =>
  mechanics(role).hatchTurns ?? 0;
const GROWTH_RULE = `Big after ${GROWTH_KILLS_V7[0]} kill${GROWTH_KILLS_V7[0] === 1 ? "" : "s"} (+${GROWTH_HP_V7} HP)`;
const ALPHA_RULE = `Alpha after ${GROWTH_KILLS_V7[1]} kills (+${GROWTH_HP_V7} more HP and +${ALPHA_ATTACK2_V7 / 2} Attack)`;
const GROWTH_INFO = `Big: +${GROWTH_HP_V7} HP. Alpha: +${GROWTH_HP_V7 * 2} HP, +${ALPHA_ATTACK2_V7 / 2} Attack. Growing fully heals.`;

function humanView(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

/** The state after the unit on `from` moved along `path` (tiles entered). */
function moved(
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "MOVE",
    unitId: unitAt(humanView(state), from).id,
    path: [...path],
  });
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

/** The offered attack of the unit on `from` and its Charge! preview lines. */
function charge(view: PlayerViewV7, from: CoordV7, target: CoordV7) {
  const preview = queryCombatPreviewV7(
    view,
    unitAt(view, from).id,
    unitAt(view, target).id,
  );
  if (preview === null) throw new Error("attack not offered");
  return {
    preview,
    lines: chargePreviewLinesV7(view, preview),
    note: dinosaurCombatNoteV7(preview, view),
    semantic: dinosaurCombatSemanticNoteV7(preview, view),
  };
}

/** The showcase with its Triceratops moved next to the Juggernaut. */
function chargingShowcase(): GameStateV7 {
  return moved(dinosaurShowcaseFixtureV7(), AT.triceratops, [
    AT.laneCaveman,
    AT.chargeFrom,
  ]);
}

function ownCity(view: PlayerViewV7) {
  const city = view.cities.find((entry) => entry.ownerId === view.viewer.id);
  if (city === undefined) throw new Error("city missing");
  return city;
}

function layEgg(view: PlayerViewV7, role: UnitRoleIdV7) {
  const preview = previewLayEggV7(view, ownCity(view).id, role);
  if (preview === null) throw new Error("Lay Egg preview missing");
  return preview;
}

function boundary(state: GameStateV7, command: CommandV7) {
  const actor = state.humanPlayerId;
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, actor),
    after: viewForV7(result.state, actor),
    envelope: projectEventsV7(state, result.state, actor, result.events),
    state: result.state,
  };
}

describe("Revision 19 Dinosaur text (spec section 12.2)", () => {
  it("names units and Eggs by their owner's registration", () => {
    const view = humanView(dinosaurShowcaseFixtureV7());
    expect(matchHasDinosaurV7(view)).toBe(true);
    expect(unitDisplayNameV7(view, unitAt(view, AT.triceratops))).toBe(
      "Triceratops",
    );
    expect(unitDisplayNameV7(view, unitAt(view, AT.laneCaveman))).toBe(
      "Caveman",
    );
    expect(unitDisplayNameV7(view, unitAt(view, AT.tRexEgg))).toBe("T-Rex Egg");
    expect(unitDisplayNameV7(view, unitAt(view, AT.pushTarget))).toBe(
      "Juggernaut",
    );
    expect(matchHasDinosaurV7(humanView(goblinShowcaseFixtureV7()))).toBe(
      false,
    );
  });

  it("labels the commands, abilities and Nesting for a Dinosaur viewer only", () => {
    expect(dinosaurCommandLabelV7("LAY_EGG", "DINOSAUR")).toBe("Lay Egg");
    expect(dinosaurCommandLabelV7("HATCH", "DINOSAUR")).toBe("Hatch");
    // Revision 20: Stampede is no command; Charge! is the passive ability.
    expect(dinosaurCommandLabelV7("STAMPEDE", "DINOSAUR")).toBe(null);
    expect(dinosaurAbilityNameV7("LINEBREAKER", "DINOSAUR")).toBe("Charge!");
    expect(dinosaurAbilityNameV7("STAMPEDE", "DINOSAUR")).toBe(null);
    expect(dinosaurAbilityNameV7("LINEBREAKER", "ORIGINAL")).toBe(null);
    expect(CHARGE_LABEL_V7).toBe("Charge!");
    expect(dinosaurCommandLabelV7("RALLY", "DINOSAUR")).toBe("War Drums");
    expect(dinosaurCommandLabelV7("RALLY", "ORIGINAL")).toBe(null);
    expect(
      ["RALLY", "OVERRUN", "CHARGE", "GROW", "ACID", "ARMOURED"].map(
        (ability) => dinosaurAbilityNameV7(ability, "DINOSAUR"),
      ),
    ).toEqual(["War Drums", "Rampage", "Pounce", "Grows", "Acid", "Armoured"]);
    expect(dinosaurAbilityNameV7("OVERRUN", "ORIGINAL")).toBe(null);
    // The run-up per tile and its maximum are the Triceratops's registry
    // values (revision 20 section 7.2 "Unit info (Triceratops)").
    expect(chargeRunUpBonusV7()).toBe(mechanics("CATAPULT").runUpBonus2 / 2);
    expect(chargeRunUpMaximumV7()).toBe(mechanics("CATAPULT").runUpBonus2);
    expect(CHARGE_DESCRIPTION_V7).toBe(
      `+${chargeRunUpBonusV7()} Attack per tile moved this turn (up to +${chargeRunUpMaximumV7()}). Ignores Walls and Field Defense, destroys Field Defense, and pushes back.`,
    );
    expect(CHARGE_DESCRIPTION_V7).toBe(
      "+1 Attack per tile moved this turn (up to +2). Ignores Walls and Field Defense, destroys Field Defense, and pushes back.",
    );
    expect(dinosaurAbilityDescriptionV7("LINEBREAKER", "DINOSAUR")).toBe(
      CHARGE_DESCRIPTION_V7,
    );
    expect(dinosaurAbilityDescriptionV7("STAMPEDE", "DINOSAUR")).toBe(null);
    expect(dinosaurAbilityDescriptionV7("GROW", "DINOSAUR")).toBe(
      `${GROWTH_RULE}; ${ALPHA_RULE}, for good. Growing fully heals.`,
    );
    expect(PROMOTE_TOOLTIP_V7).toBe("Promote: +5 maximum HP and a full heal");
    expect(PROMOTION_HELP_TIP_V7).toBe(
      "Promotion: a unit with 3 kills can be promoted once: +5 maximum HP and a full heal.",
    );
    expect(dinosaurAbilityDescriptionV7("ARMOURED", "DINOSAUR")).toBe(
      `Takes ${mechanics("GUARD").armourReduction} less damage from every hit, to a minimum of 1.`,
    );
    expect(ARMOURED_PREVIEW_V7).toBe(
      `Armoured −${mechanics("GUARD").armourReduction}`,
    );
    expect(dinosaurAbilityDescriptionV7("ACID", "GOBLIN")).toBe(null);
    expect(technologyNameV7("FORTIFICATION", "DINOSAUR")).toBe("Nesting");
    expect(technologyNameV7("FORTIFICATION", "ORIGINAL")).toBe("Fortification");
    expect(technologyNameV7("EXPLOSIVES", "DINOSAUR")).toBe("Wallbreaker");
    expect(technologyNameV7("EXPLOSIVES", "ORIGINAL")).toBe("Explosives");
    expect(nestingUnlockTextV7()).toBe(
      `Eggs have +${nestingEggHpBonusV7()} HP and hatch one turn sooner; +${nestingCitySlotsV7()} unit slot in every city`,
    );
    expect(ABANDON_EGG_LABEL_V7).toBe("Abandon Egg");
    expect(abandonEggTooltipV7(5)).toBe("Remove this Egg for 5 Coins");
    for (const role of EGG_ROLES)
      expect(eggRefundV7(role, "DINOSAUR")).toBe(
        Math.floor((effectiveRoleRuleV7(role, "DINOSAUR").cost ?? 0) / 2),
      );
  });

  it("writes the Lay Egg row from the preview's cost, slots and hatch time", () => {
    const view = humanView(dinosaurCityFixtureV7());
    for (const role of EGG_ROLES) {
      const preview = layEgg(view, role);
      // The fixture has no Forge: the cost and slots are the registry's.
      expect(preview.cost).toBe(effectiveRoleRuleV7(role, "DINOSAUR").cost);
      expect(preview.slots).toBe(mechanics(role).capacitySlots);
      expect(preview.turnsToHatch).toBeGreaterThanOrEqual(1);
      expect(preview.turnsToHatch).toBeLessThanOrEqual(hatchTurns(role));
      expect(layEggRowTextV7(label(role), preview)).toBe(
        `${label(role)} Egg: ${preview.cost} Coins, ${slotsTextV7(preview.slots)}, hatches in ${turnsTextV7(preview.turnsToHatch)}`,
      );
      expect(layEggUnavailableTextV7(preview, "DINOSAUR")).toBe(null);
    }
    // The formatters themselves.
    expect(turnsTextV7(1)).toBe("1 turn");
    expect(turnsTextV7(3)).toBe("3 turns");
    expect(slotsTextV7(1)).toBe("1 slot");
    expect(slotsTextV7(2)).toBe("2 slots");
    expect(
      layEggRowTextV7("Raptor", { cost: 4, slots: 1, turnsToHatch: 1 }),
    ).toBe("Raptor Egg: 4 Coins, 1 slot, hatches in 1 turn");
    expect(cityCapacityTextV7(5, 7)).toBe("5 of 7 slots");
  });

  it("explains each unavailable reason with the preview's own numbers", () => {
    // No Coins, free slots: every role needs its cost.
    const poor = humanView(dinosaurCityPoorFixtureV7());
    for (const role of EGG_ROLES) {
      const preview = layEgg(poor, role);
      expect(preview.unavailableReason).toBe("INSUFFICIENT_COINS");
      expect(layEggUnavailableTextV7(preview, "DINOSAUR")).toBe(
        `Needs ${preview.cost} Coins`,
      );
    }
    // A full city: every role needs its slots.
    const full = humanView(dinosaurCityFullFixtureV7());
    for (const role of EGG_ROLES) {
      const preview = layEgg(full, role);
      expect(preview.usedSlots).toBe(preview.capacity);
      expect(preview.unavailableReason).toBe("CITY_CAPACITY_FULL");
      expect(layEggUnavailableTextV7(preview, "DINOSAUR")).toBe(
        `Needs ${preview.slots} free ${preview.slots === 1 ? "slot" : "slots"}`,
      );
    }
    // No free nest tile, a spent city action, a siege, a missing technology.
    const raptor = layEgg(humanView(dinosaurCityFixtureV7()), "RAIDER");
    const reason = (unavailableReason: typeof raptor.unavailableReason) =>
      layEggUnavailableTextV7({ ...raptor, unavailableReason }, "DINOSAUR");
    expect(reason("INVALID_TILE")).toBe(LAY_EGG_NO_TILE_V7);
    expect(LAY_EGG_NO_TILE_V7).toBe("No free tile next to the city");
    expect(reason("CITY_ACTION_SPENT")).toBe("City action spent");
    expect(reason("CITY_BESIEGED")).toBe("The city is besieged");
    expect(reason("TECH_REQUIRED")).toBe("Needs Scouting");
  });

  it("writes Egg, growth and unit info text", () => {
    expect(eggInfoTextV7("Raptor", 1)).toBe(
      "Hatches into a Raptor in 1 turn. Cannot move or fight.",
    );
    expect(eggCountdownTextV7(2)).toBe("Hatches in 2 turns");
    expect(growthChipTextV7(0, 1)).toBe("Grows · 1 kill to Big");
    expect(growthChipTextV7(1, 2)).toBe("Big · 2 kills to Alpha");
    expect(growthChipTextV7(2, null)).toBe("Alpha");
    expect(growthInfoTextV7(2)).toBe(`${GROWTH_INFO} Next stage in 2 kills.`);
    expect(growthInfoTextV7(null)).toBe(`${GROWTH_INFO} Fully grown.`);
    const view = humanView(dinosaurShowcaseFixtureV7());
    const lines = (at: CoordV7) => {
      const unit = unitAt(view, at);
      const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
      if (stats?.dinosaur === undefined) throw new Error("stats missing");
      return dinosaurUnitInfoLinesV7(unit.role, stats.dinosaur).map(
        (line) => `${line.id}:${line.name}`,
      );
    };
    const bigBody = (role: UnitRoleIdV7): string[] =>
      mechanics(role).capacitySlots > 1 ? ["slots:Big body"] : [];
    expect(lines(AT.alphaTRex)).toEqual(["growth:Alpha", ...bigBody("KNIGHT")]);
    expect(lines(AT.bigRaptor)).toEqual(["growth:Big", ...bigBody("RAIDER")]);
    expect(lines(AT.ankylosaurus)).toEqual([
      "growth:Growth",
      ...bigBody("GUARD"),
      "no-field-defense:Wild",
    ]);
    expect(lines(AT.laneCaveman)).toEqual(["no-field-defense:Wild"]);
    expect(lines(AT.shaman)).toEqual([]);
    expect(lines(AT.tRexEgg)).toEqual([]);
    expect(dinosaurRecruitNotesV7("KNIGHT", "DINOSAUR")).toEqual([
      `Laid as an Egg next to the city; hatches after ${turnsTextV7(hatchTurns("KNIGHT"))} (one sooner with Nesting, at least 1).`,
      ...(mechanics("KNIGHT").capacitySlots > 1
        ? [
            `Takes ${slotsTextV7(mechanics("KNIGHT").capacitySlots)} in its city.`,
          ]
        : []),
    ]);
    expect(dinosaurRecruitNotesV7("FIGHTER", "DINOSAUR")).toEqual([
      "Dinosaurs cannot build Field Defense.",
    ]);
    expect(dinosaurRecruitNotesV7("KNIGHT", "ORIGINAL")).toEqual([]);
    expect(dinosaurRecruitNotesV7("BATTLESHIP", "DINOSAUR")).toEqual([]);
    // Rewards: the Militia unit and the giant with its slots.
    expect(dinosaurRewardLabelV7("MILITIA")?.[0]).toBe("Militia");
    expect(dinosaurRewardLabelV7("MILITIA")?.[1]).toMatch(
      /^(A free Caveman|Two free Cavemen)$/,
    );
    const giantSlots = mechanics("JUGGERNAUT").capacitySlots;
    expect(dinosaurRewardLabelV7("JUGGERNAUT")).toEqual([
      "Brontosaurus",
      giantSlots > 1
        ? `A giant unit (${slotsTextV7(giantSlots)})`
        : "A giant unit",
    ]);
    expect(dinosaurRewardLabelV7("WALLS")).toBe(null);
  });

  it("writes the Help rules of section 12.3 with the registry's numbers", () => {
    const bigBodies = bigBodyRolesV7();
    expect(DINOSAUR_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Eggs",
      "Egg weakness",
      ...(bigBodies.length > 0 ? ["Big bodies"] : []),
      "Grow",
      "Charge!",
      "Acid",
      "Armoured",
      "Hatch",
      "Nesting",
      "Wallbreaker",
      "Wild",
      "Rampage, Pounce, War Drums",
    ]);
    const rule = (name: string): string =>
      DINOSAUR_HELP_RULES_V7.find(([candidate]) => candidate === name)?.[1] ??
      "";
    expect(rule("Egg weakness")).toBe(
      `an Egg cannot move or fight and has only ${EGG_HP_V7} HP, so enemies can smash it before it hatches, and all Eggs of a captured city are lost.`,
    );
    // Revision 20 section 7.2: the Grow, Charge!, Nesting and Wallbreaker
    // lines (with the contract values, the spec's sentences word for word).
    expect(rule("Grow")).toBe(
      `a Dinosaur grows when it kills: ${GROWTH_RULE} and ${ALPHA_RULE}, for good; each growth fully heals it.`,
    );
    expect(rule("Charge!")).toBe(
      `a Triceratops hits harder the farther it moved this turn (+${chargeRunUpBonusV7()} Attack per tile, up to +${chargeRunUpMaximumV7()}); its attack ignores Walls and Field Defense, destroys Field Defense, and pushes a surviving defender back, taking its place.`,
    );
    expect(rule("Nesting")).toBe(
      `with Nesting, Eggs have +${nestingEggHpBonusV7()} HP and hatch one turn sooner, and every city has one more unit slot.`,
    );
    expect(nestingCitySlotsV7()).toBe(1);
    expect(rule("Wallbreaker")).toBe(
      "with Wallbreaker, dinosaurs ignore City Walls when they attack.",
    );
    expect(rule("Stampede")).toBe("");
    expect(nestingEggHpBonusV7()).toBeGreaterThan(0);
    expect(rule("Wild")).toBe("Dinosaurs cannot build Field Defense.");
    // Every two-slot role is named, and only those.
    for (const role of UNIT_ROLE_IDS_V7.filter(
      (candidate) => candidate !== "PATROL_BOAT" && candidate !== "BATTLESHIP",
    ))
      expect(rule("Big bodies").includes(label(role))).toBe(
        bigBodies.includes(role),
      );
    expect(
      slotCapacityTooltipV7().startsWith("Unit slots used in this city"),
    ).toBe(true);
    for (const role of bigBodies)
      expect(slotCapacityTooltipV7()).toContain(label(role));
  });

  it("explains the Field Defense and Hatch restrictions", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const triceratops = unitAt(view, AT.triceratops);
    // The Shaman's adjacent Egg laid this turn cannot be hatched yet.
    expect(
      hatchBlockedEggsV7(view, unitAt(view, AT.shaman).id).map((egg) => egg.at),
    ).toEqual([AT.newEgg]);
    expect(hatchBlockedEggsV7(view, triceratops.id)).toEqual([]);
    expect(HATCH_NEW_EGG_V7).toBe(
      "This Egg was laid this turn; it can be hatched from your next turn",
    );
    // Field Defense: an own Caveman in own territory where a Human Fighter
    // would be offered it.
    const fortify = humanView(
      dinosaurUiFieldV7([
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 8 } },
        { seat: 0, role: "RAIDER", at: { x: 8, y: 9 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ]),
    );
    const blocked = (at: CoordV7) =>
      dinosaurFieldDefenseBlockedV7(fortify, unitAt(fortify, at).id);
    expect(blocked({ x: 7, y: 8 })).toBe(true);
    expect(blocked({ x: 9, y: 8 })).toBe(true);
    expect(blocked({ x: 8, y: 9 })).toBe(false);
    expect(blocked({ x: 5, y: 2 })).toBe(false);
    expect(
      queryPlayerCommandsV7(fortify).some(
        (command) => command.kind === "BUILD_FIELD_DEFENSE",
      ),
    ).toBe(false);
  });
});

describe("Revision 20 Charge! attack preview text (section 7.2)", () => {
  it("writes the run-up and the Push with the follow, and no Push for a kill", () => {
    // Two tiles over the own Caveman, next to the Juggernaut.
    const view = humanView(chargingShowcase());
    const push = charge(view, AT.chargeFrom, AT.pushTarget);
    // The fixture decides the outcome; the engine preview gives the numbers.
    expect(push.preview).toMatchObject({
      defenderDies: false,
      push: "WILL_PUSH",
      advances: true,
      runUp: 2,
    });
    expect(push.lines).toEqual([
      `Charge +${push.preview.runUp}`,
      "Pushes back; Triceratops follows",
    ]);
    expect(push.note).toBe("Charge +2 · Pushes back; Triceratops follows");
    expect(push.semantic).toBe("Charge +2. Pushes back; Triceratops follows.");
    // The moved Triceratops shows its run-up as a unit status.
    expect(
      view.unitStats.find(
        (entry) => entry.unitId === unitAt(view, AT.chargeFrom).id,
      )?.statuses,
    ).toEqual([`Charge! +${push.preview.runUp} Attack`]);
    // One tile, next to the 1-HP Fighter: a kill has no Push line.
    const killView = humanView(
      moved(dinosaurShowcaseFixtureV7(), AT.triceratops, [AT.killFrom]),
    );
    const kill = charge(killView, AT.killFrom, AT.killTarget);
    expect(kill.preview).toMatchObject({ defenderDies: true, runUp: 1 });
    expect(kill.lines).toEqual(["Charge +1"]);
    // Unmoved: no run-up line; the Push stays.
    const still = humanView(
      dinosaurUiFieldV7([
        { seat: 0, role: "CATAPULT", at: { x: 4, y: 2 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 5, y: 2 } },
      ]),
    );
    expect(charge(still, { x: 4, y: 2 }, { x: 5, y: 2 }).lines).toEqual([
      "Pushes back; Triceratops follows",
    ]);
  });

  it("says 'may be pushed back' for a Mountain behind the target, and names a blocked Push", () => {
    // Behind the target (7, 2) is (8, 2): a Mountain hides the target
    // owner's Engineering from the viewer.
    const mountain = humanView(
      withTileV7(chargingShowcase(), { x: 8, y: 2 }, { terrain: "MOUNTAIN" }),
    );
    const unknown = charge(mountain, AT.chargeFrom, AT.pushTarget);
    expect(unknown.preview.push).toBe("UNKNOWN_BEHIND_FOG");
    expect(unknown.lines).toEqual([
      "Charge +2",
      "Juggernaut may be pushed back",
    ]);
    // A unit behind the target blocks the Push: nothing moves.
    const blocked = humanView(
      dinosaurUiFieldV7([
        { seat: 0, role: "CATAPULT", at: { x: 6, y: 2 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 7, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 2 } },
      ]),
    );
    expect(charge(blocked, { x: 6, y: 2 }, { x: 7, y: 2 }).lines).toEqual([
      "Juggernaut cannot be pushed",
    ]);
  });

  it("reports ignored fortification and the Field Defense destroyed", () => {
    // A Guard on Field Defense in its own territory, next to the Triceratops.
    const fortified = humanView(
      withTileV7(
        dinosaurUiFieldV7([
          { seat: 0, role: "CATAPULT", at: { x: 4, y: 7 } },
          { seat: 1, role: "GUARD", at: { x: 3, y: 7 } },
        ]),
        { x: 3, y: 7 },
        { fieldDefense: true },
      ),
    );
    const broken = charge(fortified, { x: 4, y: 7 }, { x: 3, y: 7 });
    expect(broken.preview).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 1,
    });
    expect(broken.lines).toEqual([
      "Ignores fortification",
      "Pushes back; Triceratops follows",
      "Destroys Field Defense",
    ]);
    expect(broken.note).toBe(
      "Ignores fortification · Pushes back; Triceratops follows · Destroys Field Defense",
    );
  });

  it("names Wallbreaker for another dinosaur that ignores City Walls", () => {
    // Seat 1 is the Dinosaur seat here, on its turn: its T-Rex attacks the
    // Guard on the Human seat's Walled center.
    const state = walledV7({
      attackers: [{ role: "KNIGHT", at: { x: 7, y: 8 } }],
    });
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active player");
    const view = viewForV7(state, actor);
    const wall = charge(view, { x: 7, y: 8 }, { x: 8, y: 8 });
    expect(wall.preview).toMatchObject({
      fortificationIgnored: 2,
      runUp: 0,
    });
    // No Push or follow line: the T-Rex has no Charge!.
    expect(wall.lines).toEqual(["Wallbreaker: ignores City Walls"]);
    // A Triceratops on the same Walls ignores fortification through Charge!.
    const triceratops = walledV7({
      attackers: [{ role: "CATAPULT", at: { x: 7, y: 8 } }],
    });
    expect(
      charge(viewForV7(triceratops, actor), { x: 7, y: 8 }, { x: 8, y: 8 })
        .lines,
    ).toEqual(["Ignores fortification", "Pushes back; Triceratops follows"]);
  });

  it("keeps the death-blast chain warnings of the ordinary attack preview", () => {
    // The Triceratops moves next to the 1-HP Bomb Chucker and kills it; its
    // blast and the Rocket Cart's chain are previewed as for any attack.
    const state = moved(
      dinosaurBlastFixtureV7(),
      DINOSAUR_BLAST_V7.triceratops,
      [{ x: 5, y: 3 }, DINOSAUR_BLAST_V7.chargeFrom],
    );
    const view = humanView(state);
    const kill = charge(
      view,
      DINOSAUR_BLAST_V7.chargeFrom,
      DINOSAUR_BLAST_V7.bombChucker,
    );
    expect(kill.preview).toMatchObject({ defenderDies: true, advances: true });
    expect(kill.lines).toEqual(["Charge +2"]);
    expect(GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.deathBlastDamage).toBeGreaterThan(
      0,
    );
  });
});

describe("Revision 19 Acid and Armoured attack notes", () => {
  it("writes the note from the preview's Acid and Armoured flags", () => {
    const own = humanView(dinosaurShowcaseFixtureV7());
    const plain = queryCombatPreviewV7(
      own,
      unitAt(own, AT.alphaTRex).id,
      unitAt(own, AT.tRexTarget).id,
    );
    if (plain === null) throw new Error("preview missing");
    const note = (flags: Partial<CombatPreviewV7>) =>
      dinosaurCombatNoteV7(
        {
          ...plain,
          acid: false,
          defenderArmoured: false,
          attackerArmoured: false,
          ...flags,
        },
        own,
      );
    expect(note({})).toBe(null);
    expect(note({ acid: true })).toBe("Acid: ignores cover and fortification");
    expect(note({ defenderArmoured: true })).toBe(ARMOURED_PREVIEW_V7);
    expect(note({ attackerArmoured: true })).toBe("Your armour −1");
    expect(note({ acid: true, defenderArmoured: true })).toBe(
      `Acid: ignores cover and fortification · ${ARMOURED_PREVIEW_V7}`,
    );
  });

  it("gets Acid from a Spitter's attack and Armoured from a hit on an Ankylosaurus", () => {
    const own = humanView(dinosaurShowcaseFixtureV7());
    const acid = queryCombatPreviewV7(
      own,
      unitAt(own, AT.spitter).id,
      unitAt(own, AT.acidTarget).id,
    );
    expect(acid?.acid).toBe(true);
    const enemy = humanView(dinosaurEnemyFixtureV7());
    const armoured = queryCombatPreviewV7(
      enemy,
      unitAt(enemy, DINOSAUR_ENEMY_V7.knight).id,
      unitAt(enemy, DINOSAUR_ENEMY_V7.ankylosaurus).id,
    );
    expect(armoured?.defenderArmoured).toBe(true);
    if (acid === null || armoured === null || armoured === undefined)
      throw new Error("preview missing");
    expect(dinosaurCombatNoteV7(acid, own)).toBe(
      "Acid: ignores cover and fortification",
    );
    expect(dinosaurCombatNoteV7(armoured, enemy)).toBe(ARMOURED_PREVIEW_V7);
  });
});

describe("Revision 19 log lines", () => {
  it("logs a Hatch, a laid Egg and growth, and no Stampede line", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    // A Charge that only pushes writes no Dinosaur notice (the ordinary
    // combat log covers it).
    const charging = chargingShowcase();
    const chargingView = humanView(charging);
    const pushed = boundary(charging, {
      kind: "ATTACK",
      unitId: unitAt(chargingView, AT.chargeFrom).id,
      targetUnitId: unitAt(chargingView, AT.pushTarget).id,
    });
    expect(
      dinosaurBoundaryNoticeV7(
        pushed.envelope.events,
        pushed.before,
        pushed.after,
      ),
    ).toBe(null);
    // The Triceratops is one kill short of Big, so this kill grows it.
    const beside = moved(state, AT.triceratops, [AT.killFrom]);
    const besideView = humanView(beside);
    const kill = boundary(beside, {
      kind: "ATTACK",
      unitId: unitAt(besideView, AT.killFrom).id,
      targetUnitId: unitAt(besideView, AT.killTarget).id,
    });
    expect(
      dinosaurBoundaryNoticeV7(kill.envelope.events, kill.before, kill.after),
    ).toEqual({ text: "Your Triceratops grew: Big", toast: true });
    const hatch = boundary(state, {
      kind: "HATCH",
      unitId: unitAt(view, AT.shaman).id,
      eggUnitId: unitAt(view, AT.tRexEgg).id,
    });
    expect(
      dinosaurBoundaryNoticeV7(
        hatch.envelope.events,
        hatch.before,
        hatch.after,
      ),
    ).toEqual({ text: "Your T-Rex hatched", toast: true });
    const cityState = dinosaurCityFixtureV7();
    const laid = boundary(cityState, {
      kind: "LAY_EGG",
      cityId: ownCity(humanView(cityState)).id,
      role: "RAIDER",
      at: { x: 7, y: 7 },
    });
    expect(
      dinosaurBoundaryNoticeV7(laid.envelope.events, laid.before, laid.after),
    ).toEqual({ text: "You laid a Raptor Egg", toast: true });
    // A match without a Dinosaur seat never produces a notice.
    const goblin = humanView(goblinShowcaseFixtureV7());
    expect(dinosaurBoundaryNoticeV7([], goblin, goblin)).toBe(null);
  });

  it("logs an Egg destroyed and Eggs lost with a captured city", () => {
    const state = dinosaurEnemyFixtureV7();
    const view = humanView(state);
    const raptorEgg = unitAt(view, DINOSAUR_ENEMY_V7.raptorEgg);
    const tRexEgg = unitAt(view, DINOSAUR_ENEMY_V7.tRexEgg);
    // The T-Rex Egg has 1 HP left: any hit destroys it.
    const smashed = boundary(state, {
      kind: "ATTACK",
      unitId: unitAt(view, DINOSAUR_ENEMY_V7.fighter).id,
      targetUnitId: tRexEgg.id,
    });
    expect(
      dinosaurBoundaryNoticeV7(
        smashed.envelope.events,
        smashed.before,
        smashed.after,
      ),
    ).toEqual({ text: "Player 2's T-Rex Egg was destroyed", toast: true });
    const lost: readonly PlayerEventV7[] = [
      { kind: "UNIT_DIED", unitId: raptorEgg.id, cause: "CITY_CAPTURED" },
      { kind: "UNIT_DIED", unitId: tRexEgg.id, cause: "CITY_CAPTURED" },
    ];
    expect(dinosaurBoundaryNoticeV7(lost, view, view)).toEqual({
      text: "2 Eggs were lost with Player 2's Capital",
      toast: true,
    });
    expect(dinosaurBoundaryNoticeV7(lost.slice(0, 1), view, view)?.text).toBe(
      "1 Egg was lost with Player 2's Capital",
    );
  });
});

describe("Revision 19 presentation steps", () => {
  it("lunges, flashes after a run-up, slides the survivor back, then follows", () => {
    const state = chargingShowcase();
    const view = humanView(state);
    const triceratops = unitAt(view, AT.chargeFrom);
    const target = unitAt(view, AT.pushTarget);
    const charged = boundary(state, {
      kind: "ATTACK",
      unitId: triceratops.id,
      targetUnitId: target.id,
    });
    expect(
      corePresentationPlanV7(charged.before, charged.envelope, charged.after),
    ).toEqual([
      {
        kind: "MELEE",
        unitId: triceratops.id,
        from: AT.chargeFrom,
        to: AT.pushTarget,
        durationMs: 230,
      },
      {
        kind: "DINOSAUR",
        effect: "CHARGE_HIT",
        cells: [AT.pushTarget],
        unitIds: [],
        durationMs: 250,
      },
      {
        kind: "MOVE",
        unitId: target.id,
        path: [AT.pushTarget, { x: 8, y: 2 }],
        durationMs: 120,
        pushSlide: true,
      },
      {
        kind: "MOVE",
        unitId: triceratops.id,
        path: [AT.chargeFrom, AT.pushTarget],
        durationMs: 90,
      },
    ]);
  });

  it("shows growth after a Charge kill, and no flash without a run-up", () => {
    const state = moved(dinosaurShowcaseFixtureV7(), AT.triceratops, [
      AT.killFrom,
    ]);
    const view = humanView(state);
    const kill = boundary(state, {
      kind: "ATTACK",
      unitId: unitAt(view, AT.killFrom).id,
      targetUnitId: unitAt(view, AT.killTarget).id,
    });
    expect(
      corePresentationPlanV7(kill.before, kill.envelope, kill.after).map(
        (step) => (step.kind === "DINOSAUR" ? step.effect : step.kind),
      ),
    ).toEqual(["MELEE", "CHARGE_HIT", "GROW", "MOVE"]);
    // Unmoved next to its target: a lunge and no thrown rock, the slide of
    // the pushed Guard, and the follow.
    const adjacent = dinosaurUiFieldV7([
      { seat: 0, role: "CATAPULT", at: { x: 4, y: 2 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 2 } },
    ]);
    const adjacentView = humanView(adjacent);
    const attack = boundary(adjacent, {
      kind: "ATTACK",
      unitId: unitAt(adjacentView, { x: 4, y: 2 }).id,
      targetUnitId: unitAt(adjacentView, { x: 5, y: 2 }).id,
    });
    const steps = corePresentationPlanV7(
      attack.before,
      attack.envelope,
      attack.after,
    );
    expect(steps[0]).toMatchObject({ kind: "MELEE", from: { x: 4, y: 2 } });
    expect(
      steps.map((step) => (step.kind === "DINOSAUR" ? step.effect : step.kind)),
    ).toEqual(["MELEE", "MOVE", "MOVE"]);
    // A Brontosaurus's Push keeps its revision-18 cut: no slide, no follow.
    const giant = dinosaurUiFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: { x: 4, y: 2 } },
      { seat: 1, role: "GUARD", at: { x: 5, y: 2 } },
    ]);
    const giantView = humanView(giant);
    const shove = boundary(giant, {
      kind: "ATTACK",
      unitId: unitAt(giantView, { x: 4, y: 2 }).id,
      targetUnitId: unitAt(giantView, { x: 5, y: 2 }).id,
    });
    expect(
      corePresentationPlanV7(shove.before, shove.envelope, shove.after).map(
        (step) => step.kind,
      ),
    ).toEqual(["MELEE"]);
  });

  it("lobs a Spitter's acid, calls and hatches an Egg, pops a laid Egg, and scatters a destroyed one", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const spit = boundary(state, {
      kind: "ATTACK",
      unitId: unitAt(view, AT.spitter).id,
      targetUnitId: unitAt(view, AT.acidTarget).id,
    });
    expect(
      corePresentationPlanV7(spit.before, spit.envelope, spit.after).slice(
        0,
        2,
      ),
    ).toEqual([
      {
        kind: "CATAPULT",
        unitId: unitAt(view, AT.spitter).id,
        from: AT.spitter,
        to: AT.acidTarget,
        durationMs: 280,
        projectile: "ACID",
      },
      {
        kind: "DINOSAUR",
        effect: "ACID_HIT",
        cells: [AT.acidTarget],
        unitIds: [],
        durationMs: 200,
      },
    ]);
    const egg = unitAt(view, AT.tRexEgg);
    const hatch = boundary(state, {
      kind: "HATCH",
      unitId: unitAt(view, AT.shaman).id,
      eggUnitId: egg.id,
    });
    expect(
      corePresentationPlanV7(hatch.before, hatch.envelope, hatch.after),
    ).toEqual([
      {
        kind: "DINOSAUR",
        effect: "HATCH_CALL",
        cells: [AT.tRexEgg],
        unitIds: [],
        durationMs: 250,
        from: AT.shaman,
      },
      {
        kind: "DINOSAUR",
        effect: "HATCH",
        cells: [AT.tRexEgg],
        unitIds: [egg.id],
        durationMs: 450,
      },
    ]);
    const cityState = dinosaurCityFixtureV7();
    const laid = boundary(cityState, {
      kind: "LAY_EGG",
      cityId: ownCity(humanView(cityState)).id,
      role: "RAIDER",
      at: { x: 7, y: 7 },
    });
    expect(
      corePresentationPlanV7(laid.before, laid.envelope, laid.after),
    ).toMatchObject([
      { kind: "DINOSAUR", effect: "EGG_LAID", durationMs: 150 },
    ]);
    const enemy = dinosaurEnemyFixtureV7();
    const enemyView = humanView(enemy);
    const smashed = boundary(enemy, {
      kind: "ATTACK",
      unitId: unitAt(enemyView, DINOSAUR_ENEMY_V7.fighter).id,
      targetUnitId: unitAt(enemyView, DINOSAUR_ENEMY_V7.tRexEgg).id,
    });
    expect(
      corePresentationPlanV7(smashed.before, smashed.envelope, smashed.after)
        .filter((step) => step.kind === "DINOSAUR")
        .map((step) => [step.effect, step.cells]),
    ).toEqual([["EGG_DESTROYED", [DINOSAUR_ENEMY_V7.tRexEgg]]]);
  });

  it("hatches every Egg of a Start Turn in one step, framed for the viewer", () => {
    // Two own Eggs with one turn left hatch when the opponent ends its turn.
    const base = dinosaurUiFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: DINOSAUR_CITY_V7.caveman },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ],
      {
        eggs: [
          { seat: 0, role: "RAIDER", at: { x: 7, y: 7 }, turnsRemaining: 1 },
          { seat: 0, role: "MARKSMAN", at: { x: 9, y: 9 }, turnsRemaining: 1 },
        ],
      },
    );
    const human = base.humanPlayerId;
    const ended = applyCommandV7(base, human, { kind: "END_TURN" });
    if (!ended.accepted) throw new Error(ended.error.code);
    const opponent = ended.state.turnOrder[ended.state.activeSeatIndex];
    if (opponent === undefined) throw new Error("opponent missing");
    const back = applyCommandV7(ended.state, opponent, { kind: "END_TURN" });
    if (!back.accepted) throw new Error(back.error.code);
    const before = viewForV7(ended.state, human);
    const after = viewForV7(back.state, human);
    const envelope = projectEventsV7(
      ended.state,
      back.state,
      human,
      back.events,
    );
    const hatches = corePresentationPlanV7(before, envelope, after).filter(
      (step) => step.kind === "DINOSAUR",
    );
    expect(hatches).toHaveLength(1);
    expect(hatches[0]).toMatchObject({
      effect: "HATCH",
      cells: [
        { x: 7, y: 7 },
        { x: 9, y: 9 },
      ],
      durationMs: 450,
      followCamera: true,
    });
    expect(after.eggs).toEqual([]);
    expect(dinosaurBoundaryNoticeV7(envelope.events, before, after)?.text).toBe(
      "Your Raptor hatched · Your Spitter hatched",
    );
  });
});

describe("Revision 19 War Drums status", () => {
  it("labels a Dinosaur Inspired unit with War Drums", () => {
    const state = dinosaurUiFieldV7([
      { seat: 0, role: "CAPTAIN", at: { x: 5, y: 2 } },
      { seat: 0, role: "RAIDER", at: { x: 5, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
    ]);
    const view = humanView(state);
    const rallied = boundary(state, {
      kind: "RALLY",
      unitId: unitAt(view, { x: 5, y: 2 }).id,
    });
    expect(
      tacticalAttachmentsV7(rallied.after).map((item) => item.label),
    ).toEqual(["War Drums from a Shaman: +1 Attack on the next attack"]);
    const stats = rallied.after.unitStats.find(
      (entry) => entry.unitId === unitAt(rallied.after, { x: 5, y: 3 }).id,
    );
    expect(stats?.statuses).toEqual([
      "War Drums: +1 Attack on the next attack",
    ]);
  });
});
