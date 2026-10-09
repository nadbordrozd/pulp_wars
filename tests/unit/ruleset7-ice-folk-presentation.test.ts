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
  STAMPEDE_DAMAGE_V7,
  SWEEP_DAMAGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBolasV7,
  previewColdSnapV7,
  previewFrostBoltV7,
  previewStampedeV7,
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
  COLD_BLOOD_PREVIEW_V7,
  COLD_SNAP_NO_TARGET_V7,
  FROST_BOLT_NO_TARGET_V7,
  FROZEN_CANNOT_ACT_V7,
  FROZEN_LABEL_V7,
  FROZEN_NO_STRIKE_BACK_V7,
  STAMPEDE_MOVED_V7,
  STAMPEDE_NO_LINE_V7,
  STAYS_FROZEN_V7,
  HIDDEN_BLIZZARD_PREVIEW_V7,
  ICE_FOLK_HELP_RULES_V7,
  PLANTED_PREVIEW_V7,
  ROCKFALL_PREVIEW_V7,
  SNOW_COVER_PREVIEW_V7,
  TRAMPLE_PREVIEW_V7,
  WILL_BE_FROZEN_V7,
  bolasPreviewLinesV7,
  boulderThrowTextV7,
  coldSnapSummaryV7,
  frozenCannotActV7,
  frozenChipV7,
  frozenThawTextV7,
  frozenTurnsLeftV7,
  iceFolkAbilityDescriptionV7,
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
  coldAuraMoveTargetsV7,
  moveUsesGlacierV7,
  stampedeLabelV7,
  stampedePlanV7,
  stampedeSemanticV7,
} from "../../src/render/ice-folk-presentation-v7";
import {
  FROZEN_GLACIER_UI_V7,
  frozenGlacierUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import {
  ICE_FOLK_FREEZE_V7,
  ICE_FOLK_UI_V7,
  ICE_FOLK_VICTIM_V7,
  iceFolkFreezeFixtureV7,
  iceFolkUiFieldV7,
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Labels and numbers are read from the registry, the engine constants and
// the public previews, so a balance retune (pulp_wars-7g3.7) needs no
// change here.
const AT = ICE_FOLK_UI_V7;
const FREEZE = ICE_FOLK_FREEZE_V7;
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
    // Ice Folk Freeze (`pulp_wars-w49.38`): the Witch's Frost Bolt and the
    // Mammoth's Stampede.
    expect(iceFolkCommandLabelV7("FROST_BOLT")).toBe("Frost Bolt");
    expect(iceFolkCommandLabelV7("STAMPEDE")).toBe("Stampede");
    expect(iceFolkAbilityDescriptionV7("COLD_AURA", "ICE_FOLK")).toBe(
      "Freezes every hostile unit next to it when it ends its own Move.",
    );
    expect(iceFolkRewardLabelV7("MILITIA")).toEqual([
      "Militia",
      `A free ${label("FIGHTER")}`,
    ]);
    expect(iceFolkRewardLabelV7("JUGGERNAUT")?.[0]).toBe(label("JUGGERNAUT"));
    expect(iceFolkRoleUnlockTextV7("CAPTAIN")).toBe(
      `Train ${label("CAPTAIN")} (Blizzard, Cold Snap, Frost Bolt)`,
    );
    expect(iceFolkRoleUnlockTextV7("SWORDSMAN")).toBe(
      `Train ${label("SWORDSMAN")} (Sweep, Trample, Stampede)`,
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

describe("Frozen and the Shatter window (section 13.1)", () => {
  it("reads Frozen and its turns left from the view's frozen list", () => {
    const view = humanView(iceFolkUiFixtureV7());
    expect(frozenTurnsLeftV7(view, unitAt(view, AT.frozenEnemy).id)).toBe(1);
    expect(frozenTurnsLeftV7(view, unitAt(view, AT.shatterTarget).id)).toBe(1);
    expect(
      frozenTurnsLeftV7(view, unitAt(view, AT.unfrozenEnemy).id),
    ).toBeNull();
    expect(frozenTurnsLeftV7(view, unitAt(view, AT.sweepTarget).id)).toBeNull();
    const chip = frozenChipV7(view, unitAt(view, AT.frozenEnemy));
    expect(chip).toEqual({
      label: "Frozen · 1 turn",
      turnsLeft: 1,
      status:
        "Frozen: it cannot move or act and does not strike back; it thaws at the end of its next turn",
    });
    expect(frozenChipV7(view, unitAt(view, AT.unfrozenEnemy))).toBeNull();
  });

  it("says when a Frozen unit thaws, from its owner's turn", () => {
    const view = humanView(iceFolkFreezeFixtureV7());
    const own = unitAt(view, FREEZE.frozenOwn);
    // Frozen during its own turn: this turn and the next one.
    expect(frozenChipV7(view, own)).toMatchObject({
      label: "Frozen · 2 turns",
      turnsLeft: 2,
    });
    expect(frozenThawTextV7(view, own.ownerId, 2)).toBe(
      "thaws at the end of its next turn",
    );
    expect(frozenThawTextV7(view, own.ownerId, 1)).toBe(
      "thaws at the end of this turn",
    );
    const enemy = unitAt(view, FREEZE.frozenFighter);
    expect(frozenThawTextV7(view, enemy.ownerId, 1)).toBe(
      "thaws at the end of its next turn",
    );
    // Only an own Frozen unit on its owner's turn is told it cannot act.
    expect(frozenCannotActV7(view, own)).toBe(FROZEN_CANNOT_ACT_V7);
    expect(frozenCannotActV7(view, enemy)).toBeNull();
    expect(frozenCannotActV7(view, unitAt(view, FREEZE.yeti))).toBeNull();
  });

  it("uses the threshold of the hostile Ice Folk seat, Brittle included", () => {
    // The fixture researches every technology: Brittle sets the threshold.
    const own = humanView(iceFolkUiFixtureV7());
    const frozen = unitAt(own, AT.shatterTarget);
    expect(shatterThresholdAgainstV7(own, frozen.ownerId)).toBe(
      BRITTLE_SHATTER_HP_V7,
    );
    expect(shatterWindowV7(own, frozen)).toBe(BRITTLE_SHATTER_HP_V7);
    // A unit that is not Frozen has no window; an own unit has no hostile
    // Ice Folk.
    expect(shatterWindowV7(own, unitAt(own, AT.unfrozenEnemy))).toBeNull();
    expect(shatterThresholdAgainstV7(own, own.viewer.id)).toBeNull();
    // Without Brittle the base threshold applies; the other side reads it
    // from the public stats of the Ice Folk units it can see.
    const plain = humanView(
      iceFolkUiFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 }, frozen: 1 },
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
    expect(ids(AT.frozenEnemy)).toEqual(["frozen"]);
    expect(ids(AT.sweepTarget)).toEqual([]);
    const frozenLine = iceFolkUnitInfoLinesV7(
      view,
      unitAt(view, AT.frozenEnemy),
      statsAt(view, AT.frozenEnemy),
    )[0];
    expect(frozenLine?.description).toBe(
      `Frozen: it cannot move or act and does not strike back; it thaws at the end of its next turn. An Ice Folk blow from the next tile that leaves it at ${BRITTLE_SHATTER_HP_V7} HP or less shatters it.`,
    );
  });
});

describe("Ice Folk attack previews (section 13.1)", () => {
  const view = humanView(iceFolkUiFixtureV7());

  it("says Shatters when the preview shatters (the kill needs no Frozen note)", () => {
    const shatter = preview(view, AT.yeti, AT.shatterTarget);
    expect(shatter.shatters).toBe(true);
    const lines = iceFolkCombatLinesV7(view, shatter);
    expect(lines.shatters).toBe(true);
    expect(lines.notes).not.toContain(FROZEN_NO_STRIKE_BACK_V7);
    expect(lines.notes).not.toContain(FROZEN_LABEL_V7);
  });

  it("says a Frozen defender won't strike back", () => {
    const freeze = humanView(iceFolkFreezeFixtureV7());
    const attack = preview(freeze, FREEZE.yeti, FREEZE.frozenFighter);
    expect(attack.noRetaliationReason).toBe("FROZEN");
    expect(attack.damageToAttacker).toBe(0);
    expect(iceFolkCombatLinesV7(freeze, attack).notes).toEqual([
      FROZEN_NO_STRIKE_BACK_V7,
    ]);
    // The same attack on a unit that is not Frozen has no such note.
    const plain = preview(freeze, FREEZE.yeti, FREEZE.giantPreyB);
    expect(iceFolkCombatLinesV7(freeze, plain).notes).not.toContain(
      FROZEN_NO_STRIKE_BACK_V7,
    );
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
    // A shot from two tiles: the Frozen Fighter could not strike back
    // anyway, and survives, so the note is "Frozen".
    const coldBlood = preview(view, AT.hunter, AT.shatterTarget);
    expect(coldBlood.defenderDies).toBe(false);
    expect(iceFolkCombatLinesV7(view, coldBlood).notes).toEqual([
      coldBlood.noRetaliationReason === "FROZEN"
        ? FROZEN_NO_STRIKE_BACK_V7
        : FROZEN_LABEL_V7,
      COLD_BLOOD_PREVIEW_V7,
    ]);
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

  it("hints Will be Frozen and the units that could then shatter", () => {
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
            frozen: 1,
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
    ).toBe(FROZEN_CANNOT_ACT_V7);
    expect(BOLAS_RANGE_V7).toBeGreaterThan(1);
    // Ice Folk Freeze (`pulp_wars-w49.38`): a Witch with nobody in reach of
    // her Frost Bolt, and a Mammoth that moved or has no open line.
    expect(
      iceFolkAbilityUnavailableTextV7(
        lonely,
        unitAt(lonely, { x: 5, y: 3 }),
        "FROST_BOLT",
        false,
      ),
    ).toBe(FROST_BOLT_NO_TARGET_V7);
    const mammoths = humanView(
      iceFolkUiFieldV7([
        { seat: 0, role: "SWORDSMAN", at: { x: 5, y: 3 } },
        {
          seat: 0,
          role: "SWORDSMAN",
          at: { x: 3, y: 3 },
          activation: { moved: true },
        },
      ]),
    );
    expect(
      iceFolkAbilityUnavailableTextV7(
        mammoths,
        unitAt(mammoths, { x: 3, y: 3 }),
        "STAMPEDE",
        false,
      ),
    ).toBe(STAMPEDE_MOVED_V7);
    expect(
      iceFolkAbilityUnavailableTextV7(
        mammoths,
        unitAt(mammoths, { x: 5, y: 3 }),
        "STAMPEDE",
        false,
      ),
    ).toBe(STAMPEDE_NO_LINE_V7);
    expect(
      iceFolkAbilityUnavailableTextV7(
        mammoths,
        unitAt(mammoths, { x: 5, y: 3 }),
        "STAMPEDE",
        true,
      ),
    ).toBeNull();
  });
});

describe("Ice Folk Freeze previews (bead pulp_wars-w49.38)", () => {
  const state = iceFolkFreezeFixtureV7();
  const view = humanView(state);
  const witch = unitAt(view, FREEZE.witch);
  const mammoth = unitAt(view, FREEZE.mammoth);

  it("hints Stays Frozen for a Frost Bolt on a unit that is Frozen already", () => {
    const fresh = previewFrostBoltV7(
      view,
      witch.id,
      unitAt(view, FREEZE.boltTarget).id,
    );
    const again = previewFrostBoltV7(
      view,
      witch.id,
      unitAt(view, FREEZE.boltFrozen).id,
    );
    if (fresh === null || again === null) throw new Error("no Frost Bolt");
    expect(bolasPreviewLinesV7(view, fresh)[0]).toBe(WILL_BE_FROZEN_V7);
    expect(bolasPreviewLinesV7(view, again)[0]).toBe(STAYS_FROZEN_V7);
  });

  it("walks a Stampede: the hits, the shove, the kill and the end", () => {
    const plan = stampedePlanV7(view, mammoth.id, FREEZE.stampedeWest);
    if (plan === null) throw new Error("no Stampede plan");
    expect(plan.path).toEqual([
      FREEZE.stampedeShoved,
      FREEZE.stampedeKilled,
      FREEZE.stampedeWest,
    ]);
    expect(plan.end).toEqual(FREEZE.stampedeWest);
    expect(plan.stopped).toBe(false);
    expect(plan.hits.map((hit) => [hit.at, hit.dies, hit.shovedTo])).toEqual([
      [FREEZE.stampedeShoved, false, FREEZE.stampedeShovedTo],
      [FREEZE.stampedeKilled, true, null],
    ]);
    // The hits are the engine's public preview.
    const hits = previewStampedeV7(view, mammoth.id, FREEZE.stampedeWest);
    expect(plan.hits.map((hit) => hit.damage)).toEqual(
      hits?.hits.map((hit) => hit.damage + hit.shieldDamage),
    );
    expect(plan.hits[0]?.damage).toBe(STAMPEDE_DAMAGE_V7);
    expect(stampedeLabelV7(plan)).toBe("Stampede · hits 2");
    expect(stampedeSemanticV7(plan)).toBe(
      "Stampede: charges 3 tiles. Fighter takes 3 and is shoved aside. Raider takes 2 and dies. No strike-back.",
    );
  });

  it("stops a Stampede before a unit it cannot shove", () => {
    const plan = stampedePlanV7(view, mammoth.id, FREEZE.stampedeSouth);
    if (plan === null) throw new Error("no Stampede plan");
    expect(plan.line).toHaveLength(3);
    expect(plan.path).toEqual([{ x: 10, y: 4 }]);
    expect(plan.end).toEqual({ x: 10, y: 4 });
    expect(plan.stopped).toBe(true);
    expect(plan.hits).toEqual([
      expect.objectContaining({
        at: FREEZE.stampedeBlocker,
        dies: false,
        shovedTo: null,
        blocks: true,
      }),
    ]);
    // The plan matches the engine's resolution.
    const command = queryPlayerCommandsV7(view).find(
      (candidate) =>
        candidate.kind === "STAMPEDE" &&
        candidate.at.x === FREEZE.stampedeSouth.x &&
        candidate.at.y === FREEZE.stampedeSouth.y,
    );
    if (command === undefined) throw new Error("no Stampede");
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error("rejected");
    const event = result.events.find(
      (candidate) => candidate.kind === "MAMMOTH_STAMPEDED",
    );
    expect(event?.kind === "MAMMOTH_STAMPEDED" ? event.to : null).toEqual(
      plan.end,
    );
    expect(stampedePlanV7(view, mammoth.id, { x: 0, y: 0 })).toBeNull();
  });

  it("names the enemies a Frost Giant's Move would freeze", () => {
    const giant = unitAt(view, FREEZE.giant);
    const moves = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" && command.unitId === giant.id,
    );
    const to = (at: CoordV7) => {
      const move = moves.find(
        (command) =>
          command.path.at(-1)?.x === at.x && command.path.at(-1)?.y === at.y,
      );
      if (move === undefined) throw new Error("no Move");
      return coldAuraMoveTargetsV7(view, move).map((unit) => unit.at);
    };
    expect(to(FREEZE.giantTo)).toEqual([FREEZE.giantPreyA, FREEZE.giantPreyB]);
    expect(to({ x: 1, y: 2 })).toEqual([]);
    // Another unit's Move freezes nobody.
    const yeti = unitAt(view, FREEZE.yeti);
    const yetiMove = queryPlayerCommandsV7(view).find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" && command.unitId === yeti.id,
    );
    if (yetiMove === undefined) throw new Error("no Yeti Move");
    expect(coldAuraMoveTargetsV7(view, yetiMove)).toEqual([]);
  });

  it("marks only the ice tile Glacier's +1 Move reaches", () => {
    const glacier = humanView(frozenGlacierUiFixtureV7());
    const walker = unitAt(glacier, FROZEN_GLACIER_UI_V7.walker);
    const marked = queryPlayerCommandsV7(glacier).flatMap((command) =>
      command.kind === "MOVE" &&
      command.unitId === walker.id &&
      moveUsesGlacierV7(glacier, command)
        ? [command.path.at(-1)]
        : [],
    );
    expect(marked).toEqual([FROZEN_GLACIER_UI_V7.glacierTile]);
    // Without Glacier the tile is not offered at all.
    const plain = humanView(
      frozenArenaV7({
        technologies: [["SHORECRAFT"], ["SHORECRAFT"]],
        units: [{ seat: 0, role: "KNIGHT", at: FROZEN_GLACIER_UI_V7.walker }],
        ice: FROZEN_GLACIER_UI_V7.ice.map((at) => ({ at })),
      }),
    );
    expect(
      queryPlayerCommandsV7(plain).some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.at(-1)?.x === FROZEN_GLACIER_UI_V7.glacierTile.x &&
          command.path.at(-1)?.y === FROZEN_GLACIER_UI_V7.glacierTile.y,
      ),
    ).toBe(false);
  });
});

