import { describe, expect, it } from "vitest";
import {
  ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7,
  ARMY_DINOSAUR_ALONE_RADIUS_V7,
  ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7,
  ARMY_DINOSAUR_CHARGER_REACH_V7,
  ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7,
  ARMY_DINOSAUR_CROWDED_UNITS_V7,
  ARMY_DINOSAUR_DEFENCE_RADIUS_V7,
  ARMY_DINOSAUR_DEFENDER_CAP_COST_V7,
  ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7,
  ARMY_DINOSAUR_PACK_CAVEMEN_V7,
  ARMY_DINOSAUR_PACK_REACH_V7,
  ARMY_DINOSAUR_SKIRMISHER_MAXIMUM_V7,
  ARMY_DINOSAUR_SKIRMISHER_PER_UNITS_V7,
  ARMY_DINOSAUR_STURDY_V7,
  ARMY_ESCORT_VALUE_V7,
  ARMY_NESTING_DEFENDERS_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_TRAINING_PRIORITY_V7,
  ARMY_WALLBREAKER_CHARGERS_V7,
  armyClassV7,
  armyCountsV7,
  armyDinosaurDefenderCappedV7,
  armyPlayFactionV7,
  armyRoleScoreV7,
  armyShareClassV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  inspectNormalArmyV7,
  publicProjectedDamageForPolicyV7,
} from "../../src/ai/v7";
import {
  CHARGE_RUN_UP_KILL_PRIORITY_V7,
  EGG_GUARD_PRIORITY_V7,
  GROWN_RETREAT_PRIORITY_V7,
  HATCH_PRIORITY_V7,
  PACK_HUNT_ASSUMED_RADIUS_V7,
  WALLBREAKER_CHARGER_VALUE_V7,
  chargeRunUpForPolicyV7,
  runUpTilesForPolicyV7,
} from "../../src/ai/v7-dinosaur";
import {
  CAVEMAN_PACK_HUNT_BONUS2_V7,
  FACTION_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  RUN_UP_BASE_TILES_V7,
  RUN_UP_MAXIMUM_TILES_V7,
  SAVE_STORAGE_KEY_V7,
  SHAMAN_TEND_DINOSAUR_V7,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseGameStateV7,
  previewLayEggV7,
  previewTendWoundedV7,
  publicHireCostV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  CHARGE_DESCRIPTION_V7,
  DINOSAUR_HELP_RULES_V7,
  DINOSAUR_HIRE_NOTE_V7,
  HATCH_TOOLTIP_V7,
  WALLBREAKER_UNLOCK_TEXT_V7,
  chargePreviewLinesV7,
  dinosaurAbilityDescriptionV7,
  dinosaurRecruitNotesV7,
  nestingUnlockTextV7,
  packHuntPreviewLineV7,
  packHuntTextV7,
  shamanTendTextV7,
} from "../../src/render/dinosaur-presentation-v7";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import {
  hireUnlockTextV7,
  scoutsRewardTextV7,
} from "../../src/render/technology-unlock-text-v7";
import {
  dinosaurFieldV7,
  dinosaurTechsWithoutV7,
  type DinosaurFieldOptionsV7,
} from "../fixtures/v7-dinosaur-ai";
import { cityOfV7, withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { withCandyOnOlderPolicyV7 } from "../fixtures/v7-older-policy";
import {
  at,
  attackV7,
  movedV7,
  patchTileV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Dinosaur pass (`pulp_wars-w49.15`, `pulp-wars-poc-7r76`,
// docs/product/RULESET_7_TUNING_DINOSAUR.md): Scouts for a Dinosaur city (a
// free Raptor); a Triceratops's run-up counts one tile, two with
// Wallbreaker; the Caveman's Pack Hunt; a Dinosaur Market hires a dinosaur
// hatched; Dinosaur seats in the Normal AI's army play with their research
// order, shares, and unit rules; the lab `LAB_DINOSAUR_MID`. Two-seat
// field (tests/fixtures/v7-dinosaur-ai.ts, seed-2 Dry Land, 11 x 11): seat
// 0 capital (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5),
// (5, 8); every other land tile open Grass, every tile explored and every
// land technology researched unless stated. The numbers asserted here are
// the ones the tuning document gives as reasons
// (`scripts/dinosaur-tuning-analysis-v7.ts`).

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));
/** Every Dinosaur technology but Wallbreaker (the Dinosaur Explosives). */
const NO_WALLBREAKER = dinosaurTechsWithoutV7("EXPLOSIVES");

const own = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** Seat 0 Dinosaur against seat 1 of `opponent`; the Dinosaurs move. */
const asDinosaur = (
  pieces: readonly GoblinPieceV7[],
  options: DinosaurFieldOptionsV7 = {},
  opponent: FactionIdV7 = "ORIGINAL",
): GameStateV7 => dinosaurFieldV7(["DINOSAUR", opponent], pieces, options);
/** Seat 0 of `attacker` against seat 1 Dinosaur; seat 0 moves. */
const againstDinosaur = (
  pieces: readonly GoblinPieceV7[],
  options: DinosaurFieldOptionsV7 = {},
  attacker: FactionIdV7 = "ORIGINAL",
): GameStateV7 => dinosaurFieldV7([attacker, "DINOSAUR"], pieces, options);

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

function previewAt(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): NonNullable<ReturnType<typeof queryCombatPreviewV7>> {
  const preview = queryCombatPreviewV7(
    viewOf(state),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (preview === null) throw new Error("attack not offered");
  return preview;
}

const ROSTER: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "SWORDSMAN",
  "KNIGHT",
  "JUGGERNAUT",
];

describe("the Dinosaur pass: identity", () => {
  // The economy rejig (tests/unit/ruleset-v7-economy-rejig.test.ts) took
  // 7r54, so 7r53 is the last prior identity.
  it("was 7r53 after 7r52, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r76");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r76.current");
    // The ninth unit (`pulp_wars-w49.17`) took 7r55, so 7r54 is prior too.
    expect(PRIOR_RULESET_7_IDS.slice(-24, -21)).toEqual([
      "pulp-wars-poc-7r52",
      "pulp-wars-poc-7r53",
      "pulp-wars-poc-7r54",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-24, -21)).toEqual([
      "pulpWars.save.v7r52.current",
      "pulpWars.save.v7r53.current",
      "pulpWars.save.v7r54.current",
    ]);
  });

  it("registers Pack Hunt and the gated run-up on the Dinosaur registration and moves no number", () => {
    // One role mechanic: the Caveman's Pack Hunt, and no other role's.
    for (const faction of FACTION_IDS_V7)
      for (const role of ROSTER)
        expect(
          roleMechanicsV7(role, faction).packHuntBonus2,
          `${faction} ${role}`,
        ).toBe(faction === "DINOSAUR" && role === "FIGHTER" ? 2 : 0);
    expect(CAVEMAN_PACK_HUNT_BONUS2_V7).toBe(2);
    // One capability: the run-up tiles, 2 only with the Dinosaur
    // Wallbreaker (no other tree has the unlock).
    expect([RUN_UP_BASE_TILES_V7, RUN_UP_MAXIMUM_TILES_V7]).toEqual([1, 2]);
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction).runUpTiles,
        faction,
      ).toBe(faction === "DINOSAUR" ? 2 : 1);
    expect(
      technologyCapabilitiesV7(NO_WALLBREAKER, "DINOSAUR").runUpTiles,
    ).toBe(1);
    expect(
      factionTreeV7("DINOSAUR")
        .nodes.filter((node) =>
          node.unlocks.some((unlock) => unlock.kind === "WALLBREAKER"),
        )
        .map((node) => node.id),
    ).toEqual(["EXPLOSIVES"]);
    // Price, HP, Attack, Defense (in half-points), Move, range: as before.
    expect(
      ROSTER.map((role) => {
        const rule = effectiveRoleRuleV7(role, "DINOSAUR");
        return [
          rule.label,
          rule.cost,
          rule.maxHp,
          rule.attack2,
          rule.defense2,
          rule.move,
          rule.range,
        ];
      }),
    ).toEqual([
      ["Caveman", 2, 10, 4, 4, 1, 1],
      ["Raptor", 4, 12, 5, 2, 2, 1],
      ["Spitter", 4, 10, 4, 2, 1, 2],
      ["Ankylosaurus", 5, 20, 4, 6, 1, 1],
      ["Shaman", 5, 10, 2, 2, 1, 1],
      ["Triceratops", 8, 20, 6, 4, 2, 1],
      ["T-Rex", 14, 28, 8, 4, 2, 1],
      ["Brontosaurus", null, 45, 7, 8, 1, 1],
    ]);
    expect(
      ROSTER.map((role) => [
        roleMechanicsV7(role, "DINOSAUR").capacitySlots,
        roleMechanicsV7(role, "DINOSAUR").hatchTurns,
      ]),
    ).toEqual([
      [1, null],
      [1, 1],
      [1, 1],
      [1, 2],
      [1, null],
      [2, 2],
      [2, 4],
      [2, null],
    ]);
  });
});

describe("the Dinosaur pass: Scouts", () => {
  it("gives a Dinosaur city's Survey a free Raptor, hatched, in a unit slot", () => {
    expect(SURVEY_RAIDERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 1,
      DINOSAUR: 1,
      MARTIAN: 1,
      // Step two of the Ice Folk pass (7r59): a Sled.
      ICE_FOLK: 1,
      // The reward ladder rework (`pulp_wars-zypi`): a Gyrocopter and a
      // Donut Racer.
      DWARF: 1,
      CANDY: 1,
      // The Cultists (`pulp_wars-mch9.3`): a Familiar.
      CULT: 1,
    });
    const base = asDinosaur([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
      techs: { 0: techsOf("GATHERING", "FARMING"), 1: [] },
      coins: 50,
    });
    const actor = seatIdV7(base, 0);
    const capital = base.cities.find((city) => city.ownerId === actor);
    if (capital === undefined) throw new Error("capital missing");
    // Since the reward ladder rework (`pulp_wars-zypi`) Scouts is a
    // level-3 reward: three Farms take the capital to level 3, through the
    // level-2 Stockpile.
    const farms = [at(8, 9), at(7, 9), at(9, 9)];
    let state = base;
    for (const farm of farms)
      state = patchTileV7(state, farm, {
        biome: "PLAINS",
        terrain: "GRASS",
        resource: "FERTILE_GROUND",
        improvement: null,
      });
    let built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: at(8, 9) });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
      candidates: ["STOCKPILE", "MILITIA"],
    });
    built = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(7, 9) });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(9, 9) });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 3,
      candidates: ["SURVEY", "WALLS"],
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 3,
      reward: "SURVEY",
    });
    expect(
      chosen.events.find((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toMatchObject({ role: "RAIDER", reachedLevel: 3 });
    // Without Scouting; no Egg: a hatched Raptor beside the garrisoned
    // center, homed to the city.
    const raptor = chosen.state.units.find(
      (unit) => unit.ownerId === actor && unit.role === "RAIDER",
    );
    if (raptor === undefined) throw new Error("no Raptor");
    expect(raptor).toMatchObject({
      form: "LAND",
      hp: 12,
      maxHp: 12,
      homeCityId: capital.id,
    });
    expect(gap(raptor.at, capital.at)).toBe(1);
    expect(chosen.state.eggs).toEqual([]);
    expect(effectiveRoleRuleV7("RAIDER", "DINOSAUR").label).toBe("Raptor");
    expect(scoutsRewardTextV7("Raptor")).toBe(
      "Reveal the area and a free Raptor",
    );
  });
});

