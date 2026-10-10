import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  GIANT_SIGNATURES_V7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import { GINGERBREAD_MAN_SPRITE_SCALE_V7 } from "../../src/render/canvas/giant-canvas-v7";
import {
  breakOffSecondTilesV7,
  tossPassengersV7,
  type GiantPickV7,
} from "../../src/render/canvas/giant-board-plan-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  GIANT_SIGNATURE_NAMES_V7,
  GINGERBREAD_MAN_LABEL_V7,
  cityWallsStatV7,
  factionGiantSignatureV7,
  giantCardLineV7,
  giantCombatNotesV7,
  giantCommandUnavailableTextV7,
  giantRewardLabelV7,
  giantSignatureRuleV7,
  swallowedVictimLineV7,
  trampleLabelV7,
} from "../../src/render/giant-presentation-v7";
import {
  recruitmentRolePresentationV7,
  roleAbilityNameV7,
} from "../../src/render/role-presentation-v7";
import {
  GLOSSARY_TEXT_LIMIT_V7,
  glossaryEntryV7,
  roleGlossaryV7,
  statusGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  GIANTS_UI_V7,
  giantsBreakOffFixtureV7,
  giantsCrushFixtureV7,
  giantsGingerbreadFixtureV7,
  giantsGlacialFixtureV7,
  giantsOverstrideFixtureV7,
  giantsSiegeFixtureV7,
  giantsSiegeRazedFixtureV7,
  giantsStompFixtureV7,
  giantsSwallowFixtureV7,
  giantsSwallowedFixtureV7,
  giantsTossFixtureV7,
} from "../fixtures/v7-giants-ui";

/**
 * The giants' signatures, presentation (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10): the words of the eight
 * signatures, and the four commands aimed on the board, each target an
 * offered command with its public preview, on the hand-built scenes of
 * tests/fixtures/v7-giants-ui.ts.
 */

const SIGNATURE_OF = {
  ORIGINAL: "CRUSH",
  UNDEAD: "SWALLOW",
  GOBLIN: "TOSS",
  DINOSAUR: "STOMP",
  MARTIAN: "OVERSTRIDE",
  ICE_FOLK: "GLACIAL_SMASH",
  DWARF: "SIEGE_HAMMER",
  CANDY: "BREAK_OFF",
  // The Cultists (`pulp_wars-mch9.3`): the Thing in the Cellar has no
  // signature until Anchor's bead (`pulp_wars-mch9.5`).
  CULT: null,
} as const;

