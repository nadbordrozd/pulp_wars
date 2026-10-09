import { describe, expect, it } from "vitest";
import {
  ASSEMBLE_COST_V7,
  BLASTING_ERUPTION_DAMAGE_V7,
  BOMB_DAMAGE_V7,
  BOMB_LANDING_RANGE_V7,
  BOMB_RANGE_V7,
  BARRICADE_CAP_V7,
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  DIVE_BOMB_DAMAGE_V7,
  ERUPTION_DAMAGE_V7,
  PLATED_CAP_V7,
  REPAIR_MACHINE_V7,
  TUNNEL_RANGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBombRunV7,
  previewTendWoundedV7,
  previewTunnelV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  ASSEMBLE_UNLOCK_TEXT_V7,
  BLASTING_CHARGES_UNLOCK_TEXT_V7,
  BOMB_FROZEN_V7,
  CLOCKWORK_RECOVER_V7,
  DIG_IN_UNLOCK_TEXT_V7,
  DIVE_UNLOCK_TEXT_V7,
  DUG_IN_INFO_V7,
  DWARF_FIELD_DEFENSE_EXPLANATION_V7,
  DWARF_HELP_RULES_V7,
  ENGINEER_SUPPORT_UNLOCK_TEXT_V7,
  GUNNER_CANNOT_MOVE_V7,
  GUNNER_THEN_ONE_MORE_V7,
  KNOCKBACK_BLOCKED_V7,
  NOT_DUG_IN_MOVED_V7,
  PLATED_PREVIEW_V7,
  RIDER_MOVE_HINT_V7,
  STAYS_BEHIND_V7,
  TUNNEL_CONFIRM_HINT_V7,
  KNOCKBACK_V7,
  TUNNEL_ALONE_V7,
  TUNNEL_CONFIRM_INFO_V7,
  TUNNEL_FORECAST_V7,
  TUNNEL_NO_PASSENGER_V7,
  TUNNEL_PICK_INFO_V7,
  assembleCostLineV7,
  noPassengerAccessibleNameV7,
  passengerAccessibleNameV7,
  TUNNEL_MOVED_V7,
  TUNNEL_SURFACED_V7,
  UNFLINCHING_PREVIEW_V7,
  assembleCityFullV7,
  bombPreviewLinesV7,
  bombRunTooltipV7,
  burrowedInfoTextV7,
  clockworkRecoverBlockedV7,
  digInChipV7,
  dwarfAbilityNameV7,
  dwarfAbilityUnavailableTextV7,
  dwarfBoundaryNoticeV7,
  dwarfCombatLinesV7,
  dwarfCommandLabelV7,
  dwarfFieldDefenseBlockedV7,
  dwarfRecruitNotesV7,
  dwarfRewardLabelV7,
  dwarfRoleUnlockTextV7,
  dwarfUnitInfoLinesV7,
  eruptionRingTextV7,
  gunnerShotsTextV7,
  landingHintV7,
  matchHasDwarfSeatV7,
  moundAtV7,
  moundInfoLinesV7,
  tunnelDestinationNameV7,
  tunnelTooltipV7,
} from "../../src/render/dwarf-presentation-v7";
import {
  DWARF_UI_V7,
  DWARF_VICTIM_V7,
  dwarfEruptionAfterFixtureV7,
  dwarfEruptionBeforeFixtureV7,
  dwarfUiFixtureV7,
  dwarfVictimFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Every number expected below comes from the engine constants or the
// registry, so the balance bead (pulp_wars-78i.7) may retune the faction.
const AT = DWARF_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "DWARF").label;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}
function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}
function statsOf(view: PlayerViewV7, at: CoordV7) {
  const unit = unitAt(view, at);
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  if (stats === undefined) throw new Error("no stats");
  return stats;
}
/** Applies `pick` (the first offered command it accepts) for the human. */
function apply(
  state: GameStateV7,
  pick: (command: CommandV7) => boolean,
): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>["events"];
  readonly state: GameStateV7;
} {
  const command = queryPlayerCommandsV7(viewOf(state)).find(pick);
  if (command === undefined) throw new Error("command not offered");
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewOf(state),
    after: viewOf(result.state),
    events: projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    ).events,
    state: result.state,
  };
}

