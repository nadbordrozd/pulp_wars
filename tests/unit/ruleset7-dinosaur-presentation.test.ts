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
  previewStampedeV7,
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
  HATCH_NEW_EGG_V7,
  LAY_EGG_NO_TILE_V7,
  STAMPEDE_MOVED_V7,
  STAMPEDE_NO_LANE_V7,
  STAMPEDE_TOOLTIP_V7,
  abandonEggTooltipV7,
  bigBodyRolesV7,
  cityCapacityTextV7,
  dinosaurAbilityDescriptionV7,
  dinosaurAbilityNameV7,
  dinosaurBoundaryNoticeV7,
  dinosaurCombatNoteV7,
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
  nestingEggHpBonusV7,
  slotCapacityTooltipV7,
  slotsTextV7,
  stampedePreviewTextV7,
  stampedeRunBonusV7,
  stampedeUnavailableTextV7,
  turnsTextV7,
  unitDisplayNameV7,
} from "../../src/render/dinosaur-presentation-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { tacticalAttachmentsV7 } from "../../src/render/tactical-presentation-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { withTileV7 } from "../fixtures/v7-dinosaur-arena";
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
// public preview: the balance bead (`pulp_wars-c87.8`) may tune hatch times,
// slots, costs, HP, Attack, the Egg, growth and the Stampede bonus. The
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
const GROWTH_INFO = `Big: +${GROWTH_HP_V7} HP. Alpha: +${GROWTH_HP_V7 * 2} HP, +${ALPHA_ATTACK2_V7 / 2} Attack.`;

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