function sceneOf(state: GameStateV7) {
  const view = viewForV7(state, state.humanPlayerId);
  const commands = queryPlayerCommandsV7(view);
  const unitAt = (at: CoordV7): PlayerViewV7["units"][number] => {
    const unit = view.units.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
    return unit;
  };
  const plan = (
    selected: CoordV7,
    extra: Partial<BoardRenderInteractionV7> = {},
  ) => {
    const unitId = unitAt(selected).id;
    return buildBoardRenderPlanV7(view, commands, {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
      ...extra,
    });
  };
  return { view, commands, unitAt, plan };
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

describe("the eight signatures in words", () => {
  it("names each faction giant's signature and states it from the mechanics", () => {
    for (const faction of FACTION_IDS_V7) {
      const signature = factionGiantSignatureV7(faction);
      expect(signature, faction).toBe(SIGNATURE_OF[faction]);
      if (signature === null) continue;
      expect(roleAbilityNameV7(signature, faction)).toBe(
        GIANT_SIGNATURE_NAMES_V7[signature],
      );
      // The recruit and Gallery card list it with its sentence.
      const card = recruitmentRolePresentationV7("JUGGERNAUT", faction);
      const rule = giantSignatureRuleV7(signature, faction);
      expect(card.abilities).toContain(
        `${GIANT_SIGNATURE_NAMES_V7[signature]}: ${rule.charAt(0).toUpperCase()}${rule.slice(1)}.`,
      );
    }
    // Every number is the registry's.
    expect(giantSignatureRuleV7("CRUSH", "ORIGINAL")).toContain(
      `${roleMechanicsV7("JUGGERNAUT", "ORIGINAL").crushDamage} more`,
    );
    expect(giantSignatureRuleV7("SWALLOW", "UNDEAD")).toContain(
      `${roleMechanicsV7("JUGGERNAUT", "UNDEAD").swallowMaxHp} HP or less`,
    );
    expect(giantSignatureRuleV7("TOSS", "GOBLIN")).toContain(
      `2 to ${roleMechanicsV7("JUGGERNAUT", "GOBLIN").tossRange} tiles`,
    );
    expect(giantSignatureRuleV7("STOMP", "DINOSAUR")).toContain(
      `deals ${roleMechanicsV7("JUGGERNAUT", "DINOSAUR").stompDamage}`,
    );
    expect(giantSignatureRuleV7("OVERSTRIDE", "MARTIAN")).toContain(
      `dealing ${roleMechanicsV7("JUGGERNAUT", "MARTIAN").trampleDamage}`,
    );
    expect(giantSignatureRuleV7("GLACIAL_SMASH", "ICE_FOLK")).toContain(
      `${roleMechanicsV7("JUGGERNAUT", "ICE_FOLK").glacialSmashHp} HP or less`,
    );
    expect(giantSignatureRuleV7("BREAK_OFF", "CANDY")).toContain(
      `spends ${roleMechanicsV7("JUGGERNAUT", "CANDY").breakOffHp} HP`,
    );
  });

  it("gives every signature a glossary entry in plain words", () => {
    for (const signature of GIANT_SIGNATURES_V7) {
      const entry = glossaryEntryV7(signature);
      expect(entry.name).toBe(GIANT_SIGNATURE_NAMES_V7[signature]);
      expect(entry.text.length).toBeLessThanOrEqual(GLOSSARY_TEXT_LIMIT_V7);
      expect(entry.text).toMatch(/\.$/);
      // No formula and no number but the whole point.
      expect(entry.text).not.toMatch(/\d/);
    }
    for (const faction of FACTION_IDS_V7) {
      const signature = SIGNATURE_OF[faction];
      const ids = roleGlossaryV7("JUGGERNAUT", faction).map(
        (entry) => entry.id,
      );
      if (signature === null)
        expect(
          ids.filter((id) =>
            (GIANT_SIGNATURES_V7 as readonly string[]).includes(id),
          ),
          faction,
        ).toEqual([]);
      else expect(ids, faction).toContain(signature);
    }
    expect(statusGlossaryV7("swallowed")?.name).toBe("Swallowed");
    expect(statusGlossaryV7("gingerbread-man")?.name).toBe(
      GINGERBREAD_MAN_LABEL_V7,
    );
  });

  it("names the signature on the reward dialog's giant card", () => {
    expect(giantRewardLabelV7("GOBLIN")).toEqual([
      "Troll",
      "A free Troll, once: throws Goblins",
    ]);
    for (const faction of FACTION_IDS_V7) {
      const [name, line] = giantRewardLabelV7(faction);
      expect(name).toBe(effectiveRoleRuleV7("JUGGERNAUT", faction).label);
      // A giant without a signature (the Cult's, so far) says no more.
      expect(line).toMatch(
        new RegExp(
          SIGNATURE_OF[faction] === null
            ? `^A free ${name}, once$`
            : `^A free ${name}, once: `,
        ),
      );
      expect(line.includes("slots"), faction).toBe(
        roleMechanicsV7("JUGGERNAUT", faction).capacitySlots > 1,
      );
    }
  });

  it("states the giant's signature on its unit card, with the held victim", () => {
    const swallowed = giantsSwallowedFixtureV7();
    const view = viewForV7(swallowed, swallowed.humanPlayerId);
    const holder = view.units.find(
      (unit) =>
        unit.at.x === GIANTS_UI_V7.swallow.abomination.x &&
        unit.at.y === GIANTS_UI_V7.swallow.abomination.y,
    );
    if (holder === undefined) throw new Error("no Abomination");
    expect(giantCardLineV7(view, holder)?.name).toBe("Swallow");
    expect(swallowedVictimLineV7(view, holder.id)).toEqual({
      label: "Knight 9/13",
      text: "Swallowed Knight at 9 HP: it loses 4 each turn and is digested in 3 turns; it is freed if the Abomination dies",
    });
    // A unit without a signature has no line.
    const knight = giantsSwallowFixtureV7();
    const before = viewForV7(knight, knight.humanPlayerId);
    const enemy = before.units.find(
      (unit) => unit.ownerId !== before.viewer.id,
    );
    if (enemy === undefined) throw new Error("no enemy");
    expect(giantCardLineV7(before, enemy)).toBeNull();
  });

  it("shows a city's Walls standing, then razed", () => {
    for (const [state, value] of [
      [giantsSiegeFixtureV7(), "Standing"],
      [giantsSiegeRazedFixtureV7(), "Razed"],
    ] as const) {
      const view = viewForV7(state, state.humanPlayerId);
      const city = view.cities.find(
        (candidate) =>
          candidate.at.x === GIANTS_UI_V7.siege.centre.x &&
          candidate.at.y === GIANTS_UI_V7.siege.centre.y,
      );
      if (city === undefined) throw new Error("no city");
      expect(cityWallsStatV7(city)?.value).toBe(value);
    }
    expect(cityWallsStatV7({ rewards: [] })).toBeNull();
  });
});

describe("the attack and Move previews", () => {
  it("shows the crush and the unit behind it, and a free target as pushed", () => {
    const { view, unitAt, plan } = sceneOf(giantsCrushFixtureV7());
    const at = GIANTS_UI_V7.crush;
    const juggernaut = unitAt(at.juggernaut);
    const blocked = queryCombatPreviewV7(
      view,
      juggernaut.id,
      unitAt(at.blocked).id,
    );
    if (blocked === null) throw new Error("no preview");
    expect(giantCombatNotesV7(blocked)).toEqual(["Crush 3 · 3 behind"]);
    const free = queryCombatPreviewV7(view, juggernaut.id, unitAt(at.free).id);
    if (free === null) throw new Error("no preview");
    expect(giantCombatNotesV7(free)).toEqual([]);
    const targets = plan(at.juggernaut).targets;
    const target = targets.find(
      (candidate) =>
        candidate.family === "ATTACK" && key(candidate.at) === key(at.blocked),
    );
    expect(target?.previewNote).toContain("Crush 3 · 3 behind");
    expect(target?.giantHits).toEqual([
      { at: at.blocker, label: "−3", lethal: false },
    ]);
    expect(
      giantCombatNotesV7({ ...blocked, crush: "UNKNOWN_BEHIND_FOG" }),
    ).toEqual(["Push or crush 3"]);
  });

  it("names the Siege Hammer and the Walls it tears down, without the Breach line", () => {
    const { plan } = sceneOf(giantsSiegeFixtureV7());
    const at = GIANTS_UI_V7.siege;
    const target = plan(at.titan).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" && key(candidate.at) === key(at.centre),
    );
    expect(target?.previewNote).toContain(
      "Siege Hammer: no fortification · Tears down the Walls",
    );
    expect(target?.previewNote).not.toContain("Breach");
  });

  it("marks the Glacial Smash", () => {
    const { plan } = sceneOf(giantsGlacialFixtureV7());
    const at = GIANTS_UI_V7.glacial;
    const target = plan(at.frostGiant).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" && key(candidate.at) === key(at.target),
    );
    expect(target?.previewNote).toContain("Glacial Smash");
  });

  it("labels an Overstride Move with its trample and marks the trampled unit", () => {
    const { plan } = sceneOf(giantsOverstrideFixtureV7());
    const at = GIANTS_UI_V7.overstride;
    const move = plan(at.colossus).targets.find(
      (candidate) =>
        candidate.family === "MOVE" && key(candidate.at) === key(at.beyond),
    );
    expect(move?.previewLabel).toBe("Trample −3");
    expect(move?.semanticLabel).toBe("Overstride: tramples Fighter −3");
    expect(move?.giantHits).toEqual([
      { at: at.fighter, label: "−3", lethal: false },
    ]);
    expect(
      trampleLabelV7([
        {
          unitId: 1 as never,
          at: at.fighter,
          damage: 3,
          shieldDamage: 0,
          dies: false,
        },
        {
          unitId: 2 as never,
          at: at.beyond,
          damage: 2,
          shieldDamage: 1,
          dies: true,
        },
      ] as never),
    ).toBe("Trample −3 · −3");
  });
});

