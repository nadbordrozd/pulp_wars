import { describe, expect, it } from "vitest";
import {
  BOLAS_RANGE_V7,
  BRITTLE_SHATTER_HP_V7,
  COLD_BLOOD_BONUS2_V7,
  COLD_SNAP_RANGE_V7,
  DEEP_WINTER_RADIUS_V7,
  DEEP_WINTER_RECOVER_V7,
  PLANTED_BONUS2_V7,
  ROCKFALL_ATTACK2_V7,
  SHATTER_HP_V7,
  SWEEP_DAMAGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBolasV7,
  previewColdSnapV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  BLIZZARD_PREVIEW_V7,
  BOULDERS_PREVIEW_V7,
  CHILLED_PREVIEW_V7,
  COLD_BLOOD_PREVIEW_V7,
  COLD_SNAP_NO_TARGET_V7,
  FROZEN_IT_MOVED_V7,
  FROZEN_STATUS_V7,
  HIDDEN_BLIZZARD_PREVIEW_V7,
  ICE_FOLK_HELP_RULES_V7,
  PLANTED_PREVIEW_V7,
  ROCKFALL_PREVIEW_V7,
  SNOW_COVER_PREVIEW_V7,
  TRAMPLE_PREVIEW_V7,
  WILL_BE_FROZEN_V7,
  bolasPreviewLinesV7,
  boulderThrowTextV7,
  chillChipV7,
  chillStateV7,
  coldSnapSummaryV7,
  frostedStatusTextV7,
  iceFolkAbilityNameV7,
  iceFolkAbilityUnavailableTextV7,
  iceFolkBoundaryNoticeV7,
  iceFolkCombatLinesV7,
  iceFolkCommandLabelV7,
  iceFolkFieldDefenseBlockedV7,
  iceFolkRecruitNotesV7,
  iceFolkRewardLabelV7,
  iceFolkRoleUnlockTextV7,
  iceFolkUnitInfoLinesV7,
  matchHasIceFolkSeatV7,
  shatterThresholdAgainstV7,
  shatterWindowV7,
  snowTooltipV7,
} from "../../src/render/ice-folk-presentation-v7";
import {
  ICE_FOLK_UI_V7,
  ICE_FOLK_VICTIM_V7,
  iceFolkUiFieldV7,
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Labels and numbers are read from the registry, the engine constants and
// the public previews, so a balance retune (pulp_wars-7g3.7) needs no
// change here.
const AT = ICE_FOLK_UI_V7;
const label = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "ICE_FOLK").label;
const half = (value2: number): string => String(value2 / 2);
const humanView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const unitAt = (view: PlayerViewV7, at: CoordV7) => {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
};
const statsAt = (view: PlayerViewV7, at: CoordV7) => {
  const stats = view.unitStats.find(
    (entry) => entry.unitId === unitAt(view, at).id,
  );
  if (stats === undefined) throw new Error("no stats");
  return stats;
};
const preview = (
  view: PlayerViewV7,
  from: CoordV7,
  to: CoordV7,
): CombatPreviewV7 => {
  const result = queryCombatPreviewV7(
    view,
    unitAt(view, from).id,
    unitAt(view, to).id,
  );
  if (result === null) throw new Error("no preview");
  return result;
};