describe("the Dinosaur pass: a run-up of one tile, two with Wallbreaker", () => {
  /** A Triceratops that moved `tiles` tiles beside a Human unit. */
  const charge = (
    tiles: number,
    target: GoblinPieceV7["role"],
    techs: readonly TechnologyIdV7[] = NO_WALLBREAKER,
  ) =>
    previewAt(
      asDinosaur(
        [
          own("SWORDSMAN", 4, 3, { activation: movedV7(tiles) }),
          foe(target, 5, 3),
        ],
        { techs: { 0: techs } },
      ),
      at(4, 3),
      at(5, 3),
    );

  it("adds +1 Attack after a Move of any length without Wallbreaker", () => {
    expect(charge(0, "FIGHTER")).toMatchObject({ runUp: 0, attack2: 6 });
    expect(charge(1, "FIGHTER")).toMatchObject({ runUp: 1, attack2: 8 });
    expect(charge(2, "FIGHTER")).toMatchObject({ runUp: 1, attack2: 8 });
  });

  it("counts the second tile with Wallbreaker", () => {
    const all = dinosaurTechsWithoutV7();
    expect(charge(1, "FIGHTER", all)).toMatchObject({ runUp: 1, attack2: 8 });
    expect(charge(2, "FIGHTER", all)).toMatchObject({ runUp: 2, attack2: 10 });
  });

  it("decides whether a charge kills a Swordsman: 11 of its 15 HP without it, a kill with it", () => {
    expect(charge(2, "SWORDSMAN")).toMatchObject({
      damageToDefender: 11,
      defenderDies: false,
      damageToAttacker: 4,
    });
    expect(charge(2, "SWORDSMAN", dinosaurTechsWithoutV7())).toMatchObject({
      damageToDefender: 15,
      defenderDies: true,
    });
    // A Guard: 10 and 14 of its 17 HP.
    expect(charge(2, "GUARD").damageToDefender).toBe(10);
    expect(charge(2, "GUARD", dinosaurTechsWithoutV7()).damageToDefender).toBe(
      14,
    );
    // A Fighter, a Marksman, a Raider, and a Knight die to one tile.
    for (const role of ["FIGHTER", "MARKSMAN", "RAIDER", "KNIGHT"] as const)
      expect(charge(1, role).defenderDies, role).toBe(true);
  });

  it("still ignores Walls and Field Defense without Wallbreaker", () => {
    const state = walledV7({
      defender: "GUARD",
      attackers: [{ role: "SWORDSMAN", at: at(8, 7) }],
      attackerTechs: NO_WALLBREAKER,
      fieldDefense: true,
    });
    expect(previewAt(state, at(8, 7), at(8, 8))).toMatchObject({
      fortificationLevel: 0,
      runUp: 0,
    });
  });

  it("resolves as previewed, and publishes the tiles that count", () => {
    const state = asDinosaur([own("SWORDSMAN", 2, 3), foe("FIGHTER", 5, 3)], {
      techs: { 0: NO_WALLBREAKER },
    });
    const actor = seatIdV7(state, 0);
    const moved = applyOkV7(state, actor, {
      kind: "MOVE",
      unitId: unitAtV7(state, at(2, 3)).id,
      path: [at(3, 3), at(4, 3)],
    }).state;
    const stats = (source: GameStateV7) =>
      viewOf(source).unitStats.find(
        (entry) => entry.unitId === unitAtV7(source, at(4, 3)).id,
      );
    expect(stats(moved)?.dinosaur).toMatchObject({
      runUpBonus: 1,
      runUpMaximum: 1,
    });
    const run = attackV7(moved, at(4, 3), at(5, 3));
    expect(run.combat).toMatchObject({ runUp: 1, defenderDies: true });
    // With Wallbreaker the same Move counts two tiles.
    const all = asDinosaur([own("SWORDSMAN", 2, 3), foe("FIGHTER", 5, 3)]);
    const movedAll = applyOkV7(all, seatIdV7(all, 0), {
      kind: "MOVE",
      unitId: unitAtV7(all, at(2, 3)).id,
      path: [at(3, 3), at(4, 3)],
    }).state;
    expect(stats(movedAll)?.dinosaur).toMatchObject({ runUpMaximum: 2 });
    expect(attackV7(movedAll, at(4, 3), at(5, 3)).combat.runUp).toBe(2);
  });

  it("is what the Normal AI counts: its own research for its unit, two tiles for a hostile one", () => {
    const state = asDinosaur([own("SWORDSMAN", 4, 3), foe("FIGHTER", 2, 2)], {
      techs: { 0: NO_WALLBREAKER },
    });
    const view = viewOf(state);
    const unit = view.units.find((item) => same(item.at, at(4, 3)));
    if (unit === undefined) throw new Error("no unit");
    expect(runUpTilesForPolicyV7(view, unit)).toBe(1);
    expect(chargeRunUpForPolicyV7(view, unit, 2)).toBe(2);
    const human = againstDinosaur(
      [own("FIGHTER", 8, 7), foe("CATAPULT", 4, 3)],
      { techs: { 1: NO_WALLBREAKER } },
    );
    const seen = viewOf(human).units.find((item) => same(item.at, at(4, 3)));
    if (seen === undefined) throw new Error("no unit");
    // Another seat's research is not public.
    expect(runUpTilesForPolicyV7(viewOf(human), seen)).toBe(2);
  });

  it("says so on the Triceratops, the technology, and the Help page", () => {
    expect(CHARGE_DESCRIPTION_V7).toBe(
      "+1 Attack after moving this turn (with Wallbreaker +1 per tile, up to +2). Ignores Walls and Field Defense, destroys Field Defense, and pushes back.",
    );
    expect(WALLBREAKER_UNLOCK_TEXT_V7).toBe(
      "A Triceratops's run-up counts 2 tiles (up to +2 Attack); dinosaurs ignore City Walls",
    );
    const help = new Map(DINOSAUR_HELP_RULES_V7);
    expect(help.get("Wallbreaker")).toBe(
      "with Wallbreaker, a Triceratops's run-up counts two tiles, and dinosaurs ignore City Walls when they attack.",
    );
    expect(help.get("Charge!")).toContain(
      "(+1 Attack; with Wallbreaker +1 per tile, up to +2)",
    );
  });
});

describe("the Dinosaur pass: Pack Hunt", () => {
  /** A Caveman's attack on a Fighter with `extra` own pieces around. */
  const hunt = (
    extra: readonly GoblinPieceV7[],
    target = foe("FIGHTER", 5, 3),
  ) =>
    previewAt(
      asDinosaur([own("FIGHTER", 4, 3), target, ...extra]),
      at(4, 3),
      target.at,
    );

  it("gives a Caveman +1 Attack against a unit next to an own dinosaur", () => {
    expect(hunt([])).toMatchObject({ attack2: 4, damageToDefender: 5 });
    for (const role of [
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "SWORDSMAN",
      "KNIGHT",
    ] as const)
      expect(hunt([own(role, 5, 4)]), role).toMatchObject({
        attack2: 6,
        damageToDefender: 8,
        damageToAttacker: 4,
      });
    // The Brontosaurus is a dinosaur too.
    expect(hunt([own("JUGGERNAUT", 6, 3)]).attack2).toBe(6);
  });

  it("needs a dinosaur beside the target: no Caveman, Shaman, or Egg, and none two tiles away", () => {
    expect(hunt([own("FIGHTER", 5, 4)]).attack2).toBe(4);
    expect(hunt([own("CAPTAIN", 5, 4)]).attack2).toBe(4);
    expect(hunt([own("RAIDER", 7, 3)]).attack2).toBe(4);
    // A hostile dinosaur beside the target is no help.
    const mirror = dinosaurFieldV7(
      ["DINOSAUR", "DINOSAUR"],
      [own("FIGHTER", 4, 3), foe("FIGHTER", 5, 3), foe("RAIDER", 5, 4)],
    );
    expect(previewAt(mirror, at(4, 3), at(5, 3)).attack2).toBe(4);
    // An own Egg beside the target (the target stands by the capital).
    const nest = asDinosaur([own("FIGHTER", 6, 7), foe("FIGHTER", 6, 8)], {
      eggs: [{ seat: 0, role: "RAIDER", at: at(7, 8) }],
    });
    expect(previewAt(nest, at(6, 7), at(6, 8)).attack2).toBe(4);
  });

  it("is the Caveman's own attack only: no other unit's, and not its retaliation", () => {
    // A Raptor beside a Triceratops's target gets nothing.
    expect(
      previewAt(
        asDinosaur([
          own("RAIDER", 4, 3),
          own("SWORDSMAN", 5, 4),
          foe("FIGHTER", 5, 3),
        ]),
        at(4, 3),
        at(5, 3),
      ).attack2,
    ).toBe(5);
    // A Fighter attacks a Caveman that stands beside its own Raptor: it
    // takes back the ordinary 5.
    const defended = againstDinosaur([
      own("FIGHTER", 4, 3),
      foe("FIGHTER", 5, 3),
      foe("RAIDER", 3, 4),
    ]);
    expect(previewAt(defended, at(4, 3), at(5, 3)).damageToAttacker).toBe(5);
    // No Human Fighter has it.
    expect(
      previewAt(
        againstDinosaur([
          own("FIGHTER", 4, 3),
          own("KNIGHT", 5, 4),
          foe("FIGHTER", 5, 3),
        ]),
        at(4, 3),
        at(5, 3),
      ).attack2,
    ).toBe(4);
  });

  it("resolves as previewed and finishes what a Triceratops leaves", () => {
    // The charge leaves a Swordsman at 4 HP and pushes it; the Caveman
    // steps up and kills it with Pack Hunt (4 without it would too; a
    // full-HP Swordsman takes 7 instead of 4).
    const state = asDinosaur(
      [own("FIGHTER", 4, 3), own("RAIDER", 5, 4), foe("SWORDSMAN", 5, 3)],
      { techs: { 0: NO_WALLBREAKER } },
    );
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat).toMatchObject({
      attack2: 6,
      damageToDefender: 7,
      damageToAttacker: 5,
    });
    expect(
      previewAt(
        asDinosaur([own("FIGHTER", 4, 3), foe("SWORDSMAN", 5, 3)]),
        at(4, 3),
        at(5, 3),
      ),
    ).toMatchObject({ damageToDefender: 4, damageToAttacker: 6 });
  });

  it("says so on the Caveman's card and the Help page", () => {
    expect(packHuntTextV7(2)).toBe(
      "Pack Hunt: +1 Attack against a unit next to one of your dinosaurs, or one a dinosaur of yours attacked this turn",
    );
    expect(
      recruitmentRolePresentationV7("FIGHTER", "DINOSAUR").restrictions,
    ).toContain(
      "Pack Hunt: +1 Attack against a unit next to one of your dinosaurs, or one a dinosaur of yours attacked this turn.",
    );
    expect(
      recruitmentRolePresentationV7("FIGHTER", "ORIGINAL").restrictions.join(
        " ",
      ),
    ).not.toContain("Pack Hunt");
    expect(new Map(DINOSAUR_HELP_RULES_V7).get("Pack Hunt")).toBe(
      "a Caveman has +1 Attack against a unit that stands next to one of your dinosaurs, or that a dinosaur of yours attacked this turn.",
    );
  });
});