describe("Dwarf texts (RULESET_7_DWARVES.md section 16)", () => {
  it("writes the fourteen Help sentences from the registry and the constants", () => {
    expect(DWARF_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Tunnel",
      "Eruption",
      "Surfacing",
      "Bomb Run",
      "Clockwork",
      "Twin shot",
      "Dig In",
      "Repair",
      // Dwarf crowd control (`pulp_wars-w49.34`): the Engineer's Barricade.
      "Barricade",
      "Assemble",
      "Knockback",
      "Plated",
      "Blasting Charges",
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Whirligig's Whirl
      // (`pulp_wars-w49.33`).
      "Whirl",
    ]);
    const rules = new Map(DWARF_HELP_RULES_V7);
    expect(rules.get("Tunnel")).toBe(
      `a ${label("GUARD")} digs up to ${TUNNEL_RANGE_V7} tiles under anything, taking an adjacent ${label("FIGHTER")} with it; both wait as mounds everyone can see and nobody can touch.`,
    );
    expect(rules.get("Eruption")).toContain(
      `takes ${ERUPTION_DAMAGE_V7} (${BLASTING_ERUPTION_DAMAGE_V7} with Blasting Charges)`,
    );
    expect(rules.get("Bomb Run")).toContain(
      `within ${BOMB_RANGE_V7} tiles, bombs it for ${BOMB_DAMAGE_V7} (${DIVE_BOMB_DAMAGE_V7} with Dive)`,
    );
    expect(rules.get("Clockwork")).toContain(
      `${label("MARKSMAN")}s, ${label("KNIGHT")}s, and ${label("JUGGERNAUT")}s hit at full strength`,
    );
    expect(rules.get("Repair")).toBe(
      `an ${label("CAPTAIN")} heals adjacent machines by ${REPAIR_MACHINE_V7} and other units by 2.`,
    );
    expect(rules.get("Assemble")).toContain(`for ${ASSEMBLE_COST_V7} Coins`);
    expect(rules.get("Bomb Run")).toContain(
      `lands up to ${BOMB_LANDING_RANGE_V7} tiles beyond it`,
    );
    expect(rules.get("Barricade")).toBe(
      `an ${label("CAPTAIN")} builds a Barricade next to itself for ${BARRICADE_COST_V7} Coins (at most ${BARRICADE_CAP_V7} at a time); its ${BARRICADE_HP_V7} HP block every unit until attacks break it, and Repair mends it.`,
    );
    expect(rules.get("Whirl")).toBe(
      `a ${label("KNIGHT")}: hits every enemy next to it at once with its attack, and nobody hits back.`,
    );
    for (const [, rule] of DWARF_HELP_RULES_V7)
      expect(rule).not.toMatch(/Three Hammers/i);
    expect(rules.get("Plated")).toBe(
      `no single hit takes more than ${PLATED_CAP_V7} HP from a ${label("SWORDSMAN")}.`,
    );
  });

  it("names the commands, abilities, rewards and unlocks (section 4 and 16.2)", () => {
    expect(dwarfCommandLabelV7("TUNNEL", "ORIGINAL")).toBe("Tunnel");
    expect(dwarfCommandLabelV7("BOMB_RUN", "UNDEAD")).toBe("Bomb Run");
    expect(dwarfCommandLabelV7("ASSEMBLE", "DWARF")).toBe("Assemble");
    expect(dwarfCommandLabelV7("TEND_WOUNDED", "DWARF")).toBe("Repair");
    expect(dwarfCommandLabelV7("TEND_WOUNDED", "ORIGINAL")).toBeNull();
    expect(dwarfAbilityNameV7("TEND_WOUNDED", "DWARF")).toBe("Repair");
    expect(dwarfAbilityNameV7("PLATED", "ORIGINAL")).toBeNull();
    expect(dwarfRewardLabelV7("MILITIA")).toEqual([
      "Militia",
      `A free ${label("FIGHTER")}`,
    ]);
    expect(dwarfRoleUnlockTextV7("CATAPULT")).toBe(
      `Train ${label("CATAPULT")} (Knockback)`,
    );
    expect(dwarfRoleUnlockTextV7("MARKSMAN")).toBe(
      `Train ${label("MARKSMAN")} (two shots standing still)`,
    );
    expect(dwarfRoleUnlockTextV7("GUARD")).toBe(
      `Train ${label("GUARD")} (Tunnel)`,
    );
    expect(ENGINEER_SUPPORT_UNLOCK_TEXT_V7).toBe(
      `Engineers Repair adjacent units: +${REPAIR_MACHINE_V7} machines, +2 others`,
    );
    expect(ASSEMBLE_UNLOCK_TEXT_V7).toBe(
      "Engineers Assemble Clockwork Gunners",
    );
    expect(DIVE_UNLOCK_TEXT_V7).toBe(`Dive: bombs deal ${DIVE_BOMB_DAMAGE_V7}`);
    expect(DIG_IN_UNLOCK_TEXT_V7).toBe(
      "Hammerers and Moles that stand still on or next to your city centers are dug in",
    );
    expect(BLASTING_CHARGES_UNLOCK_TEXT_V7).toBe(
      `Eruptions deal ${BLASTING_ERUPTION_DAMAGE_V7}; Steam Cannons ignore Walls and Field Defense`,
    );
    expect(tunnelTooltipV7(3)).toBe(
      `Dig up to ${TUNNEL_RANGE_V7} tiles under anything. Enemies next to the Mole take 3 when it surfaces`,
    );
    expect(bombRunTooltipV7(5)).toBe(
      `Fly over an enemy within ${BOMB_RANGE_V7} tiles, bomb it for 5, and land up to ${BOMB_LANDING_RANGE_V7} tiles past it. No reply`,
    );
    expect(STAYS_BEHIND_V7).toBe("Hammerer stays behind");
    // Bead pulp_wars-b5f.8: no text names a tile; the hints and the
    // forecast caveat live in the "?" info only.
    expect(TUNNEL_CONFIRM_HINT_V7).toBe("Tap the tile again or press Tunnel");
    expect(RIDER_MOVE_HINT_V7).toBe("Tap a dot to move the Hammerer");
    expect(TUNNEL_FORECAST_V7).toBe(
      "Damage is a forecast: enemies may move before the Mole surfaces",
    );
    expect(TUNNEL_PICK_INFO_V7).toBe(
      `Choose where the Mole surfaces. Tap a Hammerer to seat or unseat it. ${TUNNEL_FORECAST_V7}`,
    );
    expect(TUNNEL_CONFIRM_INFO_V7).toBe(
      `Tap the tile again or press Tunnel. Tap a dot to move the Hammerer. ${TUNNEL_FORECAST_V7}`,
    );
    expect(passengerAccessibleNameV7("Hammerer", 12, 14, true)).toBe(
      "Hammerer, 12 of 14 HP, riding",
    );
    expect(passengerAccessibleNameV7("Hammerer", 12, 14, false)).toBe(
      "Hammerer, 12 of 14 HP",
    );
    expect(TUNNEL_NO_PASSENGER_V7).toBe("Alone");
    expect(TUNNEL_ALONE_V7).toBe("Tunnel alone");
    expect(noPassengerAccessibleNameV7(false)).toBe("Tunnel alone");
    expect(noPassengerAccessibleNameV7(true)).toBe("Tunnel alone, selected");
    expect(KNOCKBACK_V7).toBe("Knocks back");
    expect(assembleCostLineV7({ cost: 4, usedSlots: 1, capacity: 3 })).toBe(
      "4 Coins · slot 2/3",
    );
    expect(eruptionRingTextV7(2)).toBe(
      "Eruption: 2 damage to enemies on the ground here",
    );
    expect(burrowedInfoTextV7("your")).toBe(
      "Burrowed: surfaces at the start of your next turn. It cannot be attacked",
    );
    expect(dwarfRecruitNotesV7("FIGHTER", "DWARF")).toEqual([
      `${DWARF_FIELD_DEFENSE_EXPLANATION_V7}.`,
    ]);
    expect(dwarfRecruitNotesV7("FIGHTER", "ORIGINAL")).toEqual([]);
    expect(dwarfRecruitNotesV7("MARKSMAN", "DWARF")[0]).toContain(
      "only an Engineer can repair it",
    );
  });
});