describe("Ice Folk texts (section 13.2)", () => {
  it("builds every number of a sentence from the engine constants", () => {
    expect(frostedStatusTextV7(SHATTER_HP_V7)).toBe(
      `Frosted: an Ice Folk blow that leaves it at ${SHATTER_HP_V7} HP or less shatters it`,
    );
    expect(ROCKFALL_PREVIEW_V7).toBe(
      `Rockfall: Attack ${half(ROCKFALL_ATTACK2_V7)} from the Mountain`,
    );
    expect(PLANTED_PREVIEW_V7).toBe(
      `Planted: +${half(PLANTED_BONUS2_V7)} Attack`,
    );
    expect(COLD_BLOOD_PREVIEW_V7).toBe(
      `Cold Blood: +${half(COLD_BLOOD_BONUS2_V7)} Attack`,
    );
    // Ice Folk Freeze (`pulp_wars-w49.37`): Cold Snap reaches the eight
    // tiles around the Witch.
    expect(COLD_SNAP_RANGE_V7).toBe(1);
    expect(COLD_SNAP_NO_TARGET_V7).toBe("No enemy next to her");
    const boulder = effectiveRoleRuleV7("CATAPULT", "ICE_FOLK").attack2;
    expect(boulderThrowTextV7(true)).toBe(
      `Planted: Attack ${half(boulder + PLANTED_BONUS2_V7)}`,
    );
    expect(boulderThrowTextV7(false)).toBe(`Moved: Attack ${half(boulder)}`);
  });

  it("names the Snow tile for the viewer's faction", () => {
    expect(snowTooltipV7(humanView(iceFolkUiFixtureV7()))).toBe(
      "Snow: your units move at half cost from Snow to Snow and have light cover here unless fortified",
    );
    expect(snowTooltipV7(humanView(iceFolkVictimFixtureV7()))).toBe(
      "Snow: your units stop on entering, as in a Forest. Ice Folk units have cover",
    );
  });

  it("labels the abilities, commands, rewards and role unlocks from the registry", () => {
    expect(iceFolkAbilityNameV7("MOUNTAIN_BORN", "ICE_FOLK")).toBe(
      "Mountain-born",
    );
    expect(iceFolkAbilityNameV7("MOUNTAIN_BORN", "ORIGINAL")).toBeNull();
    expect(iceFolkCommandLabelV7("THROW_BOLAS")).toBe("Bolas");
    expect(iceFolkCommandLabelV7("COLD_SNAP")).toBe("Cold Snap");
    expect(iceFolkRewardLabelV7("MILITIA")).toEqual([
      "Militia",
      `A free ${label("FIGHTER")}`,
    ]);
    expect(iceFolkRewardLabelV7("JUGGERNAUT")?.[0]).toBe(label("JUGGERNAUT"));
    expect(iceFolkRoleUnlockTextV7("CAPTAIN")).toBe(
      `Train ${label("CAPTAIN")} (Blizzard, Cold Snap)`,
    );
    expect(iceFolkRoleUnlockTextV7("SWORDSMAN")).toBe(
      `Train ${label("SWORDSMAN")} (Sweep, Trample)`,
    );
    expect(iceFolkRoleUnlockTextV7("CATAPULT")).toBe(
      `Train ${label("CATAPULT")} (ignores Walls and Field Defense)`,
    );
    expect(iceFolkRecruitNotesV7("FIGHTER", "ICE_FOLK")).toContain(
      "Ice Folk cannot build Field Defense.",
    );
    expect(iceFolkRecruitNotesV7("FIGHTER", "ORIGINAL")).toEqual([]);
  });
});