describe("Ice Folk Help (section 13.3)", () => {
  it("states the rules in the spec's sentences, with no Chill left", () => {
    expect(ICE_FOLK_HELP_RULES_V7.map(([name]) => name)).toEqual([
      // Ice Folk Freeze (`pulp_wars-w49.37`): Frozen replaces Chill.
      "Frozen",
      "Shatter",
      "Brittle",
      "Snow",
      "Blizzard",
      "Cold Snap",
      "Frost Bolt",
      "Bolas",
      "Cold Blood",
      "Sweep and Trample",
      "Mountain-born",
      "Rockfall",
      "Boulders",
      "Prowl",
      "Cold Aura",
      "Stampede",
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
    expect(rule("Frozen")).toContain("It can be frozen again at once.");
    expect(rule("Stampede")).toContain(`takes ${STAMPEDE_DAMAGE_V7}`);
    expect(rule("Frostbite")).toContain("is Frozen");
    for (const [name, text] of ICE_FOLK_HELP_RULES_V7)
      expect(`${name} ${text}`).not.toMatch(/chill|frosted|thaw-immune/i);
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
      `Your ${label("CAPTAIN")}'s Cold Snap froze ${snap?.targets.length ?? 0} units`,
    );
    expect(
      apply(state, find(view, "ATTACK", AT.yeti, AT.shatterTarget)).text,
    ).toBe(`Your ${label("FIGHTER")} shattered a Fighter`);
    expect(
      apply(state, find(view, "ATTACK", AT.mammoth, AT.sweepTarget)).text,
    ).toBe(`Your ${label("SWORDSMAN")} trampled Field Defense`);
  });

  it("logs a Frost Bolt, a Cold Aura and a Stampede (Ice Folk Freeze)", () => {
    const state = iceFolkFreezeFixtureV7();
    const view = humanView(state);
    expect(
      apply(state, find(view, "FROST_BOLT", FREEZE.witch, FREEZE.boltTarget))
        .text,
    ).toBe(`Your ${label("CAPTAIN")}'s Frost Bolt froze a Marksman`);
    const giant = unitAt(view, FREEZE.giant);
    const move = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === giant.id &&
        command.path.at(-1)?.x === FREEZE.giantTo.x &&
        command.path.at(-1)?.y === FREEZE.giantTo.y,
    );
    if (move === undefined) throw new Error("no Giant Move");
    expect(apply(state, move).text).toBe(
      `Your ${label("JUGGERNAUT")} froze 2 units`,
    );
    const mammoth = unitAt(view, FREEZE.mammoth);
    const charge = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "STAMPEDE" &&
        command.unitId === mammoth.id &&
        command.at.x === FREEZE.stampedeWest.x &&
        command.at.y === FREEZE.stampedeWest.y,
    );
    if (charge === undefined) throw new Error("no Stampede");
    expect(apply(state, charge).text).toBe(
      `Your ${label("SWORDSMAN")} stampeded: 2 units hit, 1 killed`,
    );
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