describe("Dwarf unit information (section 16.1)", () => {
  it("says dug in, not dug in after a move, clockwork, shots and Plated", () => {
    const view = viewOf(dwarfUiFixtureV7());
    const dug = digInChipV7(
      view,
      unitAt(view, AT.dugInHammerer),
      statsOf(view, AT.dugInHammerer),
    );
    expect(dug).toEqual({ dugIn: true, label: "Dug in", text: DUG_IN_INFO_V7 });
    expect(
      digInChipV7(
        view,
        unitAt(view, AT.movedHammerer),
        statsOf(view, AT.movedHammerer),
      ),
    ).toEqual({
      dugIn: false,
      label: "Not dug in",
      text: NOT_DUG_IN_MOVED_V7,
    });
    // Abroad, the Hammerer next to the Mole is neither.
    expect(
      digInChipV7(view, unitAt(view, AT.rider), statsOf(view, AT.rider)),
    ).toBeNull();
    const gunner = unitAt(view, AT.gunner);
    expect(
      gunnerShotsTextV7(view, gunner, statsOf(view, AT.gunner).dwarf),
    ).toBe("2 shots if it stands still");
    expect(
      dwarfUnitInfoLinesV7(view, gunner, statsOf(view, AT.gunner)).map(
        (line) => line.id,
      ),
    ).toEqual(["clockwork", "shots"]);
    expect(
      dwarfUnitInfoLinesV7(
        view,
        unitAt(view, AT.woundedTank),
        statsOf(view, AT.woundedTank),
      ).map((line) => line.name),
    ).toEqual([`Plated ${PLATED_CAP_V7}`]);
    // The wounded Gunner could Recover, but clockwork never does.
    expect(clockworkRecoverBlockedV7(view, gunner)).toBe(true);
    expect(CLOCKWORK_RECOVER_V7).toBe("Clockwork never recovers by itself");
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "RECOVER" && command.unitId === gunner.id,
      ),
    ).toBe(false);
    // A Hammerer where a Human Fighter would build Field Defense.
    expect(
      dwarfFieldDefenseBlockedV7(view, unitAt(view, AT.dugInHammerer).id),
    ).toBe(true);
  });

  it("describes a mound for its owner and for an enemy, the ring for a Mole only", () => {
    const view = viewOf(dwarfUiFixtureV7());
    const mole = moundAtV7(view, AT.mound);
    const rider = moundAtV7(view, AT.moundRider);
    if (mole === undefined || rider === undefined) throw new Error("mounds");
    const eruption = statsOf(view, AT.gunner).dwarf?.eruptionDamage;
    expect(moundInfoLinesV7(view, mole)).toEqual({
      name: `Your ${label("GUARD")} (burrowed)`,
      burrowed: burrowedInfoTextV7("your"),
      eruption: eruptionRingTextV7(eruption ?? 0),
      rider: null,
    });
    expect(moundInfoLinesV7(view, rider).eruption).toBeNull();
    expect(moundInfoLinesV7(view, rider).rider).toContain("never erupts");
    const victim = viewOf(dwarfVictimFixtureV7());
    const enemy = moundAtV7(victim, DWARF_VICTIM_V7.mound);
    if (enemy === undefined) throw new Error("enemy mound");
    expect(moundInfoLinesV7(victim, enemy).burrowed).toBe(
      burrowedInfoTextV7("Player 2's"),
    );
  });
});