describe("Chill markers and the Shatter window (section 13.1)", () => {
  it("reads Frozen, Frosted and Thawing from the view's Chill entries", () => {
    const view = humanView(iceFolkUiFixtureV7());
    expect(chillStateV7(view, unitAt(view, AT.frozenEnemy).id)).toBe("FROZEN");
    // Ice Folk Freeze (`pulp_wars-w49.37`): every entry is Frozen, and a
    // unit that thawed has none.
    expect(chillStateV7(view, unitAt(view, AT.shatterTarget).id)).toBe(
      "FROZEN",
    );
    expect(chillStateV7(view, unitAt(view, AT.thawingEnemy).id)).toBeNull();
    expect(chillStateV7(view, unitAt(view, AT.sweepTarget).id)).toBeNull();
    expect(chillChipV7(view, unitAt(view, AT.frozenEnemy))?.status).toBe(
      FROZEN_STATUS_V7,
    );
    expect(chillChipV7(view, unitAt(view, AT.thawingEnemy))).toBeNull();
  });

  it("uses the threshold of the hostile Ice Folk seat, Brittle included", () => {
    // The fixture researches every technology: Brittle sets the threshold.
    const own = humanView(iceFolkUiFixtureV7());
    const frosted = unitAt(own, AT.shatterTarget);
    expect(shatterThresholdAgainstV7(own, frosted.ownerId)).toBe(
      BRITTLE_SHATTER_HP_V7,
    );
    expect(shatterWindowV7(own, frosted)).toBe(BRITTLE_SHATTER_HP_V7);
    expect(chillChipV7(own, frosted)?.status).toBe(FROZEN_STATUS_V7);
    // Thawing units have no window; an own unit has no hostile Ice Folk.
    expect(shatterWindowV7(own, unitAt(own, AT.thawingEnemy))).toBeNull();
    expect(shatterThresholdAgainstV7(own, own.viewer.id)).toBeNull();
    // Without Brittle the base threshold applies; the other side reads it
    // from the public stats of the Ice Folk units it can see.
    const plain = humanView(
      iceFolkUiFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 }, chill: "FROSTED" },
        ],
        { techs: { 0: [], 1: [] } },
      ),
    );
    expect(shatterWindowV7(plain, unitAt(plain, { x: 5, y: 4 }))).toBe(
      SHATTER_HP_V7,
    );
    const victim = humanView(iceFolkVictimFixtureV7());
    const fighter = unitAt(victim, ICE_FOLK_VICTIM_V7.frozenFighter);
    expect(shatterThresholdAgainstV7(victim, fighter.ownerId)).toBe(
      statsAt(victim, ICE_FOLK_VICTIM_V7.witch).iceFolk?.shatterThreshold,
    );
  });

  it("writes the unit information lines from the stats", () => {
    const view = humanView(iceFolkUiFixtureV7());
    const ids = (at: CoordV7) =>
      iceFolkUnitInfoLinesV7(view, unitAt(view, at), statsAt(view, at)).map(
        (line) => line.id,
      );
    expect(ids(AT.boulderYeti)).toEqual(["threshold", "blizzard", "planted"]);
    expect(ids(AT.rockfallYeti)).toEqual(["threshold", "rockfall"]);
    expect(ids(AT.frozenEnemy)).toEqual(["chill"]);
    expect(ids(AT.sweepTarget)).toEqual([]);
  });
});

describe("Ice Folk attack previews (section 13.1)", () => {
  const view = humanView(iceFolkUiFixtureV7());

  it("says Shatters and Chilled when the preview shatters", () => {
    const shatter = preview(view, AT.yeti, AT.shatterTarget);
    expect(shatter.shatters).toBe(true);
    const lines = iceFolkCombatLinesV7(view, shatter);
    expect(lines.shatters).toBe(true);
    expect(lines.notes).toContain(CHILLED_PREVIEW_V7);
  });

  it("lists the Sweep flank victims and the Trample from the preview's splash", () => {
    const sweep = preview(view, AT.mammoth, AT.sweepTarget);
    const lines = iceFolkCombatLinesV7(view, sweep);
    expect(lines.notes).toContain(TRAMPLE_PREVIEW_V7);
    expect(lines.sweep.map((entry) => [entry.at, entry.damage])).toEqual(
      sweep.splash.map((entry) => [
        entry.at,
        entry.damage + entry.shieldDamage,
      ]),
    );
    expect(lines.sweep.map((entry) => entry.text)).toEqual(
      sweep.splash.map(
        (entry) =>
          `Sweep: ${effectiveRoleRuleV7(unitAt(view, entry.at).role, "ORIGINAL").label} ${entry.damage} damage${entry.dies ? ", lethal" : ""}`,
      ),
    );
    expect(sweep.splash.every((entry) => entry.damage <= SWEEP_DAMAGE_V7)).toBe(
      true,
    );
  });

  it("names Boulders, Planted, Rockfall and Cold Blood from the preview flags", () => {
    expect(
      iceFolkCombatLinesV7(
        view,
        preview(view, AT.boulderYeti, AT.boulderTarget),
      ).notes,
    ).toEqual([PLANTED_PREVIEW_V7, BOULDERS_PREVIEW_V7]);
    expect(
      iceFolkCombatLinesV7(
        view,
        preview(view, AT.rockfallYeti, AT.rockfallTarget),
      ).notes,
    ).toEqual([ROCKFALL_PREVIEW_V7]);
    expect(
      iceFolkCombatLinesV7(view, preview(view, AT.hunter, AT.shatterTarget))
        .notes,
    ).toEqual([CHILLED_PREVIEW_V7, COLD_BLOOD_PREVIEW_V7]);
  });

  it("names Snow cover, the Blizzard's half damage and a hidden Blizzard", () => {
    const victim = humanView(iceFolkVictimFixtureV7());
    const shot = preview(
      victim,
      ICE_FOLK_VICTIM_V7.marksman,
      ICE_FOLK_VICTIM_V7.blizzardYeti,
    );
    expect(shot.blizzardHalved).toBe(true);
    expect(iceFolkCombatLinesV7(victim, shot).notes).toEqual([
      SNOW_COVER_PREVIEW_V7,
      BLIZZARD_PREVIEW_V7,
    ]);
    expect(
      iceFolkCombatLinesV7(victim, { ...shot, hiddenBlizzardPossible: true })
        .notes,
    ).toContain(HIDDEN_BLIZZARD_PREVIEW_V7);
  });

  it("says nothing for an exchange without an Ice Folk rule", () => {
    const martian = humanView(martianUiFixtureV7());
    expect(matchHasIceFolkSeatV7(martian)).toBe(false);
  });
});

