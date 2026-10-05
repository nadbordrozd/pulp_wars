import { describe, expect, it } from "vitest";
import {
  PEPPERMINT_DAMAGE_V7,
  SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  rebakeHpV7,
  rebakePriceV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BOUNCES_PREVIEW_V7,
  BOUNCE_BLOCKED_PREVIEW_V7,
  CANDY_FIELD_DEFENSE_EXPLANATION_V7,
  CANDY_HELP_RULES_V7,
  CRASHED_NEXT_STATUS_V7,
  CRASHED_NOW_STATUS_V7,
  HOME_SWEET_HOME_STATUS_V7,
  REBAKE_NO_COINS_V7,
  REBAKE_NO_CRUMBS_V7,
  REBAKE_NO_HOME_V7,
  RUSHED_ESCAPE_STATUS_V7,
  RUSHED_STATUS_V7,
  RUSH_PREVIEW_V7,
  SPLATTED_PREVIEW_V7,
  SPLATTED_STATUS_V7,
  SPLAT_PREVIEW_V7,
  SUGAR_FRENZY_STATUS_V7,
  SUGAR_RUSH_CRASHED_V7,
  SUGAR_RUSH_MOVED_V7,
  SUGAR_RUSH_RUSHED_V7,
  SUGAR_RUSH_TOOLTIP_V7,
  SUGAR_TOSS_NO_TARGET_V7,
  SUGAR_TOSS_TOOLTIP_V7,
  candyAbilityDescriptionV7,
  candyAbilityNameV7,
  candyBoundaryNoticeV7,
  candyChipsV7,
  candyCombatLinesV7,
  candyCommandNameV7,
  candyFieldDefenseBlockedV7,
  candyRecruitNotesV7,
  candyRoleUnlockTextV7,
  candyUnitInfoLinesV7,
  crumbsTileLinesV7,
  eatsCrumbsTextV7,
  matchHasCandySeatV7,
  rebakeBoardLabelV7,
  rebakeTargetNameV7,
  rebakeUnavailableTextV7,
  sugarFrenzyPipsV7,
  sugarRushUnavailableTextV7,
  sugarTossTargetNameV7,
  sugarTossUnavailableTextV7,
} from "../../src/render/candy-presentation-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import {
  CANDY_UI_V7,
  CANDY_VICTIM_V7,
  candyUiFieldV7,
  candyUiFixtureV7,
  candyVictimFixtureV7,
} from "../fixtures/v7-candy-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Bead pulp_wars-jdb.6: the Candy presentation reads only the public view,
// the public previews and projected events. The sentences are the spec's
// (docs/product/RULESET_7_CANDY.md section 15.2 and 15.3); their numbers
// come from the registry and the engine constants.
const AT = CANDY_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "CANDY").label;

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("unit missing");
  return unit;
}

function offered(
  view: PlayerViewV7,
  unitId: number,
  kind: CommandV7["kind"],
): boolean {
  return queryPlayerCommandsV7(view).some(
    (command) =>
      command.kind === kind && "unitId" in command && command.unitId === unitId,
  );
}