describe("Dwarf previews (section 16.1)", () => {
  it("writes the Tunnel forecast, the bomb lines and the landing threat from the engine previews", () => {
    const view = viewOf(dwarfUiFixtureV7());
    const commands = queryPlayerCommandsV7(view);
    const tunnel = commands.find(
      (command): command is Extract<CommandV7, { kind: "TUNNEL" }> =>
        command.kind === "TUNNEL" &&
        same(command.to, AT.tunnelTo) &&
        command.rider === null,
    );
    if (tunnel === undefined) throw new Error("tunnel");
    const preview = previewTunnelV7(view, tunnel);
    if (preview === null) throw new Error("tunnel preview");
    // Bead pulp_wars-b5f.8: the destination is named by what it erupts
    // on, never by its tile.
    const names = preview.eruptionTargets.map((target) =>
      view.units.find((unit) => unit.id === target.unitId)?.role === "CATAPULT"
        ? "Catapult"
        : "Captain",
    );
    const total = preview.eruptionTargets.reduce(
      (sum, target) => sum + target.damage + target.shieldDamage,
      0,
    );
    expect(names).toHaveLength(2);
    expect(tunnelDestinationNameV7(view, preview)).toBe(
      `Surface next to ${names.join(" and ")}, erupts for ${total}, undermines Field Defense`,
    );
    expect(tunnelDestinationNameV7(view, preview, true)).toBe(
      `Surface next to ${names.join(" and ")}, erupts for ${total}, undermines Field Defense. Hammerer stays behind`,
    );
    const open = commands.find(
      (command): command is Extract<CommandV7, { kind: "TUNNEL" }> => {
        if (command.kind !== "TUNNEL" || command.rider !== null) return false;
        const candidate = previewTunnelV7(view, command);
        return (
          candidate !== null &&
          candidate.eruptionTargets.length === 0 &&
          candidate.undermines.length === 0
        );
      },
    );
    if (open === undefined) throw new Error("open tunnel");
    const quiet = previewTunnelV7(view, open);
    if (quiet === null) throw new Error("open tunnel preview");
    expect(tunnelDestinationNameV7(view, quiet)).toBe("Surface in the open");
    const bomb = commands.find(
      (command): command is Extract<CommandV7, { kind: "BOMB_RUN" }> =>
        command.kind === "BOMB_RUN" &&
        command.targetUnitId === unitAt(view, AT.bombTarget).id,
    );
    if (bomb === undefined) throw new Error("bomb");
    const run = previewBombRunV7(view, bomb);
    if (run === null) throw new Error("bomb preview");
    expect(bombPreviewLinesV7(run)[0]).toBe(
      `Bomb: ${run.damage} damage, no reply`,
    );
    expect(landingHintV7(run)).toBe(
      run.landingThreat > 0
        ? `Landing: up to ${run.landingThreat} damage next turn`
        : "Landing: no visible threat",
    );
  });

  it("names Unflinching, the Gunner's shots, Knockback, Blasting, Plated and Dig In in attack previews", () => {
    const view = viewOf(dwarfUiFixtureV7());
    const gunner = unitAt(view, AT.gunner);
    const captain = unitAt(view, AT.tunnelCaptain);
    const shot = queryCombatPreviewV7(view, gunner.id, captain.id);
    if (shot === null) throw new Error("gunner preview");
    expect(dwarfCombatLinesV7(view, shot)).toEqual({
      notes: [],
      shooter: [
        UNFLINCHING_PREVIEW_V7,
        GUNNER_THEN_ONE_MORE_V7,
        GUNNER_CANNOT_MOVE_V7,
      ],
      knockback: null,
    });
    const cannon = unitAt(view, AT.cannon);
    const pushed = queryCombatPreviewV7(
      view,
      cannon.id,
      unitAt(view, AT.knockTarget).id,
    );
    if (pushed === null) throw new Error("cannon preview");
    expect(dwarfCombatLinesV7(view, pushed).knockback).toEqual({
      to: AT.knockTo,
      blocked: false,
      text: KNOCKBACK_V7,
    });
    const blocked = queryCombatPreviewV7(
      view,
      cannon.id,
      unitAt(view, AT.blockedTarget).id,
    );
    if (blocked === null) throw new Error("blocked preview");
    expect(dwarfCombatLinesV7(view, blocked).notes).toEqual([
      "Ignores fortification",
      KNOCKBACK_BLOCKED_V7,
    ]);
    const victim = viewOf(dwarfVictimFixtureV7());
    const plated = queryCombatPreviewV7(
      victim,
      unitAt(victim, DWARF_VICTIM_V7.catapult).id,
      unitAt(victim, DWARF_VICTIM_V7.tank).id,
    );
    if (plated === null) throw new Error("plated preview");
    expect(dwarfCombatLinesV7(victim, plated).notes).toEqual([
      PLATED_PREVIEW_V7,
    ]);
    const dug = queryCombatPreviewV7(
      victim,
      unitAt(victim, DWARF_VICTIM_V7.fighter).id,
      unitAt(victim, DWARF_VICTIM_V7.dugInHammerer).id,
    );
    if (dug === null) throw new Error("dug-in preview");
    expect(dwarfCombatLinesV7(victim, dug).notes).toEqual(["Dug in"]);
  });

  it("previews an Engineer's Repair as it resolves: +4 on machines, +2 on the others", () => {
    const state = dwarfUiFixtureV7();
    const view = viewOf(state);
    const engineer = unitAt(view, AT.engineer);
    const preview = previewTendWoundedV7(view, engineer.id);
    const amounts = new Map(
      preview?.results.map((result) => [result.unitId, result.amount]) ?? [],
    );
    expect(amounts.get(unitAt(view, AT.woundedTank).id)).toBe(
      REPAIR_MACHINE_V7,
    );
    expect(amounts.get(unitAt(view, AT.woundedHammerer).id)).toBe(2);
    const repaired = apply(
      state,
      (command) =>
        command.kind === "TEND_WOUNDED" && command.unitId === engineer.id,
    );
    const event = repaired.events.find(
      (candidate) => candidate.kind === "WOUNDED_TENDED",
    );
    if (event?.kind !== "WOUNDED_TENDED") throw new Error("no Repair event");
    expect(
      new Map(event.results.map((result) => [result.unitId, result.amount])),
    ).toEqual(amounts);
  });

  it("names why a Tunnel, Bomb Run or Assemble is unavailable", () => {
    const view = viewOf(dwarfUiFixtureV7());
    const mole = unitAt(view, AT.mole);
    expect(
      dwarfAbilityUnavailableTextV7(
        view,
        { ...mole, activation: { ...mole.activation, moved: true } },
        "TUNNEL",
        false,
      ),
    ).toBe(TUNNEL_MOVED_V7);
    expect(
      dwarfAbilityUnavailableTextV7(
        { ...view, surfacedThisTurn: [mole.id] },
        mole,
        "TUNNEL",
        false,
      ),
    ).toBe(TUNNEL_SURFACED_V7);
    expect(dwarfAbilityUnavailableTextV7(view, mole, "TUNNEL", true)).toBe(
      null,
    );
    const gyro = unitAt(view, AT.gyrocopter);
    expect(
      dwarfAbilityUnavailableTextV7(
        {
          ...view,
          frozen: [{ unitId: gyro.id, turnsLeft: 1 }],
        },
        gyro,
        "BOMB_RUN",
        false,
      ),
    ).toBe(BOMB_FROZEN_V7);
    expect(dwarfAbilityUnavailableTextV7(view, gyro, "BOMB_RUN", false)).toBe(
      `No enemy within ${BOMB_RANGE_V7} tiles`,
    );
    const engineer = unitAt(view, AT.engineer);
    expect(
      dwarfAbilityUnavailableTextV7(view, engineer, "ASSEMBLE", false, {
        reason: "CITY_CAPACITY_FULL",
        city: "Your Capital",
      }),
    ).toBe(assembleCityFullV7("Your Capital"));
    expect(
      dwarfAbilityUnavailableTextV7(view, engineer, "ASSEMBLE", false, {
        reason: "TECH_REQUIRED",
        city: "Your Capital",
      }),
    ).toBe("Needs Clockwork");
  });
});