describe("the Dinosaur pass: a Market hires a dinosaur, hatched", () => {
  const MARKET = at(9, 9);
  const withMarket = (
    pieces: readonly GoblinPieceV7[] = [],
    options: DinosaurFieldOptionsV7 = {},
  ): GameStateV7 =>
    patchTileV7(
      asDinosaur([foe("FIGHTER", 2, 2), ...pieces], options),
      MARKET,
      { improvement: "MARKET" },
    );
  const hires = (state: GameStateV7) =>
    queryPlayerCommandsV7(viewOf(state)).flatMap((command) =>
      command.kind === "HIRE" ? [command.role] : [],
    );

  it("offers every Dinosaur unit it can produce, at one and a half times the price", () => {
    const state = withMarket();
    const city = state.cities.find((item) => same(item.at, at(8, 8)));
    if (city === undefined) throw new Error("no capital");
    // The ninth unit (7r55): the Stegosaurus (`CATAPULT`) and the
    // Triceratops (`SWORDSMAN`, the last role ID).
    expect(hires(state)).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    expect(
      (["RAIDER", "MARKSMAN", "GUARD", "SWORDSMAN", "KNIGHT"] as const).map(
        (role) => publicHireCostV7(viewOf(state), city.id, role),
      ),
    ).toEqual([6, 6, 8, 12, 21]);
    // Never the reward-only Brontosaurus, and nothing without its
    // technology.
    expect(publicHireCostV7(viewOf(state), city.id, "JUGGERNAUT")).toBeNull();
    expect(
      hires(
        withMarket([], { techs: { 0: dinosaurTechsWithoutV7("CHIVALRY") } }),
      ),
    ).not.toContain("KNIGHT");
  });

  it("puts a hatched Triceratops on the Market tile, spent, with its two slots", () => {
    const state = withMarket();
    const actor = seatIdV7(state, 0);
    const city = state.cities.find((item) => same(item.at, at(8, 8)));
    if (city === undefined) throw new Error("no capital");
    const result = applyOkV7(state, actor, {
      kind: "HIRE",
      cityId: city.id,
      at: MARKET,
      role: "SWORDSMAN",
    });
    const hired = unitAtV7(result.state, MARKET);
    expect(hired).toMatchObject({
      role: "SWORDSMAN",
      form: "LAND",
      hp: 20,
      maxHp: 20,
      homeCityId: city.id,
    });
    expect(hired.activation).toMatchObject({ moved: true, attacked: true });
    expect(result.state.eggs).toEqual([]);
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_TRAINED",
      role: "SWORDSMAN",
      cost: 12,
    });
    // The city action is not used: the city still lays an Egg.
    expect(
      queryPlayerCommandsV7(viewOf(result.state)).some(
        (command) => command.kind === "LAY_EGG",
      ),
    ).toBe(true);
  });

  it("counts a two-slot dinosaur against the city's limit plus one", () => {
    // A level-1 capital with Planning and Nesting: 4 slots. Three Cavemen
    // leave one: a Triceratops (two) is the one unit above the limit; with
    // four it is two above, and only one-slot units are hired.
    const three = withMarket([
      own("FIGHTER", 7, 7),
      own("FIGHTER", 8, 7),
      own("FIGHTER", 9, 7),
    ]);
    expect(hires(three)).toContain("SWORDSMAN");
    const four = withMarket([
      own("FIGHTER", 7, 7),
      own("FIGHTER", 8, 7),
      own("FIGHTER", 9, 7),
      own("FIGHTER", 7, 9),
    ]);
    expect(hires(four)).toContain("RAIDER");
    expect(hires(four)).not.toContain("SWORDSMAN");
    expect(hires(four)).not.toContain("KNIGHT");
  });

  it("leaves the other factions' hires as they were, and says so for the Dinosaurs", () => {
    const human = patchTileV7(
      dinosaurFieldV7(["ORIGINAL", "DINOSAUR"], [foe("FIGHTER", 2, 2)]),
      MARKET,
      { improvement: "MARKET" },
    );
    expect(hires(human)).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    expect(hireUnlockTextV7(null)).not.toContain("hatched");
    expect(hireUnlockTextV7(DINOSAUR_HIRE_NOTE_V7)).toBe(
      "Hire: each Market hires one extra unit a turn on its tile, at 1.5× the price; its city may hold 1 unit above its limit; a hired dinosaur arrives hatched",
    );
  });
});

describe("the Dinosaur pass: the matrix numbers the document reasons from", () => {
  /** A Human unit of `role` attacks a Dinosaur unit from the next tile. */
  const struck = (
    role: GoblinPieceV7["role"],
    target: GoblinPieceV7["role"],
    kills = 0,
  ) => {
    const base = againstDinosaur([own(role, 4, 3), foe(target, 5, 3)]);
    const state = kills === 0 ? base : withKillsV7(base, at(5, 3), kills);
    return previewAt(state, at(4, 3), at(5, 3));
  };

  it("has a Human Knight kill a Caveman, a Raptor, a Spitter, and a Shaman in one attack", () => {
    for (const target of ["FIGHTER", "RAIDER", "MARKSMAN", "CAPTAIN"] as const)
      expect(struck("KNIGHT", target), target).toMatchObject({
        defenderDies: true,
        advances: true,
      });
  });

  it("has an Ankylosaurus, a Triceratops, a T-Rex, and a grown Raptor survive it", () => {
    expect(struck("KNIGHT", "GUARD")).toMatchObject({
      damageToDefender: 9,
      defenderArmoured: true,
      damageToAttacker: 6,
      defenderDies: false,
      overrunContinues: false,
    });
    expect(struck("KNIGHT", "SWORDSMAN")).toMatchObject({
      damageToDefender: 12,
      defenderDies: false,
    });
    expect(struck("KNIGHT", "KNIGHT")).toMatchObject({
      damageToDefender: 12,
      defenderDies: false,
    });
    // A Big Raptor has 16 HP and takes 14; a Big Spitter (14 HP) dies.
    expect(struck("KNIGHT", "RAIDER", 1)).toMatchObject({
      damageToDefender: 14,
      defenderDies: false,
    });
    expect(struck("KNIGHT", "MARKSMAN", 1).defenderDies).toBe(true);
    expect(struck("KNIGHT", "MARKSMAN", 3).defenderDies).toBe(false);
  });

  it("ends a Knight's ride on an Ankylosaurus in a line of five (the reducer)", () => {
    let state = againstDinosaur([
      own("KNIGHT", 1, 3),
      foe("FIGHTER", 2, 3),
      foe("RAIDER", 3, 3),
      foe("GUARD", 4, 3),
      foe("MARKSMAN", 5, 3),
      foe("FIGHTER", 6, 3),
    ]);
    const knight = unitAtV7(state, at(1, 3)).id;
    const strike = (where: CoordV7): boolean => {
      const target = state.units.find((unit) => same(unit.at, where));
      if (target === undefined) return false;
      const result = applyCommandV7(state, seatIdV7(state, 0), {
        kind: "ATTACK",
        unitId: knight,
        targetUnitId: target.id,
      });
      if (!result.accepted) return false;
      state = result.state;
      return true;
    };
    expect(strike(at(2, 3))).toBe(true);
    expect(strike(at(3, 3))).toBe(true);
    expect(strike(at(4, 3))).toBe(true);
    // The Ankylosaurus stands (11 of 20); the ride is over.
    expect(strike(at(5, 3))).toBe(false);
    const left = state.units
      .filter((unit) => unit.ownerId === seatIdV7(state, 1))
      .map((unit) => [unit.role, unit.hp]);
    expect(left).toEqual([
      ["GUARD", 11],
      ["MARKSMAN", 10],
      ["FIGHTER", 10],
    ]);
    expect(state.units.find((unit) => unit.id === knight)?.hp).toBe(7);
  });

  it("has a Knight smash an Egg laid with Nesting and ride on to the next", () => {
    const state = againstDinosaur([own("KNIGHT", 3, 6)], {
      eggs: [
        { seat: 1, role: "KNIGHT", at: at(3, 7), maxHp: 10 },
        { seat: 1, role: "CATAPULT", at: at(2, 7), maxHp: 10 },
      ],
    });
    expect(previewAt(state, at(3, 6), at(3, 7))).toMatchObject({
      damageToDefender: 10,
      defenderDies: true,
      advances: true,
      overrunContinues: true,
    });
  });

  it("has a full-HP T-Rex kill a Fighter and a wounded one not", () => {
    const rex = (hp?: number) =>
      previewAt(
        asDinosaur([
          own("KNIGHT", 4, 3, hp === undefined ? {} : { hp }),
          foe("FIGHTER", 5, 3),
        ]),
        at(4, 3),
        at(5, 3),
      );
    expect(rex()).toMatchObject({ damageToDefender: 12, defenderDies: true });
    expect(rex(10)).toMatchObject({ damageToDefender: 8, defenderDies: false });
    // A Guard takes 10 of 17 and a Swordsman 11 of 15: the ride ends.
    expect(
      previewAt(
        asDinosaur([own("KNIGHT", 4, 3), foe("SWORDSMAN", 5, 3)]),
        at(4, 3),
        at(5, 3),
      ).damageToDefender,
    ).toBe(11);
  });

  it("has a Spitter's Acid deal a Fighter 5 on open ground and on a walled center", () => {
    expect(
      previewAt(
        asDinosaur([own("MARKSMAN", 3, 3), foe("FIGHTER", 5, 3)]),
        at(3, 3),
        at(5, 3),
      ),
    ).toMatchObject({ acid: true, damageToDefender: 5, damageToAttacker: 0 });
    const walled = walledV7({
      defender: "FIGHTER",
      attackers: [{ role: "MARKSMAN", at: at(8, 6) }],
      attackerTechs: NO_WALLBREAKER,
    });
    expect(previewAt(walled, at(8, 6), at(8, 8))).toMatchObject({
      acid: true,
      damageToDefender: 5,
    });
  });
});

// ---------------------------------------------------------------------------
// The Normal AI.

const scored = (state: GameStateV7) =>
  chooseNormalCommandV7(viewOf(state)).candidates;
const unitScored = (state: GameStateV7, where: CoordV7) => {
  const id = unitAtV7(state, where).id;
  return scored(state).filter(
    (candidate) =>
      "unitId" in candidate.command && candidate.command.unitId === id,
  );
};
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const produced = (state: GameStateV7): readonly CommandV7[] =>
  scored(state)
    .map((candidate) => candidate.command)
    .filter(
      (command) => command.kind === "TRAIN" || command.kind === "LAY_EGG",
    );