describe("Candy text (section 15.2)", () => {
  it("writes the spec's sentences with the contract numbers", () => {
    expect(SUGAR_RUSH_TOOLTIP_V7).toBe(
      "+1 Move and +1 Attack on its first attack this turn. Next turn it Crashes and can't act",
    );
    expect(RUSHED_STATUS_V7).toBe(
      "Rushed: +1 Move, +1 Attack on its first attack",
    );
    expect(SUGAR_FRENZY_STATUS_V7).toBe(
      "Sugar Frenzy: attacks again after a kill, twice at most",
    );
    expect(SUGAR_TOSS_TOOLTIP_V7).toBe(
      "Heal an own unit within 2 tiles by 2. Each unit once a turn",
    );
    expect(SUGAR_TOSS_NO_TARGET_V7).toBe("No wounded unit within 2 tiles");
    expect(RUSH_PREVIEW_V7).toBe("Sugar Rush +1");
    expect(SPLAT_PREVIEW_V7).toBe("Splat: no strike-back this turn");
    expect(CANDY_FIELD_DEFENSE_EXPLANATION_V7).toBe(
      "Candy can't build Field Defense",
    );
    expect(eatsCrumbsTextV7(0)).toBe("Eats Crumbs");
    expect(eatsCrumbsTextV7(3)).toBe("Eats Crumbs: −3");
    expect(rebakeTargetNameV7("KNIGHT", 5, 7)).toBe(
      `Re-bake ${label("KNIGHT")}: 5 Coins, 7 HP`,
    );
    expect(rebakeTargetNameV7("FIGHTER", 1, 5)).toBe(
      `Re-bake ${label("FIGHTER")}: 1 Coin, 5 HP`,
    );
    expect(rebakeBoardLabelV7(5, 7)).toBe("5 Coins · 7 HP");
    expect(sugarTossTargetNameV7("Toffee Trooper", 2)).toBe(
      "Toss to Toffee Trooper: +2",
    );
  });

  it("names no tile in any Candy text", () => {
    const texts = [
      ...CANDY_HELP_RULES_V7.flat(),
      SUGAR_RUSH_TOOLTIP_V7,
      SUGAR_TOSS_TOOLTIP_V7,
      rebakeTargetNameV7("KNIGHT", 5, 7),
      ...crumbsTileLinesV7(viewOf(candyUiFixtureV7()), AT.crumbsBear),
    ];
    for (const text of texts) expect(text).not.toMatch(/\(\d+, ?\d+\)|\d+,\d+/);
  });

  it("gives Help the twelve rules, the Peppermint damage from the engine", () => {
    expect(CANDY_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Sugar Rush",
      "Crashed",
      "Crumbs",
      "Re-bake",
      "Splat",
      "Bounce",
      "Sugar Toss",
      "Frosting",
      "Sugar Frenzy",
      label("RAIDER"),
      "Home Sweet Home",
      "Peppermint Surprise",
    ]);
    const rule = (name: string): string =>
      CANDY_HELP_RULES_V7.find(([candidate]) => candidate === name)?.[1] ?? "";
    expect(rule("Peppermint Surprise")).toBe(
      `an enemy that eats your Crumbs takes ${PEPPERMINT_DAMAGE_V7} damage.`,
    );
    expect(rule("Sugar Frenzy")).toBe(
      `a Rushed ${label("KNIGHT")} attacks again after a kill, up to three attacks in a turn.`,
    );
    expect(rule("Bounce")).toBe(
      `a melee attacker that hits a ${label("GUARD")} or a ${label("JUGGERNAUT")} and survives is bounced one tile back.`,
    );
  });

  it("names the Candy abilities and leaves the other factions alone", () => {
    expect(candyAbilityNameV7("TEND_WOUNDED", "CANDY")).toBe("Frosting");
    expect(candyAbilityNameV7("TEND_WOUNDED", "ORIGINAL")).toBeNull();
    expect(roleAbilityNameV7("TEND_WOUNDED", "CANDY")).toBe("Frosting");
    expect(roleAbilityNameV7("TEND_WOUNDED", "ORIGINAL")).toBe("Tend");
    expect(roleAbilityNameV7("REBAKE", "CANDY")).toBe("Re-bake");
    expect(roleAbilityNameV7("BOUNCE", "CANDY")).toBe("Bouncy");
    for (const ability of [
      "SUGAR_RUSH",
      "BOUNCE",
      "SPLAT",
      "REBAKE",
      "SUGAR_TOSS",
      "TEND_WOUNDED",
    ]) {
      expect(candyAbilityDescriptionV7(ability, "CANDY")).not.toBeNull();
      expect(candyAbilityDescriptionV7(ability, "DWARF")).toBeNull();
    }
    expect(candyCommandNameV7("TEND_WOUNDED", "CANDY")).toBe("Frosting");
    expect(candyCommandNameV7("TEND_WOUNDED", "UNDEAD")).toBeNull();
    expect(candyCommandNameV7("SUGAR_RUSH", "CANDY")).toBe("Sugar Rush");
  });

  it("writes the technology unlock text of each Candy role", () => {
    expect(candyRoleUnlockTextV7("CAPTAIN")).toBe(
      `Train ${label("CAPTAIN")} (Frosting, Re-bake)`,
    );
    expect(candyRoleUnlockTextV7("MARKSMAN")).toBe(
      `Train ${label("MARKSMAN")} (Sugar Toss)`,
    );
    expect(candyRoleUnlockTextV7("CATAPULT")).toBe(
      `Train ${label("CATAPULT")} (Splat)`,
    );
    expect(candyRoleUnlockTextV7("GUARD")).toBe(
      `Train ${label("GUARD")} (Bounce)`,
    );
    expect(candyRoleUnlockTextV7("KNIGHT")).toBe(
      `Train ${label("KNIGHT")} (Sugar Frenzy while Rushed)`,
    );
    expect(candyRoleUnlockTextV7("RAIDER")).toBe(`Train ${label("RAIDER")}`);
    expect(candyRecruitNotesV7("FIGHTER", "CANDY")).toEqual([
      `Leaves Crumbs: Re-bake for ${rebakePriceV7("FIGHTER")} Coin.`,
      "Candy can't build Field Defense.",
    ]);
    expect(candyRecruitNotesV7("FIGHTER", "ORIGINAL")).toEqual([]);
  });
});