describe("Dwarf log lines (section 16.2)", () => {
  it("logs a tunnel with a rider, a bomb, an Assemble, a Repair and a Knockback", () => {
    const state = dwarfUiFixtureV7();
    const view = viewOf(state);
    const notice = (result: ReturnType<typeof apply>): string | undefined =>
      dwarfBoundaryNoticeV7(result.events, result.before, result.after)?.text;
    expect(
      notice(
        apply(
          state,
          (command) =>
            command.kind === "TUNNEL" &&
            same(command.to, AT.tunnelTo) &&
            command.rider !== null,
        ),
      ),
    ).toBe("Your Steam Mole tunnelled (with a Hammerer)");
    const bomb = apply(
      state,
      (command) =>
        command.kind === "BOMB_RUN" &&
        command.targetUnitId === unitAt(view, AT.bombTarget).id,
    );
    expect(notice(bomb)).toMatch(/^Your Gyrocopter bombed a Marksman for \d+$/);
    expect(notice(apply(state, (command) => command.kind === "ASSEMBLE"))).toBe(
      "Your Engineer assembled a Clockwork Gunner",
    );
    expect(
      notice(apply(state, (command) => command.kind === "TEND_WOUNDED")),
    ).toBe(`Your Engineer repaired 2 units (+${REPAIR_MACHINE_V7 + 2} HP)`);
    expect(
      notice(
        apply(
          state,
          (command) =>
            command.kind === "ATTACK" &&
            command.unitId === unitAt(view, AT.cannon).id &&
            command.targetUnitId === unitAt(view, AT.knockTarget).id,
        ),
      ),
    ).toBe("Your Steam Cannon knocked back a Guard");
  });

  it("logs the eruption at the Dwarf Start Turn", () => {
    const before = dwarfEruptionBeforeFixtureV7();
    const after = dwarfEruptionAfterFixtureV7();
    const active = before.turnOrder[before.activeSeatIndex];
    if (active === undefined) throw new Error("no active seat");
    const result = applyCommandV7(before, active, { kind: "END_TURN" });
    if (!result.accepted) throw new Error(result.error.code);
    const events = projectEventsV7(
      before,
      result.state,
      before.humanPlayerId,
      result.events,
    ).events;
    const surfaced = events.find((event) => event.kind === "UNIT_SURFACED");
    if (surfaced?.kind !== "UNIT_SURFACED") throw new Error("no surfacing");
    expect(
      dwarfBoundaryNoticeV7(events, viewOf(before), viewOf(after)),
    ).toEqual({
      text: `Your Steam Mole erupted: ${surfaced.results.length} units hit`,
      toast: true,
    });
  });

  it("changes nothing in a match without a Dwarf seat", () => {
    const view = viewOf(martianUiFixtureV7());
    expect(matchHasDwarfSeatV7(view)).toBe(false);
    expect(dwarfBoundaryNoticeV7([], view, view)).toBeNull();
    expect(view.burrowed).toEqual([]);
  });
});