function stampede(view: PlayerViewV7, from: CoordV7, target: CoordV7) {
  const preview = previewStampedeV7(
    view,
    unitAt(view, from).id,
    unitAt(view, target).id,
  );
  if (preview === null) throw new Error("Stampede not offered");
  return { preview, text: stampedePreviewTextV7(view, preview) };
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
    expect(dinosaurCommandLabelV7("STAMPEDE", "DINOSAUR")).toBe("Stampede");
    expect(dinosaurCommandLabelV7("RALLY", "DINOSAUR")).toBe("War Drums");
    expect(dinosaurCommandLabelV7("RALLY", "ORIGINAL")).toBe(null);
    expect(
      ["RALLY", "OVERRUN", "CHARGE", "GROW", "ACID", "ARMOURED"].map(
        (ability) => dinosaurAbilityNameV7(ability, "DINOSAUR"),
      ),
    ).toEqual(["War Drums", "Rampage", "Pounce", "Grows", "Acid", "Armoured"]);
    expect(dinosaurAbilityNameV7("OVERRUN", "ORIGINAL")).toBe(null);
    // The Stampede bonus per tile is the Triceratops's registry value.
    expect(stampedeRunBonusV7()).toBe(
      mechanics("CATAPULT").stampedeRunBonus2 / 2,
    );
    expect(STAMPEDE_TOOLTIP_V7).toBe(
      `Charge a unit 2 or 3 tiles away in a straight line: +${stampedeRunBonusV7()} Attack per tile run.`,
    );
    expect(dinosaurAbilityDescriptionV7("STAMPEDE", "DINOSAUR")).toBe(
      `${STAMPEDE_TOOLTIP_V7} No retaliation; a survivor is pushed back.`,
    );
    expect(dinosaurAbilityDescriptionV7("GROW", "DINOSAUR")).toBe(
      `${GROWTH_RULE}; ${ALPHA_RULE}, for good.`,
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
      "Stampede",
      "Acid",
      "Armoured",
      "Hatch",
      "Nesting",
      "Wild",
      "Rampage, Pounce, War Drums",
    ]);
    const rule = (name: string): string =>
      DINOSAUR_HELP_RULES_V7.find(([candidate]) => candidate === name)?.[1] ??
      "";
    expect(rule("Egg weakness")).toBe(
      `an Egg cannot move or fight and has only ${EGG_HP_V7} HP, so enemies can smash it before it hatches, and all Eggs of a captured city are lost.`,
    );
    expect(rule("Grow")).toBe(
      `a Dinosaur grows when it kills: ${GROWTH_RULE} and ${ALPHA_RULE}, for good.`,
    );
    expect(rule("Stampede")).toContain(
      `with +${stampedeRunBonusV7()} Attack per tile run and no retaliation`,
    );
    expect(rule("Nesting")).toBe(
      `with Nesting, Eggs have +${nestingEggHpBonusV7()} HP and hatch one turn sooner.`,
    );
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

  it("explains the Field Defense, Stampede and Hatch restrictions", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const commands = queryPlayerCommandsV7(view);
    const offered = (unitId: number) =>
      commands.some(
        (command) => command.kind === "STAMPEDE" && command.unitId === unitId,
      );
    const triceratops = unitAt(view, AT.triceratops);
    expect(
      stampedeUnavailableTextV7(view, triceratops.id, offered(triceratops.id)),
    ).toBe(null);
    // No offered Stampede: "no lane" before moving, "moved" afterwards.
    expect(stampedeUnavailableTextV7(view, triceratops.id, false)).toBe(
      STAMPEDE_NO_LANE_V7,
    );
    const moved = boundary(state, {
      kind: "MOVE",
      unitId: triceratops.id,
      path: [{ x: 3, y: 2 }],
    });
    expect(stampedeUnavailableTextV7(moved.after, triceratops.id, false)).toBe(
      STAMPEDE_MOVED_V7,
    );
    expect(STAMPEDE_MOVED_V7).toBe(
      "A Triceratops cannot Stampede after moving",
    );
    expect(STAMPEDE_NO_LANE_V7).toBe(
      "No clear lane: needs open ground in a straight line",
    );
    // A unit that is no Triceratops never shows the hint.
    expect(
      stampedeUnavailableTextV7(view, unitAt(view, AT.shaman).id, false),
    ).toBe(null);
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

describe("Revision 19 Stampede preview text", () => {
  it("describes a Push with the follow, a kill with the advance, and no retaliation", () => {
    const view = humanView(dinosaurShowcaseFixtureV7());
    const push = stampede(view, AT.triceratops, AT.pushTarget);
    const { combat } = push.preview;
    // The fixture decides the outcome; the engine preview gives the numbers.
    expect(combat.defenderDies).toBe(false);
    expect(combat.push).toBe("WILL_PUSH");
    expect(push.preview.runTiles).toBe(2);
    expect(push.text).toEqual({
      run: `Runs 2 tiles: +${combat.stampede} Attack`,
      damage: `Deals ${combat.damageToDefender} damage`,
      outcome: "Pushes Juggernaut back; Triceratops follows",
      outcomeShort: "Pushes back · follows",
      noRetaliation: "No retaliation",
      fieldDefense: null,
      armoured: null,
      warnings: [],
      warningSummary: null,
      needsConfirmation: false,
      boardLabel: `Deal ${combat.damageToDefender} · run +${combat.stampede}`,
      boardNote: "Pushes back · follows · No retaliation",
      chip: `Juggernaut −${combat.damageToDefender}`,
      description: `Runs 2 tiles: +${combat.stampede} Attack. Deals ${combat.damageToDefender} damage. Pushes Juggernaut back; Triceratops follows. No retaliation.`,
    });
    const kill = stampede(view, AT.triceratops, AT.killTarget);
    expect(kill.preview.combat.defenderDies).toBe(true);
    expect(kill.preview.runTiles).toBe(1);
    expect(kill.text).toMatchObject({
      run: `Runs 1 tile: +${kill.preview.combat.stampede} Attack`,
      damage: `Deals ${kill.preview.combat.damageToDefender} damage`,
      outcome: "Kills Fighter; Triceratops advances",
      boardNote: "Kills · advances · No retaliation",
    });
  });

  it("says 'may be pushed' for a Mountain behind the target, and names a blocked Push", () => {
    // Behind the target (7, 2) is (8, 2): a Mountain hides the target
    // owner's Engineering from the viewer.
    const mountain = humanView(
      withTileV7(
        dinosaurShowcaseFixtureV7(),
        { x: 8, y: 2 },
        { terrain: "MOUNTAIN" },
      ),
    );
    const unknown = stampede(mountain, AT.triceratops, AT.pushTarget);
    expect(unknown.preview.combat.push).toBe("UNKNOWN_BEHIND_FOG");
    expect(unknown.text).toMatchObject({
      outcome: "Juggernaut may be pushed back",
      boardNote: "May be pushed · No retaliation",
    });
    // A unit behind the target blocks the Push: nothing moves.
    const blocked = humanView(
      dinosaurUiFieldV7([
        { seat: 0, role: "CATAPULT", at: { x: 4, y: 2 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 7, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 2 } },
      ]),
    );
    expect(
      stampede(blocked, { x: 4, y: 2 }, { x: 7, y: 2 }).text,
    ).toMatchObject({
      outcome: "Juggernaut cannot be pushed; Triceratops stops next to it",
      boardNote: "Not pushed · stops · No retaliation",
    });
  });

  it("reports the Field Defense lost and the death-blast chain warnings", () => {
    const fortified = humanView(
      withTileV7(dinosaurShowcaseFixtureV7(), AT.pushTarget, {
        fieldDefense: true,
      }),
    );
    const lost = stampede(fortified, AT.triceratops, AT.pushTarget).text;
    expect(lost.fieldDefense).toBe("Destroys Field Defense");
    expect(lost.boardNote).toBe(
      "Pushes back · follows · No retaliation · Field Defense destroyed",
    );
    const blastView = humanView(dinosaurBlastFixtureV7());
    const blast = stampede(
      blastView,
      DINOSAUR_BLAST_V7.triceratops,
      DINOSAUR_BLAST_V7.bombChucker,
    );
    const totals = blast.preview.explosions.totals;
    expect(blast.text.needsConfirmation).toBe(true);
    expect(blast.text.outcome).toBe("Kills Bomb Chucker; Triceratops advances");
    // Blast damages are the Goblin registry's.
    expect(blast.text.warnings).toEqual([
      `Enemy Bomb Chucker explodes on death: ${GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.deathBlastDamage} damage around it`,
      `Chain reaction: enemy Rocket Cart explodes (${GOBLIN_ROLE_MECHANICS_V7.CATAPULT.deathBlastDamage} damage)`,
      `Blasts hit 2 of your units, ${totals.friendlyKills} killed`,
    ]);
    expect(blast.text.warningSummary).toBe(
      `Chain: 2 blasts · 2 yours hit${totals.friendlyKills > 0 ? `, ${totals.friendlyKills} killed` : ""}`,
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
      dinosaurCombatNoteV7({
        ...plain,
        acid: false,
        defenderArmoured: false,
        attackerArmoured: false,
        ...flags,
      });
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
    expect(dinosaurCombatNoteV7(acid)).toBe(
      "Acid: ignores cover and fortification",
    );
    expect(dinosaurCombatNoteV7(armoured)).toBe(ARMOURED_PREVIEW_V7);
  });
});

describe("Revision 19 log lines", () => {
  it("logs a Stampede, a Hatch, a laid Egg and growth", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const triceratops = unitAt(view, AT.triceratops);
    const pushed = boundary(state, {
      kind: "STAMPEDE",
      unitId: triceratops.id,
      targetUnitId: unitAt(view, AT.pushTarget).id,
    });
    const pushDamage = stampede(view, AT.triceratops, AT.pushTarget).preview
      .combat.damageToDefender;
    expect(
      dinosaurBoundaryNoticeV7(
        pushed.envelope.events,
        pushed.before,
        pushed.after,
      ),
    ).toEqual({
      text: `Your Triceratops stampeded Player 2's Juggernaut: ${pushDamage} damage`,
      toast: true,
    });
    // The Triceratops is one kill short of Big, so this kill grows it.
    const kill = boundary(state, {
      kind: "STAMPEDE",
      unitId: triceratops.id,
      targetUnitId: unitAt(view, AT.killTarget).id,
    });
    const killDamage = stampede(view, AT.triceratops, AT.killTarget).preview
      .combat.damageToDefender;
    expect(
      dinosaurBoundaryNoticeV7(kill.envelope.events, kill.before, kill.after)
        ?.text,
    ).toBe(
      `Your Triceratops stampeded Player 2's Fighter: ${killDamage} damage · Your Triceratops grew: Big`,
    );
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
  it("runs, hits from the stand tile, pushes the survivor, then follows", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const triceratops = unitAt(view, AT.triceratops);
    const target = unitAt(view, AT.pushTarget);
    const stampeded = boundary(state, {
      kind: "STAMPEDE",
      unitId: triceratops.id,
      targetUnitId: target.id,
    });
    const stand = { x: 6, y: 2 };
    expect(
      corePresentationPlanV7(
        stampeded.before,
        stampeded.envelope,
        stampeded.after,
      ),
    ).toEqual([
      {
        kind: "MOVE",
        unitId: triceratops.id,
        path: [AT.triceratops, AT.laneCaveman, stand],
        durationMs: 180,
        stampedeRun: true,
      },
      {
        kind: "MELEE",
        unitId: triceratops.id,
        from: stand,
        to: AT.pushTarget,
        durationMs: 230,
      },
      {
        kind: "DINOSAUR",
        effect: "STAMPEDE_HIT",
        cells: [AT.pushTarget],
        unitIds: [],
        durationMs: 250,
      },
      {
        kind: "MOVE",
        unitId: target.id,
        path: [AT.pushTarget, { x: 8, y: 2 }],
        durationMs: 120,
      },
      {
        kind: "MOVE",
        unitId: triceratops.id,
        path: [stand, AT.pushTarget],
        durationMs: 90,
      },
    ]);
  });

  it("shows growth after a Stampede kill and an ordinary Triceratops attack as melee", () => {
    const state = dinosaurShowcaseFixtureV7();
    const view = humanView(state);
    const triceratops = unitAt(view, AT.triceratops);
    const kill = boundary(state, {
      kind: "STAMPEDE",
      unitId: triceratops.id,
      targetUnitId: unitAt(view, AT.killTarget).id,
    });
    expect(
      corePresentationPlanV7(kill.before, kill.envelope, kill.after).map(
        (step) => (step.kind === "DINOSAUR" ? step.effect : step.kind),
      ),
    ).toEqual(["MOVE", "MELEE", "STAMPEDE_HIT", "GROW", "MOVE"]);
    // Adjacent target: an ordinary attack, a lunge and no thrown rock.
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
    expect(
      corePresentationPlanV7(attack.before, attack.envelope, attack.after)[0],
    ).toMatchObject({ kind: "MELEE", from: { x: 4, y: 2 } });
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