describe("Candy unit status (section 15.2)", () => {
  const view = viewOf(candyUiFixtureV7());

  it("knows a match with a Candy seat", () => {
    expect(matchHasCandySeatV7(view)).toBe(true);
    expect(matchHasCandySeatV7(viewOf(martianUiFixtureV7()))).toBe(false);
  });

  it("gives a Rushed Donut Racer at home its perk and Home Sweet Home", () => {
    expect(candyChipsV7(view, unitAt(view, AT.rushedDonut))).toEqual([
      {
        id: "rushed",
        label: "Rushed",
        status: RUSHED_ESCAPE_STATUS_V7,
        icon: "ICON:STATUS:RUSHED",
      },
      {
        id: "home-sweet-home",
        label: "Home Sweet Home",
        status: HOME_SWEET_HOME_STATUS_V7,
        icon: "ICON:TECH:CANDY:FORTIFICATION",
      },
    ]);
  });

  it("shows a Rushed Chocolate Bunny's Sugar Frenzy as pips, not a number", () => {
    const bear = unitAt(view, AT.rushedBear);
    const [chip] = candyChipsV7(view, bear);
    expect(chip).toEqual({
      id: "rushed",
      label: "Sugar Frenzy",
      status: SUGAR_FRENZY_STATUS_V7,
      icon: "ICON:STATUS:RUSHED",
      pips: {
        left: SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
        of: SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
      },
    });
    expect(chip?.label).not.toMatch(/\d/);
    // Each continuation it makes spends a pip.
    const stats = {
      rushed: true,
      candy: { rushPerk: "SUGAR_FRENZY" },
    } as const;
    const pipsAfter = (attacksUsed: number): number | undefined =>
      sugarFrenzyPipsV7(
        { form: "LAND", activation: { ...bear.activation, attacksUsed } },
        stats as never,
      )?.left;
    expect([0, 1, 2, 3].map(pipsAfter)).toEqual([2, 2, 1, 0]);
    // A unit that is not a Rushed Chocolate Bunny has none.
    expect(
      sugarFrenzyPipsV7(unitAt(view, AT.rushedDonut), {
        rushed: true,
        candy: { rushPerk: "ESCAPE" } as never,
      }),
    ).toBeNull();
  });

  it("says when a Crashed unit can't act, by whose turn it is", () => {
    expect(candyChipsV7(view, unitAt(view, AT.crashed))[0]?.status).toBe(
      CRASHED_NOW_STATUS_V7,
    );
    const other = viewOf(candyVictimFixtureV7());
    expect(
      candyChipsV7(other, unitAt(other, CANDY_VICTIM_V7.crashedEnemy))[0]
        ?.status,
    ).toBe(CRASHED_NEXT_STATUS_V7);
    // An enemy's Rushed unit has no Home Sweet Home chip (owner's view only).
    expect(
      candyChipsV7(other, unitAt(other, CANDY_VICTIM_V7.rushedEnemy)).map(
        (chip) => chip.id,
      ),
    ).toEqual(["rushed"]);
    expect(
      candyChipsV7(other, unitAt(other, CANDY_VICTIM_V7.rushedEnemy))[0]
        ?.status,
    ).toBe(RUSHED_STATUS_V7);
  });

  it("marks a Splatted unit of any owner", () => {
    expect(candyChipsV7(view, unitAt(view, AT.splatted))).toEqual([
      {
        id: "splatted",
        label: "Splatted",
        status: SPLATTED_STATUS_V7,
        icon: "ICON:STATUS:SPLATTED",
      },
    ]);
    expect(candyChipsV7(view, unitAt(view, AT.gumdrop))).toEqual([]);
  });

  it("lists a Candy unit's Crumbs in its unit information", () => {
    const lines = candyUnitInfoLinesV7(view, unitAt(view, AT.gumdrop));
    expect(lines.map((line) => line.id)).toEqual(["crumbs"]);
    expect(lines[0]?.description).toContain(
      `${rebakePriceV7("FIGHTER")} Coin at ${rebakeHpV7("FIGHTER")} HP`,
    );
    expect(lines[0]?.description).toContain(
      `An enemy that eats them takes ${PEPPERMINT_DAMAGE_V7}.`,
    );
    expect(
      candyUnitInfoLinesV7(view, unitAt(view, AT.crashed)).map(
        (line) => line.id,
      ),
    ).toEqual(["crashed", "crumbs"]);
    // A Human unit has only its statuses.
    expect(
      candyUnitInfoLinesV7(view, unitAt(view, AT.splatted)).map(
        (line) => line.id,
      ),
    ).toEqual(["splatted"]);
  });

  it("names the Crumbs of a tile, their turns and their bite", () => {
    expect(crumbsTileLinesV7(view, AT.crumbsBear)).toEqual([
      `${label("KNIGHT")} Crumbs: 3 turns left`,
      `Peppermint Surprise: an enemy that eats them takes ${PEPPERMINT_DAMAGE_V7}`,
    ]);
    expect(crumbsTileLinesV7(view, AT.crumbsGumdrop)[0]).toBe(
      `${label("FIGHTER")} Crumbs: 1 turn left`,
    );
    expect(crumbsTileLinesV7(view, AT.gumdrop)).toEqual([]);
    // Without Peppermint Surprise the Crumbs do not bite.
    const plain = viewOf(
      candyUiFixtureV7({
        techs: {
          0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
        },
      }),
    );
    expect(crumbsTileLinesV7(plain, AT.crumbsBear)).toEqual([
      `${label("KNIGHT")} Crumbs: 3 turns left`,
    ]);
  });
});