describe("the four commands aimed on the board", () => {
  it("Swallow: the victims of 12 HP or less, each with its digest", () => {
    const { unitAt, plan } = sceneOf(giantsSwallowFixtureV7());
    const at = GIANTS_UI_V7.swallow;
    const pick: GiantPickV7 = {
      kind: "SWALLOW",
      unitId: unitAt(at.abomination).id,
    };
    const targets = plan(at.abomination, { giantPick: pick }).targets;
    expect(
      targets
        .map((target) => [target.family, key(target.at), target.previewLabel])
        .sort(),
    ).toEqual(
      [
        ["SWALLOW", key(at.fighter), "Swallow · 2 turns"],
        ["SWALLOW", key(at.knight), "Swallow · 3 turns"],
      ].sort(),
    );
    expect(targetHighlightStyleV7("SWALLOW")).toBe("ATTACK");
    // The full Guard is not a victim; unarmed, it is an attack target.
    const unarmed = plan(at.abomination).targets;
    expect(
      unarmed.some(
        (target) =>
          target.family === "ATTACK" && key(target.at) === key(at.guard),
      ),
    ).toBe(true);
    expect(unarmed.some((target) => target.family === "SWALLOW")).toBe(false);
  });

  it("Goblin Toss: the Goblin first, then the landings with the Kaboom from the focused one", () => {
    const { commands, unitAt, plan } = sceneOf(giantsTossFixtureV7());
    const at = GIANTS_UI_V7.toss;
    const troll = unitAt(at.troll).id;
    const goblin = unitAt(at.goblin).id;
    expect(tossPassengersV7(commands, troll)).toHaveLength(2);
    const passengers = plan(at.troll, {
      giantPick: { kind: "TOSS", unitId: troll, passengerUnitId: null },
    }).targets;
    expect(passengers.map((target) => target.family)).toEqual([
      "TOSS_PASSENGER",
      "TOSS_PASSENGER",
    ]);
    expect(targetHighlightStyleV7("TOSS_PASSENGER")).toBe("SUPPORT");
    const landings = plan(at.troll, {
      giantPick: { kind: "TOSS", unitId: troll, passengerUnitId: goblin },
      cursor: at.landing,
    });
    // One target per landing tile, never one per command of the dock.
    expect(landings.targets.every((target) => target.family === "TOSS")).toBe(
      true,
    );
    expect(new Set(landings.targets.map((target) => key(target.at))).size).toBe(
      landings.targets.length,
    );
    expect(targetHighlightStyleV7("TOSS")).toBe("PLACE");
    const focused = landings.targets.find(
      (target) => key(target.at) === key(at.landing),
    );
    expect(focused?.semanticLabel).toBe(
      "Throw the Goblin here: it can still attack or Kaboom",
    );
    // The Goblin's Kaboom from the focused landing hits both Humans.
    const blast = landings.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "BLAST",
    );
    expect(blast.map((entry) => [key(entry.at), entry.label]).sort()).toEqual(
      [
        [key(at.landing), "Kaboom!"],
        [key(at.enemyGuard), "−6"],
        [key(at.enemyFighter), "−6"],
      ].sort(),
    );
    expect(
      landings.entries.some(
        (entry) =>
          entry.kind === "ABILITY_AREA" && key(entry.at) === key(at.landing),
      ),
    ).toBe(true);
  });

  it("Thunder Stomp: its 3 x 3 with each enemy's damage and the smashed Field Defense", () => {
    const { unitAt, plan } = sceneOf(giantsStompFixtureV7());
    const at = GIANTS_UI_V7.stomp;
    const result = plan(at.brontosaurus, {
      giantPick: { kind: "STOMP", unitId: unitAt(at.brontosaurus).id },
    });
    expect(
      result.targets.map((target) => [key(target.at), target.previewLabel]),
    ).toEqual([
      [key(at.knight), "−4"],
      [key(at.fighter), "−4"],
      [key(at.champion), "−4"],
    ]);
    // Every marked enemy carries the one Stomp command.
    expect(
      new Set(result.targets.map((target) => target.command.kind)),
    ).toEqual(new Set(["STOMP"]));
    expect(
      result.entries.filter((entry) => entry.kind === "ABILITY_AREA"),
    ).toHaveLength(8);
    expect(
      result.entries.find(
        (entry) =>
          entry.kind === "ABILITY_TARGET" &&
          key(entry.at) === key(at.fieldDefense),
      )?.label,
    ).toBe("Smash");
  });

  it("Break Off: one tile, then a second that pairs with it", () => {
    const { commands, unitAt, plan } = sceneOf(giantsBreakOffFixtureV7());
    const at = GIANTS_UI_V7.breakOff;
    const giant = unitAt(at.giant).id;
    // 28 pairs are offered, yet the board shows eight tiles.
    expect(
      commands.filter((command) => command.kind === "BREAK_OFF"),
    ).toHaveLength(28);
    const first = plan(at.giant, {
      giantPick: { kind: "BREAK_OFF", unitId: giant, first: null },
    }).targets;
    expect(first.map((target) => target.family)).toEqual(
      new Array(8).fill("BREAK_OFF_FIRST"),
    );
    // No label per tile: the dock's prompt says what is placed.
    expect(first.every((target) => target.previewLabel === undefined)).toBe(
      true,
    );
    const second = plan(at.giant, {
      giantPick: { kind: "BREAK_OFF", unitId: giant, first: at.first },
    });
    expect(second.targets).toHaveLength(7);
    expect(breakOffSecondTilesV7(commands, giant, at.first)).toHaveLength(7);
    const pair = second.targets.find(
      (target) => key(target.at) === key(at.second),
    );
    expect(pair?.command).toEqual({
      kind: "BREAK_OFF",
      unitId: giant,
      tiles: [at.first, at.second],
    });
    expect(
      second.entries.find(
        (entry) =>
          entry.kind === "ABILITY_TARGET" && key(entry.at) === key(at.first),
      )?.label,
    ).toBe(GINGERBREAD_MAN_LABEL_V7);
  });

  it("names why a button cannot be used", () => {
    const { view, unitAt } = sceneOf(giantsSwallowedFixtureV7());
    const holder = unitAt(GIANTS_UI_V7.swallow.abomination);
    // The Abomination acted (it swallowed): nothing to say on a done unit.
    expect(
      giantCommandUnavailableTextV7(view, holder, "SWALLOW", false),
    ).toBeNull();
    const weak = giantsBreakOffFixtureV7();
    const giantAt = GIANTS_UI_V7.breakOff.giant;
    const patched: GameStateV7 = {
      ...weak,
      units: weak.units.map((unit) =>
        unit.at.x === giantAt.x && unit.at.y === giantAt.y
          ? { ...unit, hp: 10 }
          : unit,
      ),
    };
    const weakScene = sceneOf(patched);
    expect(
      giantCommandUnavailableTextV7(
        weakScene.view,
        weakScene.unitAt(giantAt),
        "BREAK_OFF",
        false,
      ),
    ).toBe("Needs more than 10 HP");
  });
});