describe("Bolas and Cold Snap previews (sections 13.1 and 13.2)", () => {
  const view = humanView(iceFolkUiFixtureV7());

  it("hints Frozen or Frosted and the units that could then shatter", () => {
    const sled = unitAt(view, AT.sled);
    const target = unitAt(view, AT.bolasTarget);
    const bolas = previewBolasV7(view, sled.id, target.id);
    if (bolas === null) throw new Error("no Bolas preview");
    expect(bolasPreviewLinesV7(view, bolas)).toEqual([
      WILL_BE_FROZEN_V7,
      ...(bolas.shatterSetups.length === 0
        ? []
        : [
            `${bolas.shatterSetups.map((id) => label(view.units.find((unit) => unit.id === id)?.role ?? "FIGHTER")).join(" and ")} can then shatter it`,
          ]),
    ]);
    expect(bolas.shatterSetups).toEqual([unitAt(view, AT.bolasPartner).id]);
  });

  it("summarises a Cold Snap from its preview", () => {
    const snap = previewColdSnapV7(view, unitAt(view, AT.witch).id);
    if (snap === null) throw new Error("no Cold Snap preview");
    // Ice Folk Freeze (`pulp_wars-w49.37`): every target is Frozen.
    expect(coldSnapSummaryV7(snap)).toBe(
      `Freezes ${snap.targets.length} unit${snap.targets.length === 1 ? "" : "s"}`,
    );
  });

  it("names why a Witch or a Frozen unit has no ability", () => {
    const lonely = humanView(
      iceFolkUiFieldV7([{ seat: 0, role: "CAPTAIN", at: { x: 5, y: 3 } }]),
    );
    expect(
      iceFolkAbilityUnavailableTextV7(
        lonely,
        unitAt(lonely, { x: 5, y: 3 }),
        "COLD_SNAP",
        false,
      ),
    ).toBe(COLD_SNAP_NO_TARGET_V7);
    const frozen = humanView(
      iceFolkUiFieldV7(
        [
          {
            seat: 0,
            role: "RAIDER",
            at: { x: 5, y: 3 },
            chill: "FROZEN",
            activation: { moved: true },
          },
          { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
        ],
        { factions: ["ICE_FOLK", "ICE_FOLK"] },
      ),
    );
    expect(
      iceFolkAbilityUnavailableTextV7(
        frozen,
        unitAt(frozen, { x: 5, y: 3 }),
        "THROW_BOLAS",
        false,
      ),
    ).toBe(FROZEN_IT_MOVED_V7);
    expect(BOLAS_RANGE_V7).toBeGreaterThan(1);
  });
});

describe("Ice Folk Help (section 13.3)", () => {
  it("states fifteen rules in the spec's sentences", () => {
    expect(ICE_FOLK_HELP_RULES_V7.map(([name]) => name)).toEqual([
      // Ice Folk Freeze (`pulp_wars-w49.37`): Frozen replaces Chill.
      "Frozen",
      "Shatter",
      "Brittle",
      "Snow",
      "Blizzard",
      "Cold Snap",
      "Bolas",
      "Cold Blood",
      "Sweep and Trample",
      "Mountain-born",
      "Rockfall",
      "Boulders",
      "Prowl",
      "Cold Aura",
      "Deep Winter",
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Musk Ox.
      "Frostbite",
    ]);
    const rule = (name: string): string =>
      ICE_FOLK_HELP_RULES_V7.find(([entry]) => entry === name)?.[1] ?? "";
    expect(rule("Shatter")).toBe(
      `an Ice Folk blow from an adjacent tile that leaves a Frozen unit at ${SHATTER_HP_V7} HP or less kills it, with no blow back, no Grave, and no explosion.`,
    );
    expect(rule("Mountain-born")).toBe(
      `${label("FIGHTER")}s, ${label("CATAPULT")}s, and ${label("JUGGERNAUT")}s cross Mountains without Engineering and without stopping.`,
    );
    expect(rule("Deep Winter")).toContain(
      `Ice Folk units recover ${DEEP_WINTER_RECOVER_V7} in their own territory`,
    );
    expect(DEEP_WINTER_RADIUS_V7).toBe(2);
    expect(rule("Sweep and Trample")).toContain(`deals ${SWEEP_DAMAGE_V7}`);
  });
});

describe("Ice Folk log lines (section 13.2)", () => {
  const apply = (
    state: GameStateV7,
    command: CommandV7,
  ): { readonly state: GameStateV7; readonly text: string | null } => {
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error(JSON.stringify(result.error));
    const events = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    ).events;
    return {
      state: result.state,
      text:
        iceFolkBoundaryNoticeV7(
          events,
          humanView(state),
          humanView(result.state),
        )?.text ?? null,
    };
  };
  const find = (
    view: PlayerViewV7,
    kind: CommandV7["kind"],
    from: CoordV7,
    target?: CoordV7,
  ): CommandV7 => {
    const unit = unitAt(view, from);
    const command = queryPlayerCommandsV7(view).find(
      (candidate) =>
        candidate.kind === kind &&
        "unitId" in candidate &&
        candidate.unitId === unit.id &&
        (target === undefined ||
          ("targetUnitId" in candidate &&
            candidate.targetUnitId === unitAt(view, target).id)),
    );
    if (command === undefined) throw new Error(`no ${kind}`);
    return command;
  };

  it("logs a Bolas, a Cold Snap, a Shatter and a Trample", () => {
    const state = iceFolkUiFixtureV7();
    const view = humanView(state);
    expect(
      apply(state, find(view, "THROW_BOLAS", AT.sled, AT.bolasTarget)).text,
    ).toBe(`Your ${label("RAIDER")} froze a Fighter`);
    const snap = previewColdSnapV7(view, unitAt(view, AT.witch).id);
    expect(apply(state, find(view, "COLD_SNAP", AT.witch)).text).toBe(
      `Your ${label("CAPTAIN")} froze ${snap?.targets.length ?? 0} units`,
    );
    expect(
      apply(state, find(view, "ATTACK", AT.yeti, AT.shatterTarget)).text,
    ).toBe(`Your ${label("FIGHTER")} shattered a Fighter`);
    expect(
      apply(state, find(view, "ATTACK", AT.mammoth, AT.sweepTarget)).text,
    ).toBe(`Your ${label("SWORDSMAN")} trampled Field Defense`);
  });

  it("logs nothing in a match without an Ice Folk seat", () => {
    const state = martianUiFixtureV7();
    expect(
      iceFolkBoundaryNoticeV7([], humanView(state), humanView(state)),
    ).toBe(null);
  });

  it("explains the missing Field Defense of a Yeti", () => {
    const state = iceFolkUiFieldV7([
      { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
    ]);
    const view = humanView(state);
    expect(
      iceFolkFieldDefenseBlockedV7(view, unitAt(view, { x: 7, y: 7 }).id),
    ).toBe(true);
  });
});