describe("Candy unavailable reasons (section 15.2)", () => {
  const view = viewOf(candyUiFixtureV7());

  it("says why a unit cannot Rush, from the engine's own test", () => {
    const reason = (at: CoordV7): string | null => {
      const unit = unitAt(view, at);
      return sugarRushUnavailableTextV7(
        view,
        unit,
        offered(view, unit.id, "SUGAR_RUSH"),
      );
    };
    expect(reason(AT.gumdrop)).toBeNull();
    expect(offered(view, unitAt(view, AT.gumdrop).id, "SUGAR_RUSH")).toBe(true);
    expect(reason(AT.movedGumdrop)).toBe(SUGAR_RUSH_MOVED_V7);
    expect(reason(AT.crashed)).toBe(SUGAR_RUSH_CRASHED_V7);
    expect(reason(AT.rushedBear)).toBe(SUGAR_RUSH_RUSHED_V7);
    // An enemy's unit has no reason: it is not the viewer's button.
    expect(reason(AT.rushTarget)).toBeNull();
  });

  it("says why a Confectioner cannot Re-bake", () => {
    const city = (): string => "your Capital";
    const reason = (state: GameStateV7): string | null => {
      const candidate = viewOf(state);
      const unit = unitAt(candidate, AT.confectioner);
      return rebakeUnavailableTextV7(
        candidate,
        unit,
        offered(candidate, unit.id, "REBAKE"),
        city,
      );
    };
    expect(reason(candyUiFixtureV7())).toBeNull();
    expect(reason(candyUiFixtureV7({ coins: 0 }))).toBe(REBAKE_NO_COINS_V7);
    const pieces = [{ seat: 0, role: "CAPTAIN", at: AT.confectioner }] as const;
    expect(reason(candyUiFieldV7(pieces, { homed: [AT.confectioner] }))).toBe(
      REBAKE_NO_CRUMBS_V7,
    );
    expect(
      reason(
        candyUiFieldV7(pieces, {
          crumbs: [{ at: AT.crumbsBear, role: "KNIGHT", seat: 0 }],
        }),
      ),
    ).toBe(REBAKE_NO_HOME_V7);
    expect(
      reason(
        candyUiFieldV7([{ ...pieces[0], rush: "CRASHED" }], {
          homed: [AT.confectioner],
          crumbs: [{ at: AT.crumbsBear, role: "KNIGHT", seat: 0 }],
        }),
      ),
    ).toBe(SUGAR_RUSH_CRASHED_V7);
  });

  it("says why a Gunner cannot toss", () => {
    const reason = (at: CoordV7): string | null => {
      const unit = unitAt(view, at);
      return sugarTossUnavailableTextV7(
        view,
        unit,
        offered(view, unit.id, "SUGAR_TOSS"),
      );
    };
    expect(reason(AT.gunner)).toBeNull();
    expect(reason(AT.crashedGunner)).toBe(SUGAR_RUSH_CRASHED_V7);
    const lonely = viewOf(
      candyUiFieldV7([{ seat: 0, role: "MARKSMAN", at: AT.gunner }]),
    );
    const gunner = unitAt(lonely, AT.gunner);
    expect(sugarTossUnavailableTextV7(lonely, gunner, false)).toBe(
      SUGAR_TOSS_NO_TARGET_V7,
    );
  });

  it("explains the missing Field Defense to a Candy viewer only", () => {
    const home = viewOf(
      candyUiFieldV7([{ seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } }]),
    );
    expect(
      candyFieldDefenseBlockedV7(home, unitAt(home, { x: 7, y: 8 }).id),
    ).toBe(true);
    const human = viewOf(candyVictimFixtureV7());
    expect(
      candyFieldDefenseBlockedV7(
        human,
        unitAt(human, CANDY_VICTIM_V7.fighter).id,
      ),
    ).toBe(false);
  });
});