describe("the Gingerbread Men and the belly badge on the board", () => {
  it("draws a Gingerbread Man as its Giant's sprite, small", () => {
    const { view, unitAt, plan } = sceneOf(giantsGingerbreadFixtureV7());
    const man = unitAt(GIANTS_UI_V7.breakOff.first);
    expect(man.variant).toBe("GINGERBREAD_MAN");
    const entry = plan(GIANTS_UI_V7.breakOff.giant).entries.find(
      (candidate) => candidate.key === `unit:${man.id}`,
    );
    expect(entry).toMatchObject({
      artSubject: "UNIT:CANDY:JUGGERNAUT",
      label: GINGERBREAD_MAN_LABEL_V7,
      gingerbreadMan: true,
    });
    expect(GINGERBREAD_MAN_SPRITE_SCALE_V7).toBeLessThan(1);
    // The Giant itself is drawn at full size.
    const giant = plan(GIANTS_UI_V7.breakOff.giant).entries.find(
      (candidate) =>
        candidate.key === `unit:${unitAt(GIANTS_UI_V7.breakOff.giant).id}`,
    );
    expect(giant?.gingerbreadMan).toBeUndefined();
    expect(
      view.units.filter((unit) => unit.variant === "GINGERBREAD_MAN"),
    ).toHaveLength(2);
  });

  it("puts the held victim's portrait and HP on the Abomination", () => {
    const { unitAt, plan } = sceneOf(giantsSwallowedFixtureV7());
    const holder = unitAt(GIANTS_UI_V7.swallow.abomination);
    const entry = plan(GIANTS_UI_V7.swallow.abomination).entries.find(
      (candidate) => candidate.key === `unit:${holder.id}`,
    );
    expect(entry?.swallowed).toMatchObject({
      portraitSubject: "PORTRAIT:KNIGHT",
      hp: 9,
      maxHp: 13,
    });
  });
});