describe("the Dinosaur pass: Dinosaur seats play the army rules", () => {
  it("counts a Dinosaur seat among the army factions, with its own order and shares", () => {
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`).
      "ICE_FOLK",
      // Step two of the Dwarf pass (`pulp_wars-w49.28`).
      "DWARF",
      // The Candy army seat (`pulp_wars-jdb.13`).
      "CANDY",
    ]);
    expect(armyPlayFactionV7("DINOSAUR")).toBe(true);
    // (An army faction too since the Candy army seat, `pulp_wars-jdb.13`.)
    expect(armyPlayFactionV7("CANDY")).toBe(true);
    // Ankylosaurus, Spitter, Raptor, Triceratops, Stegosaurus, Shaman,
    // T-Rex (the ninth unit, 7r55: the Triceratops is the heavy role and
    // the Stegosaurus the siege role; step two of the Dinosaur pass,
    // `pulp_wars-w49.26`: the Spitter and the Raptor before the
    // Triceratops, which was second).
    expect(ARMY_RESEARCH_ROLES_V7.DINOSAUR).toEqual([
      "GUARD",
      "MARKSMAN",
      "RAIDER",
      "SWORDSMAN",
      "CATAPULT",
      "CAPTAIN",
      "KNIGHT",
    ]);
    // The Human order is as the Martian pass left it; the Martian order
    // has the Brain third and the Shock Trooper after it (step two of the
    // Martian pass, `pulp_wars-w49.25`; the Trooper followed the Ray Gunner
    // from 7r55).
    expect(ARMY_RESEARCH_ROLES_V7.ORIGINAL).toEqual([
      "MARKSMAN",
      "GUARD",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
      "CAPTAIN",
    ]);
    expect(ARMY_RESEARCH_ROLES_V7.MARTIAN).toEqual([
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "SWORDSMAN",
      "CATAPULT",
      "RAIDER",
      "KNIGHT",
    ]);
    // 7r55: the Triceratops is a line unit, so its share went to the line
    // (30 + 20 less the Stegosaurus's 10).
    expect(armySharesV7("DINOSAUR", false)).toEqual({
      LINE: 40,
      DEFENDER: 25,
      RANGED: 15,
      SIEGE: 10,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("DINOSAUR", true)).toEqual({
      LINE: 30,
      DEFENDER: 20,
      RANGED: 15,
      SIEGE: 10,
      BREAKTHROUGH: 25,
    });
    expect([
      ARMY_DINOSAUR_SKIRMISHER_PER_UNITS_V7,
      ARMY_DINOSAUR_SKIRMISHER_MAXIMUM_V7,
      ARMY_NESTING_DEFENDERS_V7,
      ARMY_WALLBREAKER_CHARGERS_V7,
      ARMY_DINOSAUR_STURDY_V7,
    ]).toEqual([4, 3, 1, 2, 15]);
    // The Triceratops fights in the line and, since 7r55, is a `LINE`
    // role: it is counted in the line share. Every role's share class is
    // the class it fights as.
    expect(armyClassV7(effectiveRoleRuleV7("SWORDSMAN", "DINOSAUR"))).toBe(
      "LINE",
    );
    expect(armyShareClassV7(effectiveRoleRuleV7("SWORDSMAN", "DINOSAUR"))).toBe(
      "LINE",
    );
    // (Step two of the Ice Folk pass, `pulp_wars-w49.27`: the Boulder Yeti
    // has the siege share of an Ice Folk army and fights as a ranged unit:
    // it moves and throws in one turn, from one or two tiles.)
    for (const faction of ARMY_PLAY_FACTIONS_V7)
      for (const role of ROSTER) {
        const rule = effectiveRoleRuleV7(role, faction);
        if (faction === "ICE_FOLK" && role === "CATAPULT") continue;
        expect(armyShareClassV7(rule), `${faction} ${role}`).toBe(
          armyClassV7(rule),
        );
      }
    for (const faction of ARMY_PLAY_FACTIONS_V7) {
      const rule = effectiveRoleRuleV7("CATAPULT", faction);
      expect(armyShareClassV7(rule), faction).toBe("SIEGE");
      expect(armyClassV7(rule), faction).toBe(
        faction === "ICE_FOLK" ? "RANGED" : "SIEGE",
      );
    }
  });

  it("is on in a match of Humans, Goblins, Undead, Martians, and Dinosaurs, and with every other faction since", () => {
    const pieces = [own("FIGHTER", 8, 7), foe("FIGHTER", 2, 7)];
    for (const opponent of [
      "ORIGINAL",
      "GOBLIN",
      "UNDEAD",
      "MARTIAN",
    ] as const) {
      expect(
        inspectNormalArmyV7(viewOf(asDinosaur(pieces, {}, opponent))).army,
        opponent,
      ).toBe(true);
      // The other seat of the same match plays them too.
      expect(
        inspectNormalArmyV7(viewOf(againstDinosaur(pieces, {}, opponent))).army,
        opponent,
      ).toBe(true);
    }
    // (Against an Ice Folk seat too since step two of the Ice Folk pass,
    // `pulp_wars-w49.27`, and a Dwarf seat since step two of the Dwarf
    // pass, `pulp_wars-w49.28`.)
    for (const opponent of ["ICE_FOLK", "DWARF"] as const)
      expect(
        inspectNormalArmyV7(viewOf(asDinosaur(pieces, {}, opponent))).army,
        opponent,
      ).toBe(true);
    // (And with a Candy seat since the Candy army seat, `pulp_wars-jdb.13`:
    // it was off, for both seats.)
    expect(
      inspectNormalArmyV7(viewOf(asDinosaur(pieces, {}, "CANDY"))).army,
    ).toBe(true);
  });

  /** The research target of a Dinosaur seat with these technologies. */
  const research = (
    techs: readonly TechnologyIdV7[],
    extra: readonly GoblinPieceV7[] = [],
  ) =>
    inspectNormalArmyV7(
      viewOf(
        asDinosaur([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2), ...extra], {
          techs: { 0: techs, 1: [] },
          coins: 40,
        }),
      ),
    ).research;

  it("researches the Ankylosaurus, the Spitter, the Raptor, the Triceratops, the Stegosaurus, the Shaman, Planning, the T-Rex", () => {
    // The field's land has nothing to build on, so the order alone decides.
    const order: TechnologyIdV7[] = [];
    let owned: readonly TechnologyIdV7[] = techsOf("GATHERING");
    for (let step = 0; step < 13; step += 1) {
      const next = research(owned);
      if (next === null) break;
      order.push(next.tech);
      owned = techsOf(...owned, next.tech);
    }
    // The ninth unit (7r55): the Triceratops is at Metallurgy, behind
    // Drill and Engineering, and the Stegosaurus at Sawmilling follows the
    // Spitter.
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Ankylosaurus
    // is at Nesting (Fortification), one technology behind the root.
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Spitter
    // (Hunting, Spitters) and the Raptor (Scouting) before the
    // Triceratops's Engineering and Armoury.
    expect(order).toEqual([
      "DRILL",
      "FORTIFICATION",
      "HUNTING",
      "MARKSMANSHIP",
      "SCOUTING",
      "ENGINEERING",
      "METALLURGY",
      "FORESTRY",
      "SAWMILLING",
      "ADMINISTRATION",
      // A unit slot in every city before the unit that fills two.
      "PLANNING",
      "RAIDING",
      "CHIVALRY",
    ]);
    expect(research(techsOf("GATHERING"))).toMatchObject({
      tech: "DRILL",
      unlocks: null,
    });
    expect(research(techsOf("GATHERING", "DRILL"))).toMatchObject({
      tech: "FORTIFICATION",
      unlocks: "GUARD",
    });
    expect(
      research(
        techsOf(
          "GATHERING",
          "DRILL",
          "FORTIFICATION",
          "HUNTING",
          "MARKSMANSHIP",
          "SCOUTING",
          "ENGINEERING",
        ),
      ),
    ).toMatchObject({ tech: "METALLURGY", unlocks: "SWORDSMAN" });
  });

  it("researches Nesting once it fields an Ankylosaurus, and Wallbreaker with two Triceratops", () => {
    // The Industry reshuffle (7r56): Nesting is the Ankylosaurus's own
    // technology, so the order reaches it before one is fielded; a seat
    // that fields one without it (a unit it was given) researches it too.
    const early = techsOf("GATHERING", "DRILL");
    expect(research(early)).toMatchObject({
      tech: "FORTIFICATION",
      unlocks: "GUARD",
    });
    expect(research(early, [own("GUARD", 7, 7)])).toMatchObject({
      tech: "FORTIFICATION",
    });
    // (Step two of the Dinosaur pass: then the Spitter's Hunting; it was
    // the Triceratops's Engineering.)
    expect(research(techsOf(...early, "FORTIFICATION"))).toMatchObject({
      tech: "HUNTING",
    });
    const late = techsOf(
      "GATHERING",
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
      "FORTIFICATION",
      "HUNTING",
      "FORESTRY",
      "SAWMILLING",
      "SCOUTING",
      "MARKSMANSHIP",
      "ADMINISTRATION",
    );
    expect(research(late, [own("SWORDSMAN", 7, 7)])).toMatchObject({
      tech: "PLANNING",
    });
    expect(
      research(techsOf(...late, "PLANNING"), [own("SWORDSMAN", 7, 7)]),
    ).toMatchObject({ tech: "RAIDING" });
    // Wallbreaker goes before Planning.
    expect(
      research(late, [own("SWORDSMAN", 7, 7), own("SWORDSMAN", 9, 7)]),
    ).toMatchObject({ tech: "EXPLOSIVES" });
  });

  it("researches its slot technologies when no city has room for a unit of two slots", () => {
    expect([
      ARMY_DINOSAUR_CROWDED_UNITS_V7,
      ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7,
    ]).toEqual([4, 2]);
    // The level-1 capital's two slots are full: four units, three Coins'
    // worth of room for none.
    const crowd = [
      own("FIGHTER", 8, 8),
      own("FIGHTER", 7, 7),
      own("FIGHTER", 9, 7),
      own("GUARD", 7, 9),
    ];
    const early = techsOf("GATHERING", "DRILL", "HUNTING");
    // Uncrowded (one unit), the next technology is the order's (Nesting,
    // for the Ankylosaurus, since the Industry reshuffle).
    expect(research(early)).toMatchObject({
      tech: "FORTIFICATION",
      growth: false,
    });
    expect(research(early, crowd.slice(1))).toMatchObject({
      tech: "FORTIFICATION",
      growth: true,
    });
    // Then the order again, up to the Triceratops (the first unit of two
    // slots), and then Planning, through Administration. (Step two of the
    // Dinosaur pass: the order's next step is the Spitter's technology; it
    // was the Triceratops's Engineering.)
    const nested = techsOf(...early, "FORTIFICATION");
    expect(research(nested, crowd.slice(1))).toMatchObject({
      tech: "MARKSMANSHIP",
      growth: false,
    });
    const charging = techsOf(...nested, "ENGINEERING", "METALLURGY");
    expect(research(charging, crowd.slice(1))).toMatchObject({
      tech: "ADMINISTRATION",
      growth: true,
    });
    expect(
      research(techsOf(...charging, "ADMINISTRATION"), crowd.slice(1)),
    ).toMatchObject({ tech: "PLANNING", growth: true });
    // A war does not hold it: with a Swordsman two tiles from the capital
    // and nothing to produce, the seat researches Nesting.
    const war = asDinosaur([...crowd, foe("SWORDSMAN", 6, 8)], {
      techs: { 0: early, 1: [] },
      coins: 12,
    });
    expect(scored(war).map((candidate) => candidate.command)).toContainEqual({
      kind: "RESEARCH",
      tech: "FORTIFICATION",
    });
  });

  it("researches at war with the Coins left over after the dearest Egg on offer", () => {
    // A Swordsman three tiles from the capital; Engineering (7 Coins with one
    // city since the economy rejig, `pulp_wars-w49.16`; 10 as the fifth
    // technology before) is the next technology and not due; the dearest
    // production on offer is an Ankylosaurus Egg (5 Coins).
    // (Two more Cavemen without a home city: the Ankylosaurus is under its
    // cap and the capital has room.)
    const at_war = (coins: number) => {
      const state = asDinosaur(
        [
          own("FIGHTER", 8, 8),
          own("GUARD", 7, 8),
          own("FIGHTER", 9, 9),
          own("FIGHTER", 9, 7),
          foe("FIGHTER", 5, 8),
        ],
        {
          // (Step two of the Dinosaur pass, `pulp_wars-w49.26`: the seat
          // owns Spitters and Scouting too, so that Engineering is still
          // its next technology. Spitters itself, one step to a class the
          // army has none of, is not held by a war.)
          techs: {
            0: techsOf(
              "GATHERING",
              "DRILL",
              "FORTIFICATION",
              "HUNTING",
              "MARKSMANSHIP",
              "SCOUTING",
            ),
            1: [],
          },
          coins,
        },
      );
      return scored({
        ...state,
        units: state.units.map((unit) =>
          unit.at.x === 9 ? { ...unit, homeCityId: null } : unit,
        ),
      }).map((candidate) => candidate.command);
    };
    for (const coins of [8, 10, 11]) {
      expect(at_war(coins), String(coins)).toContainEqual(
        expect.objectContaining({ kind: "LAY_EGG", role: "GUARD" }),
      );
      expect(at_war(coins), String(coins)).not.toContainEqual(
        expect.objectContaining({ kind: "RESEARCH" }),
      );
    }
    for (const coins of [12, 30])
      expect(at_war(coins), String(coins)).toContainEqual({
        kind: "RESEARCH",
        tech: "ENGINEERING",
      });
  });

  // The reward ladder rework (`pulp_wars-zypi`): Scouts is a level-3
  // reward, beside Walls, and every seat of the Normal AI takes it for a
  // city that is not threatened (the Dinosaur pass took it at level 2).
  it("takes Scouts at level 3 whatever its Coins, for the free Raptor", () => {
    const choice = (opponent: FactionIdV7, coins: number) => {
      const state = asDinosaur(
        [own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2)],
        { coins },
        opponent,
      );
      const capital = state.cities.find(
        (city) => city.at.x === 8 && city.at.y === 8,
      );
      if (capital === undefined) throw new Error("capital missing");
      const pending: GameStateV7 = {
        ...state,
        cities: state.cities.map((city) =>
          city.id === capital.id
            ? {
                ...city,
                level: 3,
                rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
              }
            : city,
        ),
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: capital.id,
            reachedLevel: 3,
            candidates: ["SURVEY", "WALLS"],
          },
        ],
      };
      return scored(pending)
        .map((candidate) => candidate.command)
        .find((command) => command.kind === "CHOOSE_CITY_REWARD");
    };
    for (const coins of [0, 3, 20])
      expect(choice("ORIGINAL", coins), String(coins)).toMatchObject({
        reward: "SURVEY",
      });
    // So does a Dinosaur seat that plays no army rules (against a Candy
    // seat since step two of the Dwarf pass, `pulp_wars-w49.28`).
    expect(choice("CANDY", 0)).toMatchObject({ reward: "SURVEY" });
    expect(choice("CANDY", 20)).toMatchObject({ reward: "SURVEY" });
  });

  it("buys one growth technology after the Ankylosaurus's and before the Triceratops's (economy first)", () => {
    const base = asDinosaur([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2)], {
      techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
      coins: 40,
    });
    const state = patchTileV7(base, at(9, 9), { resource: "FERTILE_GROUND" });
    expect(inspectNormalArmyV7(viewOf(state)).research).toMatchObject({
      tech: "FARMING",
      growth: true,
    });
    // Before the Ankylosaurus's technology the order comes first.
    const early: GameStateV7 = {
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? { ...player, researchedTechs: techsOf("GATHERING") }
          : player,
      ),
    };
    expect(inspectNormalArmyV7(viewOf(early)).research).toMatchObject({
      tech: "DRILL",
      growth: false,
    });
  });

  it("fields three tenths Triceratops, a quarter Ankylosauruses, a fifth Cavemen, a Raptor for four units", () => {
    const counts = (
      byClass: Partial<ArmyCountsV7["byClass"]>,
    ): ArmyCountsV7 => {
      const full = {
        LINE: 0,
        DEFENDER: 0,
        RANGED: 0,
        SIEGE: 0,
        BREAKTHROUGH: 0,
        SKIRMISHER: 0,
        SUPPORT: 0,
        ...byClass,
      };
      return {
        total: Object.values(full).reduce((sum, value) => sum + value, 0),
        byClass: full,
        hostileFragile: 0,
      };
    };
    const order = (
      army: ArmyCountsV7,
      threatened: boolean,
    ): readonly UnitRoleIdV7[] =>
      (
        [
          "FIGHTER",
          "RAIDER",
          "MARKSMAN",
          "GUARD",
          "CAPTAIN",
          "CATAPULT",
          "SWORDSMAN",
          "KNIGHT",
        ] as const
      )
        .map(
          (role) =>
            [
              role,
              armyRoleScoreV7("DINOSAUR", role, army, threatened),
            ] as const,
        )
        .sort((left, right) => right[1] - left[1])
        .map(([role]) => role);
    // Four Cavemen: the T-Rex first (the dearest unit the army is short
    // of), then with one the Triceratops, then with two of those the
    // Ankylosaurus; a Caveman comes last.
    const cavemen = counts({ LINE: 4 });
    expect(order(cavemen, false)[0]).toBe("KNIGHT");
    const withRex = counts({ LINE: 4, BREAKTHROUGH: 1 });
    // 7r55: the Triceratops is a line unit, so four Cavemen fill the line
    // and the Ankylosaurus comes next; an army without a line wants the
    // Triceratops, the dearer line unit.
    expect(order(withRex, false)[0]).toBe("GUARD");
    expect(
      order(counts({ DEFENDER: 3, RANGED: 2, BREAKTHROUGH: 1 }), false)[0],
    ).toBe("SWORDSMAN");
    const withBoth = counts({ LINE: 4, BREAKTHROUGH: 1, SIEGE: 2 });
    expect(order(withBoth, false)[0]).toBe("GUARD");
    expect(order(withBoth, false).indexOf("MARKSMAN")).toBeLessThan(
      order(withBoth, false).indexOf("FIGHTER"),
    );
    // An army of dinosaurs wants its fifth of Cavemen: with eight units
    // and none, a Caveman's score is that of a unit the army is short of.
    const beasts = counts({ DEFENDER: 3, RANGED: 2, SIEGE: 3 });
    expect(
      armyRoleScoreV7("DINOSAUR", "FIGHTER", beasts, false),
    ).toBeGreaterThan(armyRoleScoreV7("DINOSAUR", "GUARD", beasts, false));
    // One Raptor per four units, three at most.
    expect(
      armyRoleScoreV7("DINOSAUR", "RAIDER", counts({ LINE: 4 }), false),
    ).toBeGreaterThan(0);
    expect(
      armyRoleScoreV7("DINOSAUR", "RAIDER", counts({ LINE: 3 }), false),
    ).toBeLessThan(10);
    expect(
      armyRoleScoreV7(
        "DINOSAUR",
        "RAIDER",
        counts({ LINE: 17, SKIRMISHER: 3 }),
        false,
      ),
    ).toBeLessThan(10);
    // A threatened or frontier center: the Ankylosaurus first, the T-Rex
    // last; the Triceratops is no siege unit to be kept from it.
    const mixed = counts({ LINE: 4, DEFENDER: 1, RANGED: 1 });
    expect(order(mixed, true)[0]).toBe("GUARD");
    expect(armyRoleScoreV7("DINOSAUR", "KNIGHT", mixed, true)).toBe(
      armyRoleScoreV7("DINOSAUR", "KNIGHT", mixed, false) - 400,
    );
    // (7r55: a line unit now, it is wanted there like any line unit.)
    expect(
      armyRoleScoreV7("DINOSAUR", "SWORDSMAN", mixed, true),
    ).toBeGreaterThanOrEqual(
      armyRoleScoreV7("DINOSAUR", "SWORDSMAN", mixed, false),
    );
    // A Human seat's Catapult is still kept from one.
    expect(armyRoleScoreV7("ORIGINAL", "CATAPULT", mixed, true)).toBe(
      armyRoleScoreV7("ORIGINAL", "CATAPULT", mixed, false) - 200,
    );
  });

  it("counts an own Egg as the unit inside", () => {
    const state = asDinosaur([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 2)], {
      eggs: [
        { seat: 0, role: "GUARD", at: at(9, 7) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 7) },
      ],
    });
    const view = viewOf(state);
    const counts = armyCountsV7(
      view,
      (unit) => unit.ownerId !== view.viewer.id,
    );
    expect(counts.total).toBe(3);
    // The Triceratops Egg is a line unit since 7r55.
    expect(counts.byClass).toMatchObject({ LINE: 2, DEFENDER: 1, SIEGE: 0 });
  });

  /** A capital with a Caveman on it and a far Human unit. */
  const capital = (coins: number, enemyAt: CoordV7 = at(2, 2)) =>
    asDinosaur([own("FIGHTER", 8, 8), foe("FIGHTER", enemyAt.x, enemyAt.y)], {
      coins,
    });

  it("lays the Egg its army lacks with the center held, and keeps its garrison on it", () => {
    expect(produced(capital(5))).toMatchObject([
      { kind: "LAY_EGG", role: "GUARD" },
    ]);
    // 7r55: a lone Caveman is the whole line, so 8 Coins lay the
    // Stegosaurus (7 Coins, the dearest unit the army is short of), not
    // the Triceratops, which is a line unit now.
    expect(produced(capital(8))).toMatchObject([
      { kind: "LAY_EGG", role: "CATAPULT" },
    ]);
    expect(produced(capital(14))).toMatchObject([
      { kind: "LAY_EGG", role: "KNIGHT" },
    ]);
    // The production is an army seat's, before research and construction.
    const egg = scored(capital(8)).find(
      (candidate) => candidate.command.kind === "LAY_EGG",
    );
    expect(egg?.score.priority).toBe(ARMY_TRAINING_PRIORITY_V7);
    // The Caveman does not step off the center to let the city train: the
    // city lays beside it.
    const garrison = unitAtV7(capital(8), at(8, 8)).id;
    const steps = (coins: number): boolean =>
      scored(capital(coins)).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.unitId === garrison &&
          candidate.score.priority > ARMY_TRAINING_PRIORITY_V7,
      );
    expect(steps(8)).toBe(false);
    // With the Coins for a Caveman only (no Egg is on offer) it steps
    // aside as every army seat's garrison does, and the city trains.
    expect(steps(2)).toBe(true);
    // The garrison stays for the Egg the city lays, not for one merely
    // offered: with two shooters on the center the policy lays none there,
    // and the rule that keeps the garrison does not apply.
    const shot = asDinosaur(
      [
        own("FIGHTER", 8, 8),
        foe("MARKSMAN", 6, 8),
        foe("MARKSMAN", 6, 7),
        foe("KNIGHT", 5, 8),
      ],
      { coins: 30 },
    );
    expect(produced(shot)).toEqual([]);
    expect(
      queryPlayerCommandsV7(viewOf(shot)).some(
        (command) => command.kind === "LAY_EGG",
      ),
    ).toBe(true);
  });

  it("trains a Caveman onto the empty center of a threatened city, not an Egg", () => {
    const state = asDinosaur(
      [own("FIGHTER", 10, 10), foe("FIGHTER", 6, 8), foe("FIGHTER", 6, 7)],
      { coins: 30 },
    );
    expect(produced(state)).toMatchObject([{ kind: "TRAIN", role: "FIGHTER" }]);
    // With the center held it lays the Ankylosaurus, never the T-Rex.
    const held = asDinosaur(
      [own("FIGHTER", 8, 8), foe("FIGHTER", 6, 8), foe("FIGHTER", 6, 7)],
      { coins: 30 },
    );
    expect(produced(held)).toMatchObject([{ kind: "LAY_EGG", role: "GUARD" }]);
  });
});

describe("the Dinosaur pass: the Normal AI's units", () => {
  const egg = [{ seat: 0, role: "KNIGHT", at: at(9, 7) }] as const;
  const camp = [
    own("FIGHTER", 5, 5),
    own("FIGHTER", 8, 5),
    own("FIGHTER", 5, 8),
  ] as const;

  it("still guards an Egg an enemy can reach, and hatches one with its Shaman", () => {
    const state = asDinosaur(
      [...camp, own("FIGHTER", 10, 9), foe("FIGHTER", 10, 4)],
      { eggs: egg, coins: 0 },
    );
    const best = unitScored(state, at(10, 9))[0];
    expect(best?.score.priority).toBe(EGG_GUARD_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 0 : gap(end, at(9, 7))).toBe(1);
    const shaman = asDinosaur([own("CAPTAIN", 10, 8), foe("FIGHTER", 2, 2)], {
      eggs: egg,
      coins: 0,
    });
    expect(unitScored(shaman, at(10, 8))[0]).toMatchObject({
      command: { kind: "HATCH" },
      score: { priority: HATCH_PRIORITY_V7 },
    });
  });

  it("still takes a grown, wounded unit out of the enemy's reach", () => {
    const state = withKillsV7(
      asDinosaur([own("RAIDER", 3, 3), foe("FIGHTER", 5, 3)], { coins: 0 }),
      at(3, 3),
      1,
      5,
    );
    const best = unitScored(state, at(3, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(GROWN_RETREAT_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 0 : gap(end, at(5, 3))).toBeGreaterThan(2);
  });

  it("walks a Triceratops into contact as a committed unit, and steps round for the run-up that kills", () => {
    const approach = asDinosaur(
      [own("SWORDSMAN", 3, 3), foe("FIGHTER", 5, 3)],
      {
        coins: 0,
      },
    );
    const move = unitScored(approach, at(3, 3))[0];
    expect(move?.command.kind).toBe("MOVE");
    expect(move?.score.priority).toBe(ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7);
    const end = move === undefined ? undefined : endOf(move.command);
    expect(end === undefined ? 0 : gap(end, at(5, 3))).toBe(1);
    // Beside a Fighter already: unmoved the Charge deals 8; after one tile
    // it kills. The step comes first.
    const beside = asDinosaur([own("SWORDSMAN", 3, 3), foe("FIGHTER", 4, 3)], {
      coins: 0,
    });
    expect(unitScored(beside, at(3, 3))[0]).toMatchObject({
      command: { kind: "MOVE" },
      score: { priority: CHARGE_RUN_UP_KILL_PRIORITY_V7 },
    });
  });

  it("values an Ankylosaurus's Move beside the units a Knight kills", () => {
    // Two Cavemen and a Spitter in a group; a Human Knight in sight. The
    // Ankylosaurus's Move next to them is worth more than one away.
    const state = asDinosaur(
      [
        own("GUARD", 8, 3),
        own("FIGHTER", 6, 2),
        own("FIGHTER", 6, 4),
        own("MARKSMAN", 7, 4),
        foe("KNIGHT", 1, 3),
      ],
      { coins: 0 },
    );
    const moves = unitScored(state, at(8, 3)).filter(
      (candidate) => candidate.command.kind === "MOVE",
    );
    const value = (to: CoordV7): number =>
      moves.find((candidate) => {
        const end = endOf(candidate.command);
        return end !== undefined && same(end, to);
      })?.score.strategicValue ?? Number.NaN;
    // (7, 3) touches both Cavemen and the Spitter (two count); (7, 2)
    // touches one Caveman.
    expect(endOf(moves[0]?.command ?? { kind: "END_TURN" })).toEqual(at(7, 3));
    expect(value(at(7, 3)) - value(at(7, 2))).toBeGreaterThanOrEqual(
      ARMY_ESCORT_VALUE_V7,
    );
  });

  it("makes the older research rule and its Wallbreaker value a seat's that plays no army rules", () => {
    expect(WALLBREAKER_CHARGER_VALUE_V7).toBe(6);
    const state = (opponent: FactionIdV7) =>
      asDinosaur(
        [own("SWORDSMAN", 7, 7), foe("FIGHTER", 2, 2)],
        { techs: { 0: NO_WALLBREAKER }, coins: 60 },
        opponent,
      );
    const wallbreaker = (opponent: FactionIdV7) =>
      scored(state(opponent)).find(
        (candidate) =>
          candidate.command.kind === "RESEARCH" &&
          candidate.command.tech === "EXPLOSIVES",
      );
    // Against a Candy seat (a Dwarf one before step two of the Dwarf pass,
    // `pulp_wars-w49.28`): the Industry rule, now also for a Triceratops.
    // Since the Candy army seat (`pulp_wars-jdb.13`) no match is outside the
    // army rules by its factions: the older rule is reached with the Candy
    // taken out of the army factions (tests/fixtures/v7-older-policy.ts).
    expect(
      withCandyOnOlderPolicyV7(() => wallbreaker("CANDY"))?.score,
    ).toMatchObject({
      priority: 1061,
      strategicValue: WALLBREAKER_CHARGER_VALUE_V7,
    });
  });
});

describe("the Dinosaur pass: LAB_DINOSAUR_MID", () => {
  it("stages the Dinosaurs for the hand player with every unit on offer, grown units, and an Egg", () => {
    const mission = missionByIdV7("LAB_DINOSAUR_MID");
    if (mission === null) throw new Error("lab missing");
    expect(mission.hidden).toBe(true);
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    expect(setup.factions).toEqual(["DINOSAUR", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.viewer.faction).toBe("DINOSAUR");
    const count = (seat: number): Record<string, number> => {
      const owner = state.players.find((player) => player.seat === seat);
      const counts: Record<string, number> = {};
      for (const unit of state.units)
        if (unit.ownerId === owner?.id) {
          const key = unit.form === "EGG" ? `${unit.role} EGG` : unit.role;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      return counts;
    };
    // 3 Cavemen, 2 Raptors, 2 Spitters, 2 Ankylosauruses, a Shaman, 2
    // Triceratops: 12 units, and a T-Rex Egg.
    expect(count(0)).toEqual({
      CAPTAIN: 1,
      "KNIGHT EGG": 1,
      GUARD: 2,
      FIGHTER: 3,
      RAIDER: 2,
      MARKSMAN: 2,
      SWORDSMAN: 2,
    });
    // The Human side of the other labs: 17 units.
    expect(count(1)).toEqual({
      GUARD: 2,
      CATAPULT: 2,
      KNIGHT: 2,
      FIGHTER: 5,
      MARKSMAN: 3,
      SWORDSMAN: 3,
    });
    const worth = (seat: number, faction: FactionIdV7): number => {
      const owner = state.players.find((player) => player.seat === seat);
      return state.units
        .filter((unit) => unit.ownerId === owner?.id)
        .reduce(
          (total, unit) =>
            total + (effectiveRoleRuleV7(unit.role, faction).cost ?? 0),
          0,
        );
    };
    expect([worth(0, "DINOSAUR"), worth(1, "ORIGINAL")]).toEqual([67, 80]);
    // One Big Raptor, one Big Spitter, one Big Triceratops.
    const own0 = state.units.filter(
      (unit) => unit.ownerId === state.humanPlayerId,
    );
    expect(
      own0
        .filter((unit) => unit.kills > 0)
        .map((unit) => [unit.role, unit.kills, unit.hp, unit.maxHp])
        .sort(),
    ).toEqual([
      ["MARKSMAN", 1, 14, 14],
      ["RAIDER", 1, 16, 16],
      ["SWORDSMAN", 1, 24, 24],
    ]);
    // The T-Rex Egg: beside the capital, two turns from hatching, the
    // Shaman next to it and able to hatch it on the first turn.
    const eggUnit = own0.find((unit) => unit.form === "EGG");
    if (eggUnit === undefined) throw new Error("no Egg");
    // (Revision 3 of the lab, 7r56: the seat owns Nesting, so the Egg has
    // 4 more HP.)
    expect(eggUnit).toMatchObject({ role: "KNIGHT", hp: 10, maxHp: 10 });
    expect(state.eggs).toEqual([
      { unitId: eggUnit.id, turnsRemaining: 2, laidThisTurn: false },
    ]);
    const offered = queryPlayerCommandsV7(view);
    expect(offered).toContainEqual(
      expect.objectContaining({ kind: "HATCH", eggUnitId: eggUnit.id }),
    );
    const cities = (seat: number): number[] => {
      const owner = state.players.find((player) => player.seat === seat);
      return state.cities
        .filter((city) => city.ownerId === owner?.id)
        .map((city) => city.level);
    };
    expect(cities(0)).toEqual([4, 3, 3, 2, 2]);
    expect(cities(1)).toEqual([4, 3, 3, 2, 2]);
    // 35 Coins in hand on the first turn; thirteen technologies (revision 2
    // of the lab, 7r55: Engineering and Metallurgy, for the Triceratops;
    // revision 3, 7r56, the Industry reshuffle: Nesting, for the
    // Ankylosaurus), without Wallbreaker and Farming.
    expect(view.viewer.coins).toBe(35);
    expect(view.viewer.researchedTechs).toHaveLength(13);
    expect(view.viewer.researchedTechs).toContain("FORTIFICATION");
    for (const tech of ["EXPLOSIVES", "FARMING"] as const)
      expect(view.viewer.researchedTechs).not.toContain(tech);
    // Eight free slots since revision 3 (Nesting is one more in every
    // city): three in the capital, two in the northern level-3 city (a
    // Triceratops or a T-Rex Egg fits in those two), one in each other
    // city. (Three before: two in the capital, one in the northern city.)
    const laid = (role: UnitRoleIdV7): number =>
      new Set(
        offered.flatMap((command) =>
          command.kind === "LAY_EGG" && command.role === role
            ? [command.cityId]
            : [],
        ),
      ).size;
    expect(
      (["RAIDER", "MARKSMAN", "GUARD", "SWORDSMAN", "KNIGHT"] as const).map(
        laid,
      ),
    ).toEqual([5, 5, 5, 2, 2]);
    expect(
      [
        ...new Set(
          offered.flatMap((command) =>
            command.kind === "TRAIN" ? [command.role] : [],
          ),
        ),
      ].sort(),
    ).toEqual(["CAPTAIN", "FIGHTER"]);
    // The research the lab is about is on offer.
    expect(
      offered.flatMap((command) =>
        command.kind === "RESEARCH" ? [command.tech] : [],
      ),
    ).toEqual(expect.arrayContaining(["FARMING", "PLANNING", "EXPLOSIVES"]));
  });

  it("builds a mission unit's kills and an Egg only where the rules allow them", () => {
    const mission = missionByIdV7("LAB_DINOSAUR_MID");
    if (mission === null) throw new Error("lab missing");
    // No other registered mission uses either field.
    expect(
      mission.seats[0]?.units.filter(
        (unit) => unit.kills !== undefined || unit.egg !== undefined,
      ).length,
    ).toBe(4);
    expect(
      mission.seats[1]?.units.some(
        (unit) => unit.kills !== undefined || unit.egg !== undefined,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The correction after three hand-played games (the same bead and identity;
// docs/product/RULESET_7_TUNING_DINOSAUR.md section 13).
// ---------------------------------------------------------------------------

describe("the Dinosaur pass, correction: Nesting takes no turn off", () => {
  it("hatches every Egg in its base turns with and without Nesting", () => {
    const turns = (
      techs: readonly TechnologyIdV7[],
      role: UnitRoleIdV7,
    ): readonly [number | undefined, number | undefined] => {
      const state = asDinosaur([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 2)], {
        techs: { 0: techs, 1: [] },
      });
      const preview = previewLayEggV7(
        viewOf(state),
        cityOfV7(state, 0).id,
        role,
      );
      return [preview?.turnsToHatch, preview?.hp];
    };
    const every = (techs: readonly TechnologyIdV7[]) =>
      (["RAIDER", "MARKSMAN", "GUARD", "SWORDSMAN", "KNIGHT"] as const).map(
        (role) => turns(techs, role),
      );
    // Raptor 1, Spitter 1, Ankylosaurus 2, Triceratops 2, T-Rex 4.
    expect(every(dinosaurTechsWithoutV7("FORTIFICATION"))).toEqual([
      [1, 6],
      [1, 6],
      [2, 6],
      [2, 6],
      [4, 6],
    ]);
    // With Nesting the same turns (before the correction 1, 1, 1, 1, 3),
    // and the Egg's 10 HP.
    expect(every(TECHNOLOGY_IDS_V7)).toEqual([
      [1, 10],
      [1, 10],
      [2, 10],
      [2, 10],
      [4, 10],
    ]);
    expect(
      technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], "DINOSAUR"),
    ).toMatchObject({
      eggHatchTurnReduction: 0,
      eggHpBonus: 4,
      nestingCityCapacityBonus: 1,
    });
    expect(nestingUnlockTextV7()).toBe(
      "Eggs have +4 HP; +1 unit slot in every city",
    );
  });

  it("leaves the Shaman's Hatch as the way to speed an Egg, and says so", () => {
    const state = asDinosaur([own("CAPTAIN", 8, 7), foe("FIGHTER", 2, 2)], {
      eggs: [{ seat: 0, role: "SWORDSMAN", at: at(9, 7), turnsRemaining: 2 }],
    });
    const shaman = unitAtV7(state, at(8, 7));
    const egg = unitAtV7(state, at(9, 7));
    const hatched = applyOkV7(state, state.humanPlayerId, {
      kind: "HATCH",
      unitId: shaman.id,
      eggUnitId: egg.id,
    });
    expect(unitAtV7(hatched.state, at(9, 7))).toMatchObject({
      form: "LAND",
      role: "SWORDSMAN",
      hp: 20,
    });
    expect(HATCH_TOOLTIP_V7).toBe(
      "Uses the Shaman's action: an Egg next to it hatches now, whatever turns it had left (not on the turn it was laid). The new unit acts from your next turn.",
    );
    expect(dinosaurRecruitNotesV7("SWORDSMAN", "DINOSAUR")[0]).toBe(
      "Laid as an Egg next to the city; hatches after 2 turns (a Shaman can hatch it sooner).",
    );
  });
});

describe("the Dinosaur pass, correction: Tend Wounded heals a dinosaur 4", () => {
  it("heals a Triceratops 4 and a Caveman 2, as previewed", () => {
    expect(SHAMAN_TEND_DINOSAUR_V7).toBe(4);
    expect(roleMechanicsV7("CAPTAIN", "DINOSAUR").tendGrowingHeal).toBe(4);
    for (const faction of FACTION_IDS_V7)
      if (faction !== "DINOSAUR")
        expect(
          roleMechanicsV7("CAPTAIN", faction).tendGrowingHeal,
          faction,
        ).toBe(null);
    const state = asDinosaur([
      own("CAPTAIN", 5, 3),
      own("SWORDSMAN", 4, 3, { hp: 10 }),
      own("FIGHTER", 6, 3, { hp: 5 }),
      own("GUARD", 5, 2, { hp: 18 }),
      foe("FIGHTER", 2, 2),
    ]);
    const shaman = unitAtV7(state, at(5, 3));
    expect(
      previewTendWoundedV7(viewOf(state), shaman.id)?.results.map(
        (result) => result.amount,
      ),
    ).toEqual([4, 2, 2]);
    const tended = applyOkV7(state, state.humanPlayerId, {
      kind: "TEND_WOUNDED",
      unitId: shaman.id,
    }).state;
    expect(unitAtV7(tended, at(4, 3)).hp).toBe(14);
    expect(unitAtV7(tended, at(6, 3)).hp).toBe(7);
    // Never above the maximum.
    expect(unitAtV7(tended, at(5, 2)).hp).toBe(20);
    expect(shamanTendTextV7()).toBe(
      "Heals nearby wounded troops: a dinosaur by 4, a Caveman or a Shaman by 2.",
    );
    expect(dinosaurAbilityDescriptionV7("TEND_WOUNDED", "DINOSAUR")).toBe(
      shamanTendTextV7(),
    );
    // A Human Captain heals 2 as before.
    const human = againstDinosaur([
      own("CAPTAIN", 5, 3),
      own("KNIGHT", 4, 3, { hp: 5 }),
      foe("FIGHTER", 2, 2),
    ]);
    expect(
      previewTendWoundedV7(viewOf(human), unitAtV7(human, at(5, 3)).id)
        ?.results[0]?.amount,
    ).toBe(2);
  });
});

describe("the Dinosaur pass, correction: Pack Hunt against a hunted unit", () => {
  /** A Spitter two tiles from a Swordsman, a Caveman on its other side. */
  const hunt = () =>
    asDinosaur([
      own("MARKSMAN", 3, 3),
      own("FIGHTER", 6, 3),
      foe("SWORDSMAN", 5, 3),
      foe("FIGHTER", 2, 8),
    ]);

  it("marks the unit a dinosaur attacked, for the Caveman that attacks after it", () => {
    const start = hunt();
    expect(start.huntedThisTurn).toEqual([]);
    // No dinosaur stands next to the Swordsman: no bonus.
    expect(previewAt(start, at(6, 3), at(5, 3))).toMatchObject({
      attack2: 4,
      damageToDefender: 4,
    });
    const shot = attackV7(start, at(3, 3), at(5, 3)).state;
    const swordsman = unitAtV7(shot, at(5, 3));
    expect(shot.huntedThisTurn).toEqual([swordsman.id]);
    expect(viewOf(shot).huntedThisTurn).toEqual([swordsman.id]);
    const preview = previewAt(shot, at(6, 3), at(5, 3));
    expect(preview.attack2).toBe(4 + CAVEMAN_PACK_HUNT_BONUS2_V7);
    // The attack resolves as previewed.
    const struck = attackV7(shot, at(6, 3), at(5, 3));
    expect(struck.events[0]).toMatchObject({
      kind: "COMBAT_RESOLVED",
      preview: { damageToDefender: preview.damageToDefender },
    });
    // The preview line and the harness name it.
    expect(chargePreviewLinesV7(viewOf(shot), preview)).toContain(
      "Pack Hunt +1",
    );
    expect(packHuntPreviewLineV7()).toBe("Pack Hunt +1");
  });

  it("is emptied at End Turn and drops a killed unit", () => {
    const shot = attackV7(hunt(), at(3, 3), at(5, 3)).state;
    const ended = applyOkV7(shot, shot.humanPlayerId, { kind: "END_TURN" });
    expect(ended.state.huntedThisTurn).toEqual([]);
    // A killed target is not listed.
    const weak = asDinosaur([
      own("MARKSMAN", 3, 3),
      foe("FIGHTER", 5, 3, { hp: 2 }),
      foe("FIGHTER", 2, 8),
    ]);
    expect(attackV7(weak, at(3, 3), at(5, 3)).state.huntedThisTurn).toEqual([]);
  });

  it("is a dinosaur's attack only: not a Caveman's, a Shaman's, or another faction's", () => {
    for (const role of ["FIGHTER", "CAPTAIN"] as const) {
      const state = asDinosaur([
        own(role, 4, 3),
        foe("SWORDSMAN", 5, 3),
        foe("FIGHTER", 2, 8),
      ]);
      expect(
        attackV7(state, at(4, 3), at(5, 3)).state.huntedThisTurn,
        role,
      ).toEqual([]);
    }
    for (const role of ["RAIDER", "GUARD", "SWORDSMAN", "KNIGHT"] as const) {
      const state = asDinosaur([
        own(role, 4, 3),
        foe("GUARD", 5, 3),
        foe("FIGHTER", 2, 8),
      ]);
      const after = attackV7(state, at(4, 3), at(5, 3)).state;
      expect(after.huntedThisTurn, role).toHaveLength(1);
    }
    const human = againstDinosaur([
      own("MARKSMAN", 3, 3),
      foe("GUARD", 5, 3),
      own("FIGHTER", 8, 2),
    ]);
    expect(attackV7(human, at(3, 3), at(5, 3)).state.huntedThisTurn).toEqual(
      [],
    );
    // The state check refuses an entry that is no unit on the board.
    expect(parseGameStateV7({ ...hunt(), huntedThisTurn: [999] })).toBeNull();
  });

  it("is counted for a hostile Caveman by the policy's estimate when its dinosaur is near", () => {
    // Seat 0 Human: a Fighter with a hostile Caveman beside it.
    const projected = (pieces: readonly GoblinPieceV7[]): number => {
      const state = againstDinosaur([
        own("FIGHTER", 5, 3),
        foe("FIGHTER", 6, 3),
        own("FIGHTER", 8, 8),
        ...pieces,
      ]);
      const view = viewOf(state);
      const unit = (where: CoordV7) => {
        const found = view.units.find((candidate) => same(candidate.at, where));
        if (found === undefined) throw new Error("unit missing");
        return found;
      };
      return publicProjectedDamageForPolicyV7(
        view,
        unit(at(6, 3)),
        unit(at(5, 3)),
        at(5, 3),
      );
    };
    expect(PACK_HUNT_ASSUMED_RADIUS_V7).toBe(3);
    // Alone the Caveman deals 5; with a Raptor three tiles from the
    // Fighter the estimate is the Pack Hunt hit, 8 (a hand player was told
    // "about 3-4" for a hit of 7 or 8).
    expect(projected([])).toBe(5);
    expect(projected([foe("RAIDER", 8, 3)])).toBe(8);
    expect(projected([foe("RAIDER", 9, 3)])).toBe(5);
    // A hostile Shaman or Egg near is no dinosaur.
    expect(projected([foe("CAPTAIN", 7, 3)])).toBe(5);
  });
});

describe("the Dinosaur pass, correction: the Chopping Block by name", () => {
  it("names the technology Timber and its building Chopping Block for a Dinosaur player", () => {
    expect(technologyNameV7("SAWMILLING", "DINOSAUR")).toBe("Timber");
    expect(technologyNameV7("SAWMILLING", "ORIGINAL")).toBe("Sawmilling");
    const text = (faction: FactionIdV7): readonly string[] => {
      const state = dinosaurFieldV7(
        [faction, faction === "DINOSAUR" ? "ORIGINAL" : "DINOSAUR"],
        [own("FIGHTER", 8, 7), foe("FIGHTER", 2, 7)],
      );
      const tree = queryTechnologyTreeV7(viewOf(state));
      const node = tree.nodes.find((item) => item.id === "SAWMILLING");
      if (node === undefined) throw new Error("node missing");
      return technologyEffectGroupsV7(node.effects, tree.faction).flatMap(
        (group) => group.items,
      );
    };
    expect(text("DINOSAUR")).toEqual(
      expect.arrayContaining([
        "Build Chopping Block",
        "Chopping Block: +1 per adjacent lumber camp",
      ]),
    );
    expect(text("DINOSAUR").join(" ")).not.toMatch(/[Ss]awmill/);
    expect(text("ORIGINAL")).toEqual(
      expect.arrayContaining([
        "Build sawmill",
        "Sawmill: +1 per adjacent lumber camp",
      ]),
    );
  });
});

describe("the Dinosaur pass, correction: the Dinosaur seat of the Normal AI", () => {
  const counts = (byClass: Partial<ArmyCountsV7["byClass"]>): ArmyCountsV7 => {
    const full = {
      LINE: 0,
      DEFENDER: 0,
      RANGED: 0,
      SIEGE: 0,
      BREAKTHROUGH: 0,
      SKIRMISHER: 0,
      SUPPORT: 0,
      ...byClass,
    };
    return {
      total: Object.values(full).reduce((sum, value) => sum + value, 0),
      byClass: full,
      hostileFragile: 0,
    };
  };

  it("caps its Ankylosauruses at a third of the army and at the units they screen", () => {
    expect([
      ARMY_DINOSAUR_DEFENDER_CAP_COST_V7,
      ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7,
    ]).toEqual([600, 7]);
    const capped = (byClass: Partial<ArmyCountsV7["byClass"]>): boolean =>
      armyDinosaurDefenderCappedV7(counts(byClass));
    // The first one is free; the second needs three other units.
    expect(capped({ LINE: 1 })).toBe(false);
    expect(capped({ LINE: 1, DEFENDER: 1 })).toBe(true);
    expect(capped({ LINE: 2, DEFENDER: 1 })).toBe(false);
    expect(capped({ LINE: 2, DEFENDER: 2 })).toBe(true);
    expect(capped({ LINE: 3, SIEGE: 2, DEFENDER: 2 })).toBe(false);
    expect(capped({ LINE: 3, SIEGE: 2, DEFENDER: 3 })).toBe(true);
    // Thirteen Ankylosauruses beside six other units, as the seat fielded.
    expect(capped({ LINE: 4, SIEGE: 2, DEFENDER: 13 })).toBe(true);
    // A capped Ankylosaurus scores below every other unit, on a threatened
    // center too (its garrison bonus is 200).
    const army = counts({ LINE: 2, DEFENDER: 2 });
    for (const threatened of [false, true])
      for (const role of ["FIGHTER", "MARKSMAN", "SWORDSMAN"] as const)
        expect(
          armyRoleScoreV7("DINOSAUR", "GUARD", army, threatened),
          `${role} ${String(threatened)}`,
        ).toBeLessThan(armyRoleScoreV7("DINOSAUR", role, army, threatened));
    // The other factions' defender has no cap.
    expect(armyRoleScoreV7("ORIGINAL", "GUARD", army, true)).toBeGreaterThan(
      armyRoleScoreV7("DINOSAUR", "GUARD", army, true) + 500,
    );
  });

  it("lays no second Ankylosaurus beside one Caveman, and no eighth before growth", () => {
    // A Caveman on the capital and an Ankylosaurus: the next Egg is not an
    // Ankylosaurus (it was, on a threatened center, turn after turn).
    const state = asDinosaur(
      [own("FIGHTER", 8, 8), own("GUARD", 7, 7), foe("FIGHTER", 6, 8)],
      {
        coins: 30,
        techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
      },
    );
    expect(
      produced(state).filter(
        (command) => command.kind === "LAY_EGG" && command.role === "GUARD",
      ),
    ).toEqual([]);
    // With two Cavemen beside it the second Ankylosaurus is laid.
    // (Only the garrison is homed, so the capital has room.)
    const three = asDinosaur(
      [
        own("FIGHTER", 8, 8),
        own("FIGHTER", 9, 9),
        own("GUARD", 7, 7),
        foe("FIGHTER", 6, 8),
      ],
      {
        coins: 30,
        techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
      },
    );
    const screened: GameStateV7 = {
      ...three,
      units: three.units.map((unit) =>
        same(unit.at, at(8, 8)) ? unit : { ...unit, homeCityId: null },
      ),
    };
    expect(produced(screened)).toMatchObject([
      { kind: "LAY_EGG", role: "GUARD" },
    ]);
    // Seven Ankylosauruses beside twenty other units are under the third,
    // but the eighth waits while the land offers growth.
    const many: GoblinPieceV7[] = [];
    for (let index = 0; index < 7; index += 1)
      many.push(own("GUARD", 3 + index, 1));
    for (let index = 0; index < 8; index += 1)
      many.push(own("FIGHTER", 2 + index, 3), own("SWORDSMAN", 2 + index, 4));
    for (let index = 0; index < 5; index += 1)
      many.push(own("MARKSMAN", 3 + index, 5));
    const homed = asDinosaur(
      [own("FIGHTER", 8, 8), ...many, foe("FIGHTER", 1, 9)],
      {
        coins: 30,
        // Nesting owned: the crowded seat has no slot technology to want.
        techs: {
          0: techsOf("GATHERING", "DRILL", "FORTIFICATION", "HUNTING"),
          1: [],
        },
      },
    );
    // The fixture homes every unit to the capital; these have no home, so
    // the capital has room.
    const base: GameStateV7 = {
      ...homed,
      units: homed.units.map((unit) =>
        same(unit.at, at(8, 8)) ? unit : { ...unit, homeCityId: null },
      ),
    };
    const lays = (state: GameStateV7): boolean =>
      produced(state).some(
        (command) => command.kind === "LAY_EGG" && command.role === "GUARD",
      );
    expect(armyCountsV7(viewOf(base), () => false).byClass.DEFENDER).toBe(7);
    expect(lays(base)).toBe(true);
    const growth = patchTileV7(base, at(9, 9), {
      terrain: "FOREST",
      resource: "GAME",
    });
    expect(lays(growth)).toBe(false);
  });

  it("makes no attack with an Ankylosaurus that takes back more than it deals", () => {
    // A Swordsman beside it: it deals 4 and takes 5.
    const state = asDinosaur([
      own("GUARD", 4, 3),
      own("FIGHTER", 4, 4),
      foe("SWORDSMAN", 5, 3),
      foe("FIGHTER", 2, 8),
    ]);
    const exchange = previewAt(state, at(4, 3), at(5, 3));
    expect(exchange.damageToAttacker).toBeGreaterThan(
      exchange.damageToDefender,
    );
    expect(
      unitScored(state, at(4, 3)).filter(
        (candidate) => candidate.command.kind === "ATTACK",
      ),
    ).toEqual([]);
    // The kill is taken.
    const kill = asDinosaur([
      own("GUARD", 4, 3),
      own("FIGHTER", 4, 4),
      foe("SWORDSMAN", 5, 3, { hp: 2 }),
      foe("FIGHTER", 2, 8),
    ]);
    expect(
      unitScored(kill, at(4, 3)).some(
        (candidate) => candidate.command.kind === "ATTACK",
      ),
    ).toBe(true);
    // A seat that plays no army rules keeps the older behaviour.
    const older = asDinosaur(
      [
        own("GUARD", 4, 3),
        own("FIGHTER", 4, 4),
        foe("SWORDSMAN", 5, 3),
        foe("FIGHTER", 2, 8),
      ],
      {},
      // (A Dwarf seat before step two of the Dwarf pass, `pulp_wars-w49.28`.)
      "CANDY",
    );
    // (Since the Candy army seat, `pulp_wars-jdb.13`: with the Candy taken
    // out of the army factions, tests/fixtures/v7-older-policy.ts.)
    expect(
      withCandyOnOlderPolicyV7(() => inspectNormalArmyV7(viewOf(older)).army),
    ).toBe(false);
  });

  it("keeps its garrison on a center while a fast enemy unit is within four tiles", () => {
    expect(ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7).toBe(4);
    // A Triceratops on the capital, a Caveman beside it, a Fighter two
    // tiles away, and a second enemy four tiles from the center. The seat
    // has no Coins, so the step aside that lets the city train is not
    // offered.
    const moves = (far: GoblinPieceV7) =>
      unitScored(
        asDinosaur(
          [
            own("SWORDSMAN", 8, 8),
            own("FIGHTER", 7, 8),
            foe("FIGHTER", 6, 8),
            far,
          ],
          { coins: 0 },
        ),
        at(8, 8),
      )
        .filter((candidate) => candidate.command.kind === "MOVE")
        .map((candidate) => endOf(candidate.command));
    // With a Guard there it walks off the center at the Fighter; with a
    // Knight or a Raider (fast units) it stays.
    expect(moves(foe("GUARD", 4, 8)).length).toBeGreaterThan(0);
    expect(moves(foe("KNIGHT", 4, 8))).toEqual([]);
    expect(moves(foe("RAIDER", 4, 7))).toEqual([]);
    // An Ankylosaurus beside the center stays on or beside it.
    const beside = unitScored(
      asDinosaur(
        [own("FIGHTER", 8, 8), own("GUARD", 7, 8), foe("KNIGHT", 4, 8)],
        { coins: 0 },
      ),
      at(7, 8),
    )
      .filter((candidate) => candidate.command.kind === "MOVE")
      .map((candidate) => endOf(candidate.command));
    for (const end of beside)
      expect(end === undefined ? 9 : gap(end, at(8, 8))).toBeLessThanOrEqual(1);
  });

  it("holds a Triceratops until it has support, and then commits it", () => {
    expect([
      ARMY_DINOSAUR_CHARGER_REACH_V7,
      ARMY_DINOSAUR_PACK_CAVEMEN_V7,
      ARMY_DINOSAUR_PACK_REACH_V7,
      ARMY_DINOSAUR_DEFENCE_RADIUS_V7,
      ARMY_DINOSAUR_ALONE_RADIUS_V7,
    ]).toEqual([3, 2, 2, 2, 2]);
    // Two Fighters side by side, three tiles from a Triceratops, far from
    // every city. Round 12: since the Triceratops captures
    // (`pulp_wars-ke95`), the opening's villages first (ten rounds) keeps
    // it out of the Fighters' reach altogether.
    const later = (state: GameStateV7): GameStateV7 => ({
      ...state,
      round: 12,
    });
    const contact = (pieces: readonly GoblinPieceV7[]): boolean =>
      unitScored(
        later(
          asDinosaur([
            own("SWORDSMAN", 2, 3),
            foe("FIGHTER", 5, 3),
            foe("FIGHTER", 5, 2),
            ...pieces,
          ]),
        ),
        at(2, 3),
      ).some((candidate) => {
        const end = endOf(candidate.command);
        return (
          end !== undefined &&
          (gap(end, at(5, 3)) === 1 || gap(end, at(5, 2)) === 1)
        );
      });
    expect(contact([])).toBe(false);
    // One Caveman is not a pack; two are, and so is a second Triceratops.
    expect(contact([own("FIGHTER", 3, 4)])).toBe(false);
    expect(contact([own("FIGHTER", 3, 4), own("FIGHTER", 3, 2)])).toBe(true);
    expect(contact([own("SWORDSMAN", 2, 2)])).toBe(true);
    // A lone Fighter is charged without support.
    expect(
      unitScored(
        later(asDinosaur([own("SWORDSMAN", 2, 3), foe("FIGHTER", 5, 3)])),
        at(2, 3),
      ).some((candidate) => {
        const end = endOf(candidate.command);
        return end !== undefined && gap(end, at(5, 3)) === 1;
      }),
    ).toBe(true);
    // In contact already, it attacks.
    expect(
      unitScored(
        asDinosaur([
          own("SWORDSMAN", 4, 3),
          foe("FIGHTER", 5, 3),
          foe("FIGHTER", 5, 2),
        ]),
        at(4, 3),
      ).some((candidate) => candidate.command.kind === "ATTACK"),
    ).toBe(true);
  });

  it("researches Wallbreaker right after the Triceratops's technology once it fields two", () => {
    const target = (techs: readonly TechnologyIdV7[], triceratops: number) =>
      inspectNormalArmyV7(
        viewOf(
          asDinosaur(
            [
              own("FIGHTER", 8, 7),
              foe("FIGHTER", 2, 2),
              ...[own("SWORDSMAN", 7, 7), own("SWORDSMAN", 9, 7)].slice(
                0,
                triceratops,
              ),
            ],
            { techs: { 0: techs, 1: [] }, coins: 40 },
          ),
        ),
      ).research?.tech;
    const base = techsOf(
      "GATHERING",
      "DRILL",
      "FORTIFICATION",
      "ENGINEERING",
      "METALLURGY",
    );
    // Before the correction this was Scouting: Wallbreaker waited for the
    // T-Rex's step, four technologies later, and a seat never reached it.
    expect(target(base, 2)).toBe("EXPLOSIVES");
    // (Step two of the Dinosaur pass: with one Triceratops the order goes
    // on to the Spitter's Hunting; it was the Raptor's Scouting.)
    expect(target(base, 1)).toBe("HUNTING");
    // Without Nesting it researches Nesting first (Wallbreaker needs it).
    expect(
      target(techsOf("GATHERING", "DRILL", "ENGINEERING", "METALLURGY"), 2),
    ).toBe("FORTIFICATION");
    // A war does not hold it: with a Swordsman three tiles from the
    // capital and the Coins for it and no more, it is researched. (In the
    // lab a seat with five Triceratops had it as its target for six
    // rounds and bought units.)
    const atWar = (triceratops: number) => {
      const state = asDinosaur(
        [
          own("FIGHTER", 8, 8),
          foe("SWORDSMAN", 5, 8),
          ...[own("SWORDSMAN", 7, 7), own("SWORDSMAN", 9, 7)].slice(
            0,
            triceratops,
          ),
        ],
        { techs: { 0: base, 1: [] }, coins: 16 },
      );
      return scored({
        ...state,
        units: state.units.map((unit) =>
          unit.role === "SWORDSMAN" ? { ...unit, homeCityId: null } : unit,
        ),
      }).flatMap((candidate) =>
        candidate.command.kind === "RESEARCH" ? [candidate.command.tech] : [],
      );
    };
    expect(atWar(2)).toEqual(["EXPLOSIVES"]);
  });

  it("does not lay the capped Ankylosaurus where it is the only Egg on offer", () => {
    // A Caveman on the capital and an Ankylosaurus; only Drill is owned,
    // so the Ankylosaurus is the one Egg, and it is capped. The city lays
    // nothing; the garrison steps aside so that it trains a Caveman. (The
    // cap was a score only: the Egg was the city's one production and was
    // laid all the same, nine Ankylosauruses of sixteen units.)
    const state = asDinosaur(
      [own("FIGHTER", 8, 8), own("GUARD", 7, 7), foe("FIGHTER", 2, 2)],
      {
        coins: 30,
        techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
      },
    );
    const homeless: GameStateV7 = {
      ...state,
      units: state.units.map((unit) =>
        unit.role === "GUARD" ? { ...unit, homeCityId: null } : unit,
      ),
    };
    expect(
      queryPlayerCommandsV7(viewOf(homeless)).some(
        (command) => command.kind === "LAY_EGG" && command.role === "GUARD",
      ),
    ).toBe(true);
    expect(produced(homeless)).toEqual([]);
    expect(
      unitScored(homeless, at(8, 8)).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.score.priority > ARMY_TRAINING_PRIORITY_V7,
      ),
    ).toBe(true);
  });

  it("lays an Egg of two turns only out of reach or beside an own unit", () => {
    // The capital with nobody on or beside it and a Raider five tiles
    // from the nest (two Moves of two tiles and its attack): the
    // Ankylosaurus Egg (two turns) is not laid.
    const open = asDinosaur([own("FIGHTER", 10, 4), foe("RAIDER", 4, 8)], {
      coins: 30,
      techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
    });
    expect(
      produced(open).filter((command) => command.kind === "LAY_EGG"),
    ).toEqual([]);
    // A Fighter there reaches three tiles in two turns: the Egg is laid.
    const slow = asDinosaur([own("FIGHTER", 10, 4), foe("FIGHTER", 4, 8)], {
      coins: 30,
      techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
    });
    expect(produced(slow)).toMatchObject([{ kind: "LAY_EGG", role: "GUARD" }]);
    // With a unit of its own on the center the Egg is guarded and laid.
    const guarded = asDinosaur([own("FIGHTER", 8, 8), foe("RAIDER", 4, 8)], {
      coins: 30,
      techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
    });
    expect(produced(guarded)).toMatchObject([
      { kind: "LAY_EGG", role: "GUARD" },
    ]);
    // A one-turn Egg is laid in reach of a unit that cannot destroy it
    // next turn.
    const spitter = asDinosaur([own("FIGHTER", 10, 4), foe("RAIDER", 4, 8)], {
      coins: 30,
      techs: { 0: techsOf("GATHERING", "HUNTING", "MARKSMANSHIP"), 1: [] },
    });
    expect(produced(spitter)).toMatchObject([
      { kind: "LAY_EGG", role: "MARKSMAN" },
    ]);
  });
});