describe("Candy attack previews (section 15.1)", () => {
  it("reads the Rush bonus, Splat and the Splatted target from the preview", () => {
    const view = viewOf(candyUiFixtureV7());
    const preview = (from: CoordV7, to: CoordV7, rush = false) => {
      const result = queryCombatPreviewV7(
        view,
        unitAt(view, from).id,
        unitAt(view, to).id,
        rush ? { assumeSugarRush: true } : {},
      );
      if (result === null) throw new Error("no preview");
      return candyCombatLinesV7(result);
    };
    expect(preview(AT.gumdrop, AT.rushTarget).notes).toEqual([]);
    expect(preview(AT.gumdrop, AT.rushTarget, true).notes).toEqual([
      RUSH_PREVIEW_V7,
    ]);
    expect(preview(AT.pieLauncher, AT.splatted).notes).toContain(
      SPLAT_PREVIEW_V7,
    );
    expect(preview(AT.splatAttacker, AT.splatted).notes).toEqual([
      SPLATTED_PREVIEW_V7,
    ]);
  });

  it("reads the Bounce and the blocked Bounce from the preview", () => {
    const view = viewOf(candyVictimFixtureV7());
    const at = CANDY_VICTIM_V7;
    const lines = (from: CoordV7, to: CoordV7) => {
      const result = queryCombatPreviewV7(
        view,
        unitAt(view, from).id,
        unitAt(view, to).id,
      );
      if (result === null) throw new Error("no preview");
      return candyCombatLinesV7(result);
    };
    const bounce = lines(at.fighter, at.marshmallow);
    expect(bounce.notes).toEqual([BOUNCES_PREVIEW_V7]);
    expect(bounce.bounce).toEqual({
      to: { x: at.fighter.x - 1, y: at.fighter.y },
      blocked: false,
    });
    const blocked = lines(at.knight, at.golem);
    expect(blocked.notes).toContain(BOUNCE_BLOCKED_PREVIEW_V7);
    expect(blocked.bounce).toEqual({ to: null, blocked: true });
  });
});

describe("Candy log lines (section 15.2)", () => {
  function play(
    state: GameStateV7,
    command: CommandV7,
  ): { readonly state: GameStateV7; readonly text: string | null } {
    const before = viewOf(state);
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error(result.error.code);
    const events = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    return {
      state: result.state,
      text:
        candyBoundaryNoticeV7(events.events, before, viewOf(result.state))
          ?.text ?? null,
    };
  }

  it("logs a Rush, a Re-bake and a Sugar Toss without naming a tile", () => {
    const state = candyUiFixtureV7();
    const view = viewOf(state);
    const rushed = play(state, {
      kind: "SUGAR_RUSH",
      unitId: unitAt(view, AT.gumdrop).id,
    });
    expect(rushed.text).toBe(`Your ${label("FIGHTER")} went on a Sugar Rush`);
    const baked = play(state, {
      kind: "REBAKE",
      unitId: unitAt(view, AT.confectioner).id,
      at: AT.crumbsBear,
    });
    expect(baked.text).toBe(
      `Your ${label("CAPTAIN")} re-baked a ${label("KNIGHT")}`,
    );
    const tossed = play(state, {
      kind: "SUGAR_TOSS",
      unitId: unitAt(view, AT.gunner).id,
      targetUnitId: unitAt(view, AT.tossNear).id,
    });
    expect(tossed.text).toBe(
      `Your ${label("MARKSMAN")} tossed sugar to a ${label("FIGHTER")} (+2)`,
    );
  });

  it("logs a Splat, a Bounce and eaten Crumbs with the Peppermint damage", () => {
    const state = candyUiFixtureV7();
    const view = viewOf(state);
    const splat = play(state, {
      kind: "ATTACK",
      unitId: unitAt(view, AT.pieLauncher).id,
      targetUnitId: unitAt(view, AT.pieTarget).id,
    });
    expect(splat.text).toBe("Fighter was Splatted");
    const victim = candyVictimFixtureV7();
    const other = viewOf(victim);
    const at = CANDY_VICTIM_V7;
    const bounced = play(victim, {
      kind: "ATTACK",
      unitId: unitAt(other, at.fighter).id,
      targetUnitId: unitAt(other, at.marshmallow).id,
    });
    expect(bounced.text).toBe("Fighter bounced back");
    const eaten = play(victim, {
      kind: "MOVE",
      unitId: unitAt(other, at.eater).id,
      path: [at.crumbs],
    });
    expect(eaten.text).toBe(
      `Fighter ate Player 2's Crumbs; Peppermint Surprise: Fighter −${PEPPERMINT_DAMAGE_V7}`,
    );
  });

  it("counts the units that crash at End Turn and says nothing without Candy", () => {
    const state = candyUiFixtureV7();
    const ended = play(state, { kind: "END_TURN" });
    expect(ended.text).toContain("You: 1 unit crashed");
    const human = martianUiFixtureV7();
    const view = viewOf(human);
    expect(candyBoundaryNoticeV7([], view, view)).toBeNull();
  });
});
