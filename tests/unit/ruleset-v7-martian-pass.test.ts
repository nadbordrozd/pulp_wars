import { describe, expect, it } from "vitest";
import {
  ARMY_CARRIER_KEEP_OUT_PRIORITY_V7,
  ARMY_EMPTY_CENTER_PRIORITY_V7,
  ARMY_VILLAGE_DELIVERY_PRIORITY_V7,
  ARMY_VILLAGE_FERRY_PRIORITY_V7,
  ARMY_ESCORT_VALUE_V7,
  ARMY_FORCE_FIELDS_PROJECTORS_V7,
  ARMY_HEAT_SINKS_RAY_GUNNERS_V7,
  ARMY_MARTIAN_FRONT_DEFENDER_VALUE_V7,
  ARMY_MARTIAN_FRONT_LINE_VALUE_V7,
  ARMY_MARTIAN_SKIRMISHER_MAXIMUM_V7,
  ARMY_MARTIAN_SKIRMISHER_PER_UNITS_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_STEP_BACK_PRIORITY_V7,
  ARMY_VILLAGE_PRIORITY_V7,
  armyPlayFactionV7,
  armyRoleScoreV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import { chooseNormalCommandV7, inspectNormalArmyV7 } from "../../src/ai/v7";
import {
  BEAM_DOWN_ATTACK_PRIORITY_V7,
  MIND_CONTROL_PRIORITY_V7,
  TRACTOR_KILL_SETUP_PRIORITY_V7,
} from "../../src/ai/v7-martian";
import {
  FORCE_FIELD_SHIELD_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseEventV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  rayOverheatsV7,
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
import { forceFieldHoldsV7 } from "../../src/engine/v7/martian";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import {
  FORCE_FIELDS_UNLOCK_TEXT_V7,
  FORCE_FIELD_HOLDS_RULE_V7,
  FORCE_FIELD_HOLDS_V7,
  FORCE_FIELD_NEEDS_TEXT_V7,
  martianCombatLinesV7,
  HEAT_SINKS_UNLOCK_TEXT_V7,
  HEAT_SINK_NOTE_V7,
  martianAbilityDescriptionV7,
  martianHelpRulesV7,
  martianRoleUnlockTextV7,
  martianUnitInfoLinesV7,
} from "../../src/render/martian-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { scoutsRewardTextV7 } from "../../src/render/technology-unlock-text-v7";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  martianFieldV7,
  playV7,
  rejectedV7,
  shieldAtV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  forestV7,
  movedV7,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian pass (`pulp_wars-w49.14`, `pulp-wars-poc-7r59`,
// docs/product/RULESET_7_TUNING_MARTIAN.md): a unit pulled by the Tractor
// Beam explores for its owner from the tile it lands on; Scouts for a
// Martian city (a free Saucer); the Shield Projector's Force Field needs
// the Force Fields technology; Heat Sinks (the Martian Fieldcraft: a Ray
// Gunner does not overheat); Martian seats in the Normal AI's army play
// with their research order, shares, and unit rules; the lab
// `LAB_MARTIAN_MID`. Two-seat field (tests/fixtures/v7-martian.ts, seed-2
// Dry Land, 11 x 11): seat 0 capital (8, 8), seat 1 capital (2, 8),
// villages (5, 5), (8, 5), (5, 8); every other land tile open Grass, every
// tile explored and every land technology researched unless stated. The
// numbers asserted here are the ones the tuning document gives as reasons
// (`scripts/martian-tuning-analysis-v7.ts`).

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** Every technology of the Martian tree but these and what needs them. */
const martianWithout = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] => withoutTechsV7("MARTIAN", ...techs);
/** The technologies in the canonical order a state lists them in. */
const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** Seat 0 Martian against seat 1 of `opponent`; the Martians move. */
const asMartian = (
  pieces: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
  opponent: FactionIdV7 = "ORIGINAL",
): GameStateV7 =>
  martianFieldV7(pieces, { ...options, factions: ["MARTIAN", opponent] });
/** Seat 0 of `attacker` against seat 1 Martian; seat 0 moves. */
const againstMartian = (
  pieces: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
  attacker: FactionIdV7 = "ORIGINAL",
): GameStateV7 =>
  martianFieldV7(pieces, { ...options, factions: [attacker, "MARTIAN"] });

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

/** The whole hit (HP and Shield) of the attack from `from` on `to`. */
const hit = (state: GameStateV7, from: CoordV7, to: CoordV7): number => {
  const preview = previewAt(state, from, to);
  return preview.damageToDefender + preview.defenderShieldDamage;
};

const ROSTER: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
];
const FACTIONS: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
];

describe("the Martian pass: identity", () => {
  // The Dinosaur pass (tests/unit/ruleset-v7-dinosaur-pass.test.ts) took
  // 7r53 and the economy rejig 7r54, so 7r52 is a prior identity.
  it("was 7r52 after 7r51, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r59");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r59.current");
    expect(PRIOR_RULESET_7_IDS.slice(-8, -6)).toEqual([
      "pulp-wars-poc-7r51",
      "pulp-wars-poc-7r52",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-8, -6)).toEqual([
      "pulpWars.save.v7r51.current",
      "pulpWars.save.v7r52.current",
    ]);
  });

  it("registers Heat Sinks and the Force Field gate on the Martian tree and moves no number", () => {
    // One role mechanic: the Ray Gunner's heat sink, and no other role's.
    for (const faction of FACTIONS)
      for (const role of ROSTER)
        expect(
          roleMechanicsV7(role, faction).heatSink,
          `${faction} ${role}`,
        ).toBe(faction === "MARTIAN" && role === "MARKSMAN");
    // One unlock kind, on the Martian Fieldcraft and nowhere else.
    for (const faction of FACTIONS)
      for (const node of factionTreeV7(faction).nodes)
        expect(
          node.unlocks.some((unlock) => unlock.kind === "HEAT_SINKS"),
          `${faction} ${node.id}`,
        ).toBe(faction === "MARTIAN" && node.id === "FIELDCRAFT");
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.MARTIAN).toEqual({
      FORTIFICATION: "Force Fields",
      EXPLOSIVES: "Disintegrator",
      FIELDCRAFT: "Heat Sinks",
      // The ninth unit (7r55): the nodes named for a building or unit.
      MILLING: "Solar Arrays",
      MARKSMANSHIP: "Ray Gunners",
      SAWMILLING: "Tripods",
      SCOUTING: "Saucers",
      CHIVALRY: "Motherships",
    });
    expect(technologyNameV7("FIELDCRAFT", "MARTIAN")).toBe("Heat Sinks");
    // (7r55: the shared name of Fieldcraft is Pathfinding.)
    expect(technologyNameV7("FIELDCRAFT", "ORIGINAL")).toBe("Pathfinding");
    // The capabilities: both are Martian, each from its own technology.
    const capabilities = (...techs: readonly TechnologyIdV7[]) =>
      technologyCapabilitiesV7(techsOf(...techs), "MARTIAN");
    expect(capabilities("DRILL")).toMatchObject({
      projectsForceField: false,
      shieldsRechargeAtEndTurn: false,
      heatSinks: false,
    });
    expect(capabilities("DRILL", "FORTIFICATION")).toMatchObject({
      projectsForceField: true,
      shieldsRechargeAtEndTurn: true,
      heatSinks: false,
    });
    expect(capabilities("HUNTING", "MARKSMANSHIP", "FIELDCRAFT")).toMatchObject(
      { projectsForceField: false, heatSinks: true },
    );
    for (const faction of FACTIONS.filter((item) => item !== "MARTIAN"))
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction),
        faction,
      ).toMatchObject({ projectsForceField: false, heatSinks: false });
    // The roster's numbers are the ones of 7r51.
    const numbers = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "MARTIAN");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        roleMechanicsV7(role, "MARTIAN").shield,
        rule.attack2,
        rule.defense2,
        rule.move,
        rule.minimumRange,
        rule.range,
        rule.technology,
      ];
    };
    expect(ROSTER.map(numbers)).toEqual([
      ["Grunt", 3, 8, 2, 4, 3, 1, 1, 2, null],
      ["Saucer", 4, 8, 2, 3, 2, 3, 1, 1, "SCOUTING"],
      ["Ray Gunner", 4, 8, 2, 6, 2, 1, 1, 2, "MARKSMANSHIP"],
      // The Industry reshuffle (7r56): at Force Fields (Fortification).
      ["Shield Projector", 4, 12, 3, 3, 5, 1, 1, 1, "FORTIFICATION"],
      ["Brain", 5, 8, 2, 2, 2, 1, 1, 1, "ADMINISTRATION"],
      ["Tripod", 9, 12, 2, 8, 2, 2, 2, 2, "SAWMILLING"],
      ["Mothership", 8, 16, 4, 5, 4, 2, 1, 1, "CHIVALRY"],
      ["Colossus", null, 32, 3, 8, 5, 1, 1, 2, null],
    ]);
  });
});

describe("the Martian pass: a pulled unit explores", () => {
  /** The three rows south of the pulled unit, hidden from its owner. */
  const hidden = [2, 3, 4, 5].flatMap((y) =>
    [1, 2, 3, 4, 5, 6, 7].map((x) => at(x, y)),
  );
  const pulled = (humanTechs: readonly TechnologyIdV7[]) =>
    unexploreV7(
      asMartian([own("RAIDER", 4, 3), foe("MARKSMAN", 4, 1)], {
        techs: { 0: martianWithout(), 1: humanTechs },
      }),
      1,
      hidden,
    );
  const pull = (state: GameStateV7) =>
    playV7(state, {
      kind: "TRACTOR_BEAM",
      unitId: unitAtV7(state, at(4, 3)).id,
      targetUnitId: unitAtV7(state, at(4, 1)).id,
    });

  it("reveals its ordinary sight from the tile it lands on, for its owner", () => {
    const state = pulled([]);
    const human = seatIdV7(state, 1);
    const martian = seatIdV7(state, 0);
    const explored = (source: GameStateV7, where: CoordV7): boolean =>
      source.players
        .find((player) => player.id === human)
        ?.explored.some((tile) => same(tile, where)) === true;
    expect(explored(state, at(4, 2))).toBe(false);
    const result = pull(state);
    // The Marksman (Sight 1 without Fieldcraft) stands on (4, 2) and has
    // explored the nine tiles around it: three of them were hidden rows.
    expect(unitAtV7(result.state, at(4, 2)).ownerId).toBe(human);
    const reveal = result.events.filter(
      (event) => event.kind === "TILES_REVEALED",
    );
    expect(reveal).toEqual([
      {
        kind: "TILES_REVEALED",
        playerId: human,
        tiles: [at(3, 2), at(4, 2), at(5, 2), at(3, 3), at(4, 3), at(5, 3)],
      },
    ]);
    for (const tile of [at(3, 2), at(4, 2), at(5, 3), at(4, 3)])
      expect(explored(result.state, tile)).toBe(true);
    expect(explored(result.state, at(4, 4))).toBe(false);
    expect(explored(result.state, at(2, 2))).toBe(false);
    // The puller's owner explored nothing by it.
    expect(
      result.state.players.find((player) => player.id === martian)?.explored,
    ).toEqual(state.players.find((player) => player.id === martian)?.explored);
    // Its owner is told (the pull and the tiles); the puller's owner is
    // told the pull and not the other player's tiles.
    const kinds = (viewer: number): readonly string[] =>
      projectEventsV7(
        state,
        result.state,
        viewer as never,
        result.events,
      ).events.map((event) => event.kind);
    expect(kinds(human)).toEqual(
      expect.arrayContaining(["UNIT_PULLED", "TILES_REVEALED"]),
    );
    expect(kinds(martian)).toContain("UNIT_PULLED");
    expect(kinds(martian)).not.toContain("TILES_REVEALED");
    for (const event of result.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("uses the unit's own sight radius: two tiles for a Marksman with Fieldcraft", () => {
    const result = pull(
      pulled(techsOf("HUNTING", "MARKSMANSHIP", "FIELDCRAFT")),
    );
    const reveal = result.events.find(
      (event) => event.kind === "TILES_REVEALED",
    );
    if (reveal?.kind !== "TILES_REVEALED") throw new Error("no reveal");
    // Rows 2 to 4, columns 2 to 6 (row 0 and 1 were explored).
    expect(reveal.tiles).toHaveLength(15);
    expect(reveal.tiles).toContainEqual(at(6, 4));
    expect(reveal.tiles).not.toContainEqual(at(4, 5));
  });

  it("still reveals for the puller's owner when it pulls its own unit", () => {
    const state = unexploreV7(
      asMartian([own("RAIDER", 4, 3), own("FIGHTER", 4, 1)]),
      0,
      [at(3, 3), at(5, 3)],
    );
    const result = pull(state);
    expect(
      result.events.filter((event) => event.kind === "TILES_REVEALED"),
    ).toEqual([
      {
        kind: "TILES_REVEALED",
        playerId: seatIdV7(state, 0),
        tiles: [at(3, 3), at(5, 3)],
      },
    ]);
  });

  it("is what a Push already did for the pushed unit's owner", () => {
    // A Colossus beside a Fighter pushes it one tile; the Fighter's owner
    // explores from there (the rule the Tractor Beam now shares).
    const state = unexploreV7(
      asMartian([own("JUGGERNAUT", 4, 3), foe("GUARD", 4, 2)], {
        techs: { 0: martianWithout(), 1: [] },
      }),
      1,
      [at(3, 0), at(4, 0), at(5, 0)],
    );
    const run = attackV7(state, at(4, 3), at(4, 2));
    expect(run.combat.push).toBe("WILL_PUSH");
    expect(
      run.events.filter((event) => event.kind === "TILES_REVEALED"),
    ).toEqual([
      {
        kind: "TILES_REVEALED",
        playerId: seatIdV7(state, 1),
        tiles: [at(3, 0), at(4, 0), at(5, 0)],
      },
    ]);
  });
});

describe("the Martian pass: Scouts", () => {
  it("gives a Martian city's Survey a free Saucer with its Shield", () => {
    expect(SURVEY_RAIDERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 1,
      // The Dinosaur pass, 7r53: a Dinosaur Survey grants a Raptor.
      DINOSAUR: 1,
      MARTIAN: 1,
      // Step two of the Ice Folk pass (7r59): a Sled.
      ICE_FOLK: 1,
      DWARF: 0,
      CANDY: 0,
    });
    const base = asMartian([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
      techs: { 0: techsOf("GATHERING", "FARMING"), 1: [] },
    });
    const actor = seatIdV7(base, 0);
    const capital = base.cities.find((city) => city.ownerId === actor);
    if (capital === undefined) throw new Error("capital missing");
    const farm = at(8, 9);
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, farm)
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
              }
            : tile,
        ),
      },
    };
    const built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: farm });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "SURVEY",
    });
    expect(
      chosen.events.find((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toMatchObject({ role: "RAIDER", reachedLevel: 2 });
    // Without Scouting; beside the garrisoned center; at its Shield
    // maximum.
    const saucer = chosen.state.units.find(
      (unit) => unit.ownerId === actor && unit.role === "RAIDER",
    );
    if (saucer === undefined) throw new Error("no Saucer");
    expect(gap(saucer.at, capital.at)).toBe(1);
    expect(shieldAtV7(chosen.state, saucer.at)).toBe(2);
    expect(effectiveRoleRuleV7("RAIDER", "MARTIAN").label).toBe("Saucer");
    expect(scoutsRewardTextV7("Saucer")).toBe(
      "Reveal the area and a free Saucer",
    );
  });
});

describe("the Martian pass: the Force Field needs Force Fields", () => {
  /** A Grunt and a Ray Gunner without Shields beside a Shield Projector. */
  const line = (techs: readonly TechnologyIdV7[]) =>
    asMartian(
      [
        own("FIGHTER", 4, 3, { shield: 0 }),
        own("MARKSMAN", 5, 3, { shield: 0 }),
        own("GUARD", 4, 4, { shield: 0 }),
        own("FIGHTER", 7, 3, { shield: 0 }),
        foe("FIGHTER", 2, 2),
      ],
      { techs: { 0: techs, 1: [] } },
    );
  const recharged = (state: GameStateV7): readonly number[] => {
    const next = endTurnUntilV7(state, seatIdV7(state, 0)).state;
    return [at(4, 3), at(5, 3), at(4, 4), at(7, 3)].map((where) =>
      shieldAtV7(next, where),
    );
  };

  it("recharges a unit beside a Projector to 4 only with the technology", () => {
    expect(FORCE_FIELD_SHIELD_V7).toBe(4);
    // With Drill alone the Projector covers nobody: every Shield returns
    // to its own maximum.
    expect(recharged(line(techsOf("DRILL")))).toEqual([2, 2, 3, 2]);
    // With Force Fields the two units beside it have 4, the Projector its
    // own 3 (it does not cover itself), the far Grunt 2.
    expect(recharged(line(techsOf("DRILL", "FORTIFICATION")))).toEqual([
      4, 4, 3, 2,
    ]);
  });

  it("keeps the end-of-turn recharge with the same technology", () => {
    const without = line(techsOf("DRILL"));
    const withIt = line(techsOf("DRILL", "FORTIFICATION"));
    const ended = (state: GameStateV7) =>
      applyOkV7(state, seatIdV7(state, 0), { kind: "END_TURN" });
    expect(shieldAtV7(ended(without).state, at(4, 3))).toBe(0);
    expect(shieldAtV7(ended(withIt).state, at(4, 3))).toBe(4);
    expect(
      ended(withIt).events.some((event) => event.kind === "SHIELDS_RECHARGED"),
    ).toBe(true);
  });

  it("shows the field on a Projector's public stats only with the technology", () => {
    const flag = (state: GameStateV7): boolean | undefined =>
      viewOf(state).unitStats.find(
        (entry) => entry.unitId === unitAtV7(state, at(4, 4)).id,
      )?.martian?.forceField;
    expect(flag(line(techsOf("DRILL")))).toBe(false);
    expect(flag(line(techsOf("DRILL", "FORTIFICATION")))).toBe(true);
  });

  it("changes what a Fighter's hit costs a Grunt: 3 HP without the field, 1 with it", () => {
    for (const [shield, lost] of [
      [2, 3],
      [4, 1],
    ] as const) {
      const state = againstMartian([
        own("FIGHTER", 4, 2),
        foe("FIGHTER", 4, 3, { shield }),
      ]);
      const preview = previewAt(state, at(4, 2), at(4, 3));
      expect(preview.damageToDefender + preview.defenderShieldDamage).toBe(5);
      expect(preview.damageToDefender).toBe(lost);
    }
  });

  it("says so on the Projector and the technology", () => {
    // (The correction added the hold to each text; asserted below.)
    expect(FORCE_FIELDS_UNLOCK_TEXT_V7).toContain(
      "Shield Projectors raise the Shields of units next to them to 4",
    );
    expect(
      martianAbilityDescriptionV7("FORCE_FIELD", "MARTIAN", "GUARD"),
    ).toContain(
      "With Force Fields: own units next to it recharge their Shield to 4.",
    );
    expect(
      recruitmentRolePresentationV7("GUARD", "MARTIAN").restrictions,
    ).toContain(
      `${FORCE_FIELD_NEEDS_TEXT_V7} raises the Shields of units next to it to 4; at full HP one attack cannot kill them.`,
    );
    expect(martianRoleUnlockTextV7("GUARD")).toBe(
      "Train Shield Projector (Force Field)",
    );
    expect(
      martianHelpRulesV7().find(([name]) => name === "Force Field")?.[1],
    ).toContain(
      "with Force Fields, a unit that recharges next to a Shield Projector recharges to Shield 4.",
    );
  });
});

describe("the Martian pass: Heat Sinks", () => {
  const NO_HEAT_SINKS = martianWithout("FIELDCRAFT");
  /** A ray unit two tiles from a Juggernaut it cannot kill. */
  const duel = (
    role: "MARKSMAN" | "CATAPULT" | "JUGGERNAUT",
    techs: readonly TechnologyIdV7[],
    extra: Partial<MartianPieceV7> = {},
  ) =>
    asMartian([own(role, 3, 2, extra), foe("JUGGERNAUT", 5, 2)], {
      techs: { 0: techs, 1: [] },
    });

  it("lets a Ray Gunner fire at full power turn after turn while it stands", () => {
    let state = duel("MARKSMAN", martianWithout());
    const martian = seatIdV7(state, 0);
    for (let turn = 0; turn < 3; turn += 1) {
      const run = attackV7(state, at(3, 2), at(5, 2));
      expect(run.combat, `turn ${turn}`).toMatchObject({
        rayPower: "FULL",
        attack2: 6,
        coolingApplied: false,
      });
      expect(run.state.cooling).toEqual([]);
      state = endTurnUntilV7(run.state, martian).state;
    }
    expect(
      rayOverheatsV7(state, unitAtV7(state, at(3, 2)), martianWithout()),
    ).toBe(false);
  });

  it("leaves it overheating without the technology: full, then half", () => {
    let state = duel("MARKSMAN", NO_HEAT_SINKS);
    const martian = seatIdV7(state, 0);
    const first = attackV7(state, at(3, 2), at(5, 2));
    expect(first.combat).toMatchObject({
      rayPower: "FULL",
      coolingApplied: true,
    });
    state = endTurnUntilV7(first.state, martian).state;
    expect(attackV7(state, at(3, 2), at(5, 2)).combat).toMatchObject({
      rayPower: "HALF",
      attack2: 3,
      coolingApplied: false,
    });
  });

  it("still halves a Ray Gunner that moved, and one that was Cooling already", () => {
    expect(
      previewAt(
        duel("MARKSMAN", martianWithout(), { activation: movedV7(1) }),
        at(3, 2),
        at(5, 2),
      ),
    ).toMatchObject({ rayPower: "HALF", attack2: 3 });
    expect(
      previewAt(
        duel("MARKSMAN", martianWithout(), { cooling: "COOLING" }),
        at(3, 2),
        at(5, 2),
      ),
    ).toMatchObject({ rayPower: "HALF", attack2: 3 });
  });

  it("is the Ray Gunner's alone: a Tripod and a Colossus overheat with it", () => {
    for (const role of ["CATAPULT", "JUGGERNAUT"] as const) {
      const run = attackV7(duel(role, martianWithout()), at(3, 2), at(5, 2));
      expect(run.combat, role).toMatchObject({
        rayPower: "FULL",
        coolingApplied: true,
      });
      expect(run.state.cooling).toHaveLength(1);
    }
  });

  it("says so on the Ray Gunner and the technology", () => {
    expect(HEAT_SINKS_UNLOCK_TEXT_V7).toBe(
      "Ray Gunners do not overheat: full power every turn they do not move",
    );
    expect(
      recruitmentRolePresentationV7("MARKSMAN", "MARTIAN").restrictions,
    ).toContain(HEAT_SINK_NOTE_V7);
    for (const role of ROSTER.filter((item) => item !== "MARKSMAN"))
      expect(
        recruitmentRolePresentationV7(role, "MARTIAN").restrictions,
        role,
      ).not.toContain(HEAT_SINK_NOTE_V7);
    expect(
      martianAbilityDescriptionV7("HEAT_RAY", "MARTIAN", "MARKSMAN"),
    ).toContain(HEAT_SINK_NOTE_V7);
    expect(
      martianAbilityDescriptionV7("HEAT_RAY", "MARTIAN", "CATAPULT"),
    ).not.toContain("Heat Sinks");
    expect(
      martianHelpRulesV7().find(([name]) => name === "Heat Sinks")?.[1],
    ).toBe(
      "with Heat Sinks, a Ray Gunner does not overheat: it fires at full power every turn it does not move.",
    );
    // The unit card's ray line of a Ray Gunner that does not overheat.
    const mechanics = {
      shield: 2,
      shieldMaximum: 2,
      capacitySlots: 1,
      movementMode: "GROUND",
      rayPower: "FULL",
      cooling: false,
      pierce: false,
      forceField: false,
      mindControl: null,
    } as const;
    const ray = (overheats: boolean): string | undefined =>
      martianUnitInfoLinesV7(
        { role: "MARKSMAN", form: "LAND" },
        mechanics,
        overheats,
      ).find((line) => line.id === "ray")?.description;
    expect(ray(true)).toBe(
      "Its next shot fires at full Attack and leaves it Cooling.",
    );
    expect(ray(false)).toBe(
      "Its next shot fires at full Attack. Heat Sinks: it does not overheat.",
    );
  });
});

describe("the Martian pass: the matrix numbers the document reasons from", () => {
  it("has a Grunt shoot a Fighter for 5 and a Guard for 6 from two tiles, unanswered", () => {
    for (const [role, dealt] of [
      ["FIGHTER", 5],
      ["GUARD", 6],
      ["MARKSMAN", 6],
      ["SWORDSMAN", 4],
      ["KNIGHT", 6],
    ] as const) {
      const preview = previewAt(
        asMartian([own("FIGHTER", 5, 2), foe(role, 3, 2)]),
        at(5, 2),
        at(3, 2),
      );
      expect(preview.damageToDefender, role).toBe(dealt);
      // A Marksman answers from two tiles (2); the others cannot.
      expect(
        preview.damageToAttacker + preview.attackerShieldDamage,
        role,
      ).toBe(role === "MARKSMAN" ? 2 : 0);
    }
    // Bones: a Skeleton takes 4.
    expect(
      previewAt(
        asMartian([own("FIGHTER", 5, 2), foe("FIGHTER", 3, 2)], {}, "UNDEAD"),
        at(5, 2),
        at(3, 2),
      ).damageToDefender,
    ).toBe(4);
  });

  it("has a Ray Gunner kill a 10-HP unit in one full-power shot, which a Grunt does not", () => {
    for (const [faction, role, label] of [
      ["UNDEAD", "KNIGHT", "Vampire"],
      ["UNDEAD", "CATAPULT", "Lich"],
      ["GOBLIN", "KNIGHT", "Scrap Buggy"],
      ["GOBLIN", "RAIDER", "Wolf Rider"],
      ["ORIGINAL", "CATAPULT", "Catapult"],
      ["ORIGINAL", "CAPTAIN", "Captain"],
    ] as const) {
      expect(effectiveRoleRuleV7(role, faction).label).toBe(label);
      const ray = previewAt(
        asMartian([own("MARKSMAN", 5, 2), foe(role, 3, 2)], {}, faction),
        at(5, 2),
        at(3, 2),
      );
      expect(ray, label).toMatchObject({
        rayPower: "FULL",
        defenderDies: true,
      });
    }
    for (const [faction, role] of [
      ["UNDEAD", "KNIGHT"],
      ["GOBLIN", "KNIGHT"],
    ] as const)
      expect(
        previewAt(
          asMartian([own("FIGHTER", 5, 2), foe(role, 3, 2)], {}, faction),
          at(5, 2),
          at(3, 2),
        ),
      ).toMatchObject({ damageToDefender: 6, defenderDies: false });
    // On a Fighter 8 at full power and 3 at half; on a Knight 10 and 4.
    const ray = (role: UnitRoleIdV7, moved: boolean): number =>
      previewAt(
        asMartian([
          own("MARKSMAN", 5, 2, moved ? { activation: movedV7(1) } : {}),
          foe(role, 3, 2),
        ]),
        at(5, 2),
        at(3, 2),
      ).damageToDefender;
    expect([
      ray("FIGHTER", false),
      ray("FIGHTER", true),
      ray("KNIGHT", false),
      ray("KNIGHT", true),
    ]).toEqual([8, 3, 10, 4]);
  });

  it("has a Tripod kill a Fighter and pierce the unit behind it for 6", () => {
    const state = asMartian([
      own("CATAPULT", 6, 2),
      foe("FIGHTER", 4, 2),
      foe("MARKSMAN", 3, 2),
    ]);
    const preview = previewAt(state, at(6, 2), at(4, 2));
    expect(preview).toMatchObject({ rayPower: "FULL", defenderDies: true });
    expect(preview.splash).toMatchObject([{ damage: 6, dies: false }]);
  });

  it("has a Human Knight kill a Grunt through its own Shield and stop on a Shield Projector", () => {
    // (The correction: a whole field of 4 holds; see below.)
    for (const shield of [0, 2])
      expect(
        previewAt(
          againstMartian([
            own("KNIGHT", 4, 2),
            foe("FIGHTER", 4, 3, { shield }),
          ]),
          at(4, 2),
          at(4, 3),
        ),
        `Shield ${shield}`,
      ).toMatchObject({ defenderDies: true, advances: true });
    const projector = previewAt(
      againstMartian([own("KNIGHT", 4, 2), foe("GUARD", 4, 3)]),
      at(4, 2),
      at(4, 3),
    );
    expect(projector).toMatchObject({
      defenderDies: false,
      damageToDefender: 8,
      defenderShieldDamage: 3,
      damageToAttacker: 4,
    });
    // A Swordsman kills a Grunt with its own Shield and not one in a field.
    const swordsman = (shield: number) =>
      previewAt(
        againstMartian([
          own("SWORDSMAN", 4, 2),
          foe("FIGHTER", 4, 3, { shield }),
        ]),
        at(4, 2),
        at(4, 3),
      );
    expect(swordsman(2).defenderDies).toBe(true);
    expect(swordsman(4)).toMatchObject({
      defenderDies: false,
      damageToDefender: 7,
    });
  });

  it("has a Marksman's shot cost a Grunt 3 HP and the Marksman 3", () => {
    expect(
      previewAt(
        againstMartian([own("MARKSMAN", 4, 1), foe("FIGHTER", 4, 3)]),
        at(4, 1),
        at(4, 3),
      ),
    ).toMatchObject({
      damageToDefender: 3,
      defenderShieldDamage: 2,
      damageToAttacker: 3,
    });
    // A Catapult's 9 leaves a Grunt at 1 HP; with its Shield down it dies.
    const catapult = (shield: number) =>
      previewAt(
        againstMartian([
          own("CATAPULT", 4, 0),
          foe("FIGHTER", 4, 3, { shield }),
        ]),
        at(4, 0),
        at(4, 3),
      );
    expect(catapult(2)).toMatchObject({ damageToDefender: 7 });
    expect(catapult(0).defenderDies).toBe(true);
  });

  it("has a Zombie bite a Grunt through a Force Field, and the Grunt rise", () => {
    const state = againstMartian(
      [
        own("GUARD", 4, 2, { activation: {} }),
        own("FIGHTER", 5, 2),
        foe("FIGHTER", 4, 3, { shield: 4 }),
      ],
      {},
      "UNDEAD",
    );
    const bite = attackV7(state, at(4, 2), at(4, 3));
    expect(bite.combat).toMatchObject({
      damageToDefender: 1,
      defenderShieldDamage: 4,
      defenderBitten: true,
    });
    const next = endTurnUntilV7(bite.state, seatIdV7(state, 0)).state;
    const grunt = unitAtV7(next, at(4, 3));
    const kill = applyCommandV7(
      {
        ...next,
        units: next.units.map((unit) =>
          unit.id === grunt.id ? { ...unit, hp: 1 } : unit,
        ),
        shields: [],
      },
      seatIdV7(state, 0),
      {
        kind: "ATTACK",
        unitId: unitAtV7(next, at(5, 2)).id,
        targetUnitId: grunt.id,
      },
    );
    if (!kill.accepted) throw new Error(kill.error.code);
    expect(
      kill.events.some((event) => event.kind === "BITTEN_UNIT_RISEN"),
    ).toBe(true);
  });

  it("has a Saucer's pull bring a Guard out of a Forest into two Ray Gunners' range", () => {
    let state = forestV7(
      asMartian([
        own("MARKSMAN", 3, 4),
        own("MARKSMAN", 5, 4),
        own("RAIDER", 4, 3),
        foe("GUARD", 4, 1),
      ]),
      at(4, 1),
    );
    // Three tiles away: no shot.
    expect(
      queryCombatPreviewV7(
        viewOf(state),
        unitAtV7(state, at(3, 4)).id,
        unitAtV7(state, at(4, 1)).id,
      ),
    ).toBeNull();
    state = playV7(state, {
      kind: "TRACTOR_BEAM",
      unitId: unitAtV7(state, at(4, 3)).id,
      targetUnitId: unitAtV7(state, at(4, 1)).id,
    }).state;
    // In the open, two tiles from both: 10 and then the rest of its 17 HP.
    expect(hit(state, at(3, 4), at(4, 2))).toBe(10);
    const first = attackV7(state, at(3, 4), at(4, 2));
    expect(previewAt(first.state, at(5, 4), at(4, 2)).defenderDies).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The Normal AI
// ---------------------------------------------------------------------------

/** The Normal AI's scored candidates, the best first. */
const scored = (state: GameStateV7) =>
  chooseNormalCommandV7(viewOf(state)).candidates;
/** The Normal AI's scored candidates of the unit on `where`. */
const unitScored = (state: GameStateV7, where: CoordV7) => {
  const id = unitAtV7(state, where).id;
  return scored(state).filter(
    (candidate) =>
      "unitId" in candidate.command && candidate.command.unitId === id,
  );
};
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
/**
 * `state` with only the unit on the capital's ring tile (8, 7) homed to
 * the capital: the rest fill no unit slot, so the capital can train.
 */
const orphaned = (state: GameStateV7): GameStateV7 => ({
  ...state,
  units: state.units.map((unit) =>
    same(unit.at, at(8, 7)) ? unit : { ...unit, homeCityId: null },
  ),
});
const trained = (state: GameStateV7): readonly CommandV7[] =>
  scored(state)
    .map((candidate) => candidate.command)
    .filter((command) => command.kind === "TRAIN");

describe("the Martian pass: Martian seats play the army rules", () => {
  it("counts a Martian seat among the army factions, with its own order and shares", () => {
    // The Dinosaur pass (`pulp_wars-w49.15`) added the Dinosaur seats.
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`).
      "ICE_FOLK",
    ]);
    expect(armyPlayFactionV7("MARTIAN")).toBe(true);
    expect(armyPlayFactionV7("DWARF")).toBe(false);
    // Shield Projector, Ray Gunner, Brain (third since step two of the
    // Martian pass, `pulp_wars-w49.25`; it was fifth), Shock Trooper (the
    // ninth unit, 7r55), Tripod, Saucer, Mothership.
    expect(ARMY_RESEARCH_ROLES_V7.MARTIAN).toEqual([
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "SWORDSMAN",
      "CATAPULT",
      "RAIDER",
      "KNIGHT",
    ]);
    // The other three orders are as the Undead pass left them.
    expect(ARMY_RESEARCH_ROLES_V7.ORIGINAL).toEqual([
      "MARKSMAN",
      "GUARD",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
      "CAPTAIN",
    ]);
    // (7r55: the Wight and the Ogre follow the support unit.)
    expect(ARMY_RESEARCH_ROLES_V7.UNDEAD).toEqual([
      "GUARD",
      "MARKSMAN",
      "CATAPULT",
      "CAPTAIN",
      "SWORDSMAN",
      "KNIGHT",
    ]);
    expect(ARMY_RESEARCH_ROLES_V7.GOBLIN).toEqual([
      "MARKSMAN",
      "RAIDER",
      // Step two of the Goblin pass (`pulp_wars-w49.23`): the Ogre third.
      "SWORDSMAN",
      "GUARD",
      "CATAPULT",
      "CAPTAIN",
      "KNIGHT",
    ]);
    expect(armySharesV7("MARTIAN", false)).toEqual({
      LINE: 40,
      DEFENDER: 15,
      RANGED: 15,
      SIEGE: 20,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("MARTIAN", true)).toEqual({
      LINE: 35,
      DEFENDER: 15,
      RANGED: 15,
      SIEGE: 25,
      BREAKTHROUGH: 10,
    });
    expect([
      ARMY_MARTIAN_SKIRMISHER_PER_UNITS_V7,
      ARMY_MARTIAN_SKIRMISHER_MAXIMUM_V7,
      ARMY_FORCE_FIELDS_PROJECTORS_V7,
      ARMY_HEAT_SINKS_RAY_GUNNERS_V7,
    ]).toEqual([6, 2, 1, 2]);
  });

  it("is on in a match of Humans, Goblins, Undead, and Martians, and off with another faction", () => {
    const pieces = [own("FIGHTER", 8, 7), foe("FIGHTER", 2, 7)];
    for (const opponent of ["ORIGINAL", "GOBLIN", "UNDEAD"] as const) {
      expect(
        inspectNormalArmyV7(viewOf(asMartian(pieces, {}, opponent))).army,
        opponent,
      ).toBe(true);
      // The other seat of the same match plays them too.
      expect(
        inspectNormalArmyV7(viewOf(againstMartian(pieces, {}, opponent))).army,
        opponent,
      ).toBe(true);
    }
    // (Against a Dinosaur seat too since the Dinosaur pass.)
    expect(
      inspectNormalArmyV7(viewOf(asMartian(pieces, {}, "DINOSAUR"))).army,
    ).toBe(true);
    // (And against an Ice Folk seat since step two of the Ice Folk pass,
    // `pulp_wars-w49.27`.)
    expect(
      inspectNormalArmyV7(viewOf(asMartian(pieces, {}, "ICE_FOLK"))).army,
    ).toBe(true);
    for (const opponent of ["DWARF", "CANDY"] as const)
      expect(
        inspectNormalArmyV7(viewOf(asMartian(pieces, {}, opponent))).army,
        opponent,
      ).toBe(false);
  });

  /** The research target of a Martian seat with these technologies. */
  const research = (
    techs: readonly TechnologyIdV7[],
    extra: readonly MartianPieceV7[] = [],
  ) =>
    inspectNormalArmyV7(
      viewOf(
        asMartian([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2), ...extra], {
          techs: { 0: techs, 1: [] },
          coins: 40,
        }),
      ),
    ).research;

  it("researches the Projector, the Ray Gunner, the Brain, the Tripod, the Shock Trooper, the Saucer, the Mothership", () => {
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Projector is
    // at Force Fields, one technology behind the root.
    expect(research(techsOf("GATHERING"))).toMatchObject({
      tech: "DRILL",
      unlocks: null,
    });
    expect(research(techsOf("GATHERING", "DRILL"))).toMatchObject({
      tech: "FORTIFICATION",
      unlocks: "GUARD",
    });
    // One growth technology owned, so the order alone decides.
    const grown = ["GATHERING", "FARMING", "DRILL", "FORTIFICATION"] as const;
    expect(research(techsOf(...grown))).toMatchObject({ tech: "HUNTING" });
    expect(research(techsOf(...grown, "HUNTING"))).toMatchObject({
      tech: "MARKSMANSHIP",
      unlocks: "MARKSMAN",
    });
    // Step two of the Martian pass (`pulp_wars-w49.25`): the Brain third
    // (the Shock Trooper followed the Ray Gunner from 7r55, and the Brain
    // came after the Tripod).
    const rays = [...grown, "HUNTING", "MARKSMANSHIP"] as const;
    expect(research(techsOf(...rays))).toMatchObject({
      tech: "ADMINISTRATION",
      unlocks: "CAPTAIN",
    });
    // Then the Tripod (one Fighter in sight is no melee army:
    // `tests/unit/ruleset-v7-martian-step2.test.ts` has the other case),
    // then the Shock Trooper.
    const brain = [...rays, "ADMINISTRATION"] as const;
    expect(research(techsOf(...brain))).toMatchObject({ tech: "FORESTRY" });
    expect(research(techsOf(...brain, "FORESTRY"))).toMatchObject({
      tech: "SAWMILLING",
      unlocks: "CATAPULT",
    });
    const tripod = [...brain, "FORESTRY", "SAWMILLING"] as const;
    expect(research(techsOf(...tripod))).toMatchObject({ tech: "ENGINEERING" });
    expect(research(techsOf(...tripod, "ENGINEERING"))).toMatchObject({
      tech: "METALLURGY",
      unlocks: "SWORDSMAN",
    });
    // A Shock Trooper's chain that is begun is finished before the
    // Tripod's is started.
    expect(research(techsOf(...brain, "ENGINEERING"))).toMatchObject({
      tech: "METALLURGY",
      unlocks: "SWORDSMAN",
    });
    const heavy = [...tripod, "ENGINEERING", "METALLURGY"] as const;
    expect(research(techsOf(...heavy))).toMatchObject({
      tech: "SCOUTING",
      unlocks: "RAIDER",
    });
    expect(research(techsOf(...heavy, "SCOUTING"))).toMatchObject({
      tech: "RAIDING",
    });
  });

  it("researches Force Fields once it fields a Projector, and Heat Sinks with two Ray Gunners", () => {
    const grown = [
      "GATHERING",
      "FARMING",
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
      "HUNTING",
      "MARKSMANSHIP",
    ] as const;
    // The Industry reshuffle (7r56): Force Fields is the Projector's own
    // technology, the first of the order, Projector or no Projector (a
    // seat that fields one without it, a unit it was given, researches it
    // by the older rule too).
    expect(research(techsOf(...grown))).toMatchObject({
      tech: "FORTIFICATION",
      unlocks: "GUARD",
    });
    expect(research(techsOf(...grown), [own("GUARD", 7, 7)])).toMatchObject({
      tech: "FORTIFICATION",
    });
    // With it: on to the Brain (the Tripod until step two of the Martian
    // pass, `pulp_wars-w49.25`), and with two Ray Gunners Heat Sinks first.
    expect(research(techsOf(...grown, "FORTIFICATION"))).toMatchObject({
      tech: "ADMINISTRATION",
    });
    expect(
      research(techsOf(...grown, "FORTIFICATION"), [
        own("MARKSMAN", 7, 7),
        own("MARKSMAN", 9, 7),
      ]),
    ).toMatchObject({ tech: "FIELDCRAFT" });
    const late = [
      ...grown,
      "FORTIFICATION",
      "FORESTRY",
      "SAWMILLING",
      "ADMINISTRATION",
      "SCOUTING",
    ] as const;
    // One Ray Gunner: on to the Mothership; two: Heat Sinks first.
    expect(research(techsOf(...late), [own("MARKSMAN", 7, 7)])).toMatchObject({
      tech: "RAIDING",
    });
    expect(
      research(techsOf(...late), [
        own("MARKSMAN", 7, 7),
        own("MARKSMAN", 9, 7),
      ]),
    ).toMatchObject({ tech: "FIELDCRAFT" });
  });

  it("buys one growth technology after the Projector's and before the Ray Gunner's (economy first)", () => {
    // Fertile Ground in the capital's land and no technology that builds
    // population: Farming before Hunting.
    const base = asMartian([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2)], {
      techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
      coins: 40,
    });
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at(9, 9))
            ? { ...tile, resource: "FERTILE_GROUND" as const }
            : tile,
        ),
      },
    };
    expect(inspectNormalArmyV7(viewOf(state)).research).toMatchObject({
      tech: "FARMING",
      growth: true,
    });
    // Before the Projector's technology the order comes first.
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

  it("fields two fifths Grunts and a fifth Tripods, a Saucer for six units, no Mothership as a garrison", () => {
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
          "KNIGHT",
        ] as const
      )
        .map(
          (role) =>
            [role, armyRoleScoreV7("MARTIAN", role, army, threatened)] as const,
        )
        .sort((left, right) => right[1] - left[1])
        .map(([role]) => role);
    // Six Grunts: the Tripod first, and a Saucer is wanted.
    const grunts = counts({ LINE: 6 });
    expect(order(grunts, false)[0]).toBe("CATAPULT");
    expect(armyRoleScoreV7("MARTIAN", "RAIDER", grunts, false)).toBeGreaterThan(
      0,
    );
    expect(
      armyRoleScoreV7("MARTIAN", "RAIDER", counts({ LINE: 5 }), false),
    ).toBeLessThan(10);
    // Two Saucers are the most: a third is not wanted with eighteen units.
    expect(
      armyRoleScoreV7(
        "MARTIAN",
        "RAIDER",
        counts({ LINE: 16, SKIRMISHER: 2 }),
        false,
      ),
    ).toBeLessThan(10);
    // On a threatened or frontier center: a Grunt before a Projector
    // beyond its share, and the Tripod and the Mothership last.
    expect([
      ARMY_MARTIAN_FRONT_LINE_VALUE_V7,
      ARMY_MARTIAN_FRONT_DEFENDER_VALUE_V7,
    ]).toEqual([200, 100]);
    const mixed = counts({ LINE: 4, DEFENDER: 2, RANGED: 2, SIEGE: 2 });
    expect(armyRoleScoreV7("MARTIAN", "FIGHTER", mixed, true)).toBeGreaterThan(
      armyRoleScoreV7("MARTIAN", "GUARD", mixed, true),
    );
    for (const role of ["CATAPULT", "KNIGHT"] as const)
      expect(armyRoleScoreV7("MARTIAN", role, mixed, true)).toBeLessThan(
        armyRoleScoreV7("MARTIAN", "GUARD", mixed, true),
      );
    expect(order(mixed, true).at(-1)).toBe("KNIGHT");
    // Without a Projector on the board the first one comes before a Grunt.
    expect(order(counts({ LINE: 4 }), true)[0]).toBe("GUARD");
    // A Human seat's threatened city still trains its Guard first.
    expect(armyRoleScoreV7("ORIGINAL", "GUARD", mixed, true)).toBeGreaterThan(
      armyRoleScoreV7("ORIGINAL", "FIGHTER", mixed, true),
    );
  });

  /** A capital with four Grunts around it and a far Human unit. */
  const capital = (coins: number, enemyAt: CoordV7 = at(2, 2)) =>
    orphaned(
      asMartian(
        [
          own("FIGHTER", 8, 7),
          own("FIGHTER", 7, 7),
          own("FIGHTER", 9, 7),
          own("FIGHTER", 7, 9),
          foe("FIGHTER", enemyAt.x, enemyAt.y),
        ],
        { coins },
      ),
    );

  it("trains a Tripod as soon as it has the Coins, and keeps the Coins for it", () => {
    expect(trained(capital(9))).toMatchObject([
      { kind: "TRAIN", role: "CATAPULT" },
    ]);
    // 7 or 8 Coins and a level-1 capital's income: nothing is trained, so
    // that the Tripod is next turn.
    expect(trained(capital(7))).toEqual([]);
    expect(trained(capital(8))).toEqual([]);
    // Too far from the price: the Coins go to a cheaper unit.
    expect(trained(capital(4))).toHaveLength(1);
    expect(trained(capital(4))[0]).not.toMatchObject({ role: "CATAPULT" });
    // An enemy two tiles from the center: the city trains a body now.
    expect(trained(capital(8, at(8, 10)))).toHaveLength(1);
  });

  it("trains a Grunt onto a threatened center once it has its Projector, never a Mothership", () => {
    const state = orphaned(
      asMartian(
        [
          own("FIGHTER", 9, 6),
          own("GUARD", 9, 7),
          own("FIGHTER", 7, 7),
          foe("FIGHTER", 6, 8),
          foe("FIGHTER", 6, 7),
        ],
        { coins: 20 },
      ),
    );
    // (The ninth unit, 7r55: the line unit its 20 Coins reach is the Shock
    // Trooper, the dearer of the two.)
    expect(trained(state)).toMatchObject([
      { kind: "TRAIN", role: "SWORDSMAN" },
    ]);
  });
});

describe("the Martian pass: the Normal AI's units", () => {
  it("shoots from two tiles and steps back from a unit beside it before it shoots", () => {
    // Two tiles from a Fighter: the shot, and no Move toward it.
    const apart = asMartian([own("FIGHTER", 6, 3), foe("FIGHTER", 4, 3)]);
    expect(unitScored(apart, at(6, 3))[0]?.command).toMatchObject({
      kind: "ATTACK",
    });
    expect(
      unitScored(apart, at(6, 3)).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          gap(endOf(candidate.command) ?? at(0, 0), at(4, 3)) <= 1,
      ),
    ).toBe(false);
    // Beside it: the step back to two tiles first.
    const beside = asMartian([own("FIGHTER", 5, 3), foe("FIGHTER", 4, 3)]);
    const best = unitScored(beside, at(5, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ARMY_STEP_BACK_PRIORITY_V7);
    expect(gap(endOf(best?.command as CommandV7) ?? at(0, 0), at(4, 3))).toBe(
      2,
    );
  });

  it("takes a free village with a Grunt before it shoots at an enemy it does not kill", () => {
    const state = asMartian([own("FIGHTER", 6, 5), foe("FIGHTER", 4, 3)]);
    const best = unitScored(state, at(6, 5))[0];
    expect(best?.command).toMatchObject({ kind: "MOVE" });
    expect(endOf(best?.command as CommandV7)).toEqual(at(5, 5));
    expect(best?.score.priority).toBe(ARMY_VILLAGE_PRIORITY_V7);
  });

  it("commits a line with the numbers: every Grunt moves to a shot", () => {
    // Three tiles from two Marksmen (whose own shots reach two tiles).
    const state = asMartian([
      own("FIGHTER", 1, 4),
      own("FIGHTER", 2, 4),
      own("FIGHTER", 3, 4),
      own("FIGHTER", 4, 4),
      foe("MARKSMAN", 2, 1),
      foe("MARKSMAN", 3, 1),
    ]);
    const army = inspectNormalArmyV7(viewOf(state));
    expect(army.modes.map((entry) => entry.mode)).toEqual([
      "COMMIT",
      "COMMIT",
      "COMMIT",
      "COMMIT",
    ]);
    for (const where of [at(1, 4), at(2, 4), at(3, 4), at(4, 4)]) {
      const best = unitScored(state, where)[0];
      expect(best?.command.kind).toBe("MOVE");
      // To two tiles from an enemy, not beside one.
      const end = endOf(best?.command as CommandV7) ?? at(0, 0);
      expect(Math.min(gap(end, at(2, 1)), gap(end, at(3, 1)))).toBe(2);
    }
    // Villages first (the opening, with a free village known): no Grunt
    // steps into the reach of Fighters outside its land.
    const melee = asMartian([
      own("FIGHTER", 1, 4),
      own("FIGHTER", 2, 4),
      own("FIGHTER", 3, 4),
      own("FIGHTER", 4, 4),
      foe("FIGHTER", 2, 1),
      foe("FIGHTER", 3, 1),
    ]);
    expect(
      scored(melee).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          (endOf(candidate.command) ?? at(0, 9)).y < 4,
      ),
    ).toBe(false);
  });

  it("makes no Shield Projector attack that takes back more than it deals, and takes its kill", () => {
    const guard = asMartian([
      own("GUARD", 5, 3),
      own("FIGHTER", 6, 3),
      foe("GUARD", 4, 3),
    ]);
    expect(
      unitScored(guard, at(5, 3)).some(
        (candidate) => candidate.command.kind === "ATTACK",
      ),
    ).toBe(false);
    const wounded = asMartian([
      own("GUARD", 5, 3),
      own("FIGHTER", 6, 3),
      foe("GUARD", 4, 3, { hp: 2 }),
    ]);
    expect(unitScored(wounded, at(5, 3))[0]?.command).toMatchObject({
      kind: "ATTACK",
    });
  });

  it("values a Projector's Move beside the units it stands with", () => {
    // Three Grunts in a row two tiles ahead; the Projector's step that
    // touches two of them is worth two escorts more than the one that
    // touches none.
    const state = asMartian([
      own("FIGHTER", 1, 3),
      own("FIGHTER", 2, 3),
      own("FIGHTER", 3, 3),
      own("GUARD", 2, 5),
      foe("FIGHTER", 2, 0),
      foe("FIGHTER", 1, 0),
    ]);
    // (The fixture's capital has no garrison; the Moves back toward it
    // are another rule's.)
    const moves = unitScored(state, at(2, 5)).filter(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        (endOf(candidate.command) ?? at(0, 9)).y < 5,
    );
    const to = (where: CoordV7) =>
      moves.find((candidate) =>
        same(endOf(candidate.command) ?? at(0, 0), where),
      );
    expect(to(at(2, 4))).toBeDefined();
    expect(endOf(moves[0]?.command as CommandV7)).toEqual(at(2, 4));
    expect(
      (to(at(2, 4))?.score.strategicValue ?? 0) -
        (to(at(1, 4))?.score.strategicValue ?? 0),
    ).toBeGreaterThan(0);
    expect(ARMY_ESCORT_VALUE_V7).toBe(6);
  });

  it("flies a Saucer in for its own kill only, and out of the enemy's reach", () => {
    // A healthy Fighter with two Marksmen behind it: the Saucer does not
    // fly beside it (its hit does not kill), with or without its Grunts.
    const healthy = asMartian([
      own("RAIDER", 6, 4),
      own("FIGHTER", 6, 3),
      own("FIGHTER", 6, 2),
      foe("FIGHTER", 3, 3),
      foe("MARKSMAN", 2, 3),
      foe("MARKSMAN", 2, 2),
    ]);
    expect(
      unitScored(healthy, at(6, 4)).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          gap(endOf(candidate.command) ?? at(0, 0), at(3, 3)) <= 1,
      ),
    ).toBe(false);
    // Wounded, two tiles from two Marksmen: it flies out before it
    // recovers.
    const hurt = asMartian([
      own("RAIDER", 5, 3, { hp: 2 }),
      own("FIGHTER", 8, 3),
      foe("MARKSMAN", 3, 3),
      foe("MARKSMAN", 3, 2),
    ]);
    const best = unitScored(hurt, at(5, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ARMY_CARRIER_KEEP_OUT_PRIORITY_V7);
    const end = endOf(best?.command as CommandV7) ?? at(0, 0);
    expect(Math.min(gap(end, at(3, 3)), gap(end, at(3, 2)))).toBeGreaterThan(3);
  });

  it("still delivers a Grunt by Beam Down to a tile it shoots from", () => {
    const state = asMartian([
      own("RAIDER", 6, 3),
      own("FIGHTER", 8, 2),
      own("FIGHTER", 9, 4, { activation: { moved: true, handled: true } }),
      foe("FIGHTER", 7, 6),
    ]);
    const best = unitScored(state, at(6, 3))[0];
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_ATTACK_PRIORITY_V7);
  });

  it("still pulls a unit into a kill and takes the dearest wounded unit with a Brain", () => {
    // A Guard three tiles from two unmoved Ray Gunners: the Saucer's pull
    // brings it into both rays (10 and 7 of its 17 HP).
    const pull = asMartian([
      own("MARKSMAN", 3, 4),
      own("MARKSMAN", 5, 4),
      own("RAIDER", 4, 3),
      foe("GUARD", 4, 1),
    ]);
    const tractor = scored(pull).find(
      (candidate) => candidate.command.kind === "TRACTOR_BEAM",
    );
    expect(tractor?.score.priority).toBe(TRACTOR_KILL_SETUP_PRIORITY_V7);
    // A wounded Fighter and a wounded Knight in a Brain's range: the Knight.
    const control = asMartian([
      own("CAPTAIN", 5, 4),
      foe("FIGHTER", 4, 2, { hp: 4 }),
      foe("KNIGHT", 6, 2, { hp: 4 }),
    ]);
    const best = unitScored(control, at(5, 4))[0];
    expect(best?.command).toMatchObject({
      kind: "MIND_CONTROL",
      targetUnitId: unitAtV7(control, at(6, 2)).id,
    });
    expect(best?.score.priority).toBe(MIND_CONTROL_PRIORITY_V7);
  });
});

describe("the Martian pass: LAB_MARTIAN_MID", () => {
  it("stages the Martians for the hand player with every unit trainable, on land that is not bare", () => {
    const mission = missionByIdV7("LAB_MARTIAN_MID");
    if (mission === null) throw new Error("lab missing");
    expect(mission.hidden).toBe(true);
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    expect(setup.factions).toEqual(["MARTIAN", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.viewer.faction).toBe("MARTIAN");
    const count = (seat: number): Record<string, number> => {
      const owner = state.players.find((player) => player.seat === seat);
      const counts: Record<string, number> = {};
      for (const unit of state.units)
        if (unit.ownerId === owner?.id)
          counts[unit.role] = (counts[unit.role] ?? 0) + 1;
      return counts;
    };
    // 5 Grunts, 2 Shield Projectors, 2 Saucers, 2 Ray Gunners, a Brain, 2
    // Tripods, a Mothership: 15 units.
    expect(count(0)).toEqual({
      CAPTAIN: 1,
      CATAPULT: 2,
      KNIGHT: 1,
      GUARD: 2,
      FIGHTER: 5,
      RAIDER: 2,
      MARKSMAN: 2,
    });
    // The Human side of `LAB_GOBLIN_MID` and `LAB_UNDEAD_MID`: 17 units.
    expect(count(1)).toEqual({
      GUARD: 2,
      CATAPULT: 2,
      KNIGHT: 2,
      FIGHTER: 5,
      MARKSMAN: 3,
      SWORDSMAN: 3,
    });
    const worth = (seat: number, faction: FactionIdV7): number =>
      Object.entries(count(seat)).reduce(
        (total, [role, units]) =>
          total +
          units *
            (effectiveRoleRuleV7(role as UnitRoleIdV7, faction).cost ?? 0),
        0,
      );
    // (7r55: the three Champions cost 6 each, 80 for the Human side.)
    expect([worth(0, "MARTIAN"), worth(1, "ORIGINAL")]).toEqual([70, 80]);
    const cities = (seat: number): number[] => {
      const owner = state.players.find((player) => player.seat === seat);
      return state.cities
        .filter((city) => city.ownerId === owner?.id)
        .map((city) => city.level);
    };
    expect(cities(0)).toEqual([4, 3, 3, 2, 2]);
    expect(cities(1)).toEqual([4, 3, 3, 2, 2]);
    // 35 Coins in hand on the first turn; thirteen technologies (revision 2
    // of the lab, 7r55: Engineering and Metallurgy, for the Shock
    // Trooper; revision 3, 7r56, the Industry reshuffle: Force Fields, for
    // the Shield Projector), without Heat Sinks and Farming.
    expect(view.viewer.coins).toBe(35);
    expect(view.viewer.researchedTechs).toHaveLength(13);
    expect(view.viewer.researchedTechs).toContain("FORTIFICATION");
    for (const tech of ["FIELDCRAFT", "FARMING"] as const)
      expect(view.viewer.researchedTechs).not.toContain(tech);
    // Every Martian unit starts at its Shield maximum: its own, or 4 next
    // to a Shield Projector (revision 3: the seat owns Force Fields).
    const shields = state.units
      .filter((item) => item.ownerId === state.humanPlayerId)
      .map((unit) => {
        const shield = state.shields.find(
          (entry) => entry.unitId === unit.id,
        )?.shield;
        const own = roleMechanicsV7(unit.role, "MARTIAN").shield;
        expect([own, 4], unit.role).toContain(shield);
        return shield === own ? "OWN" : "FIELD";
      });
    expect(shields).toContain("FIELD");
    expect(shields).toContain("OWN");
    // Every Martian unit is offered where its slots are free, the
    // two-slot Mothership in none of the three cities with one slot.
    const offered = queryPlayerCommandsV7(view);
    expect(
      [
        ...new Set(
          offered.flatMap((command) =>
            command.kind === "TRAIN" ? [command.role] : [],
          ),
        ),
      ].sort(),
    ).toEqual([
      "CAPTAIN",
      "CATAPULT",
      "FIGHTER",
      "GUARD",
      "MARKSMAN",
      "RAIDER",
      "SWORDSMAN",
    ]);
    expect(
      new Set(
        offered.flatMap((command) =>
          command.kind === "TRAIN" ? [command.cityId] : [],
        ),
      ).size,
    ).toBe(3);
    // The land: Forest, Fertile Ground, and Ore in both sides' territory,
    // and the growth a seat can research toward on offer.
    for (const seat of [0, 1]) {
      const owner = state.players.find((player) => player.seat === seat);
      const land = state.board.tiles.filter((tile) => {
        const city = state.cities.find(
          (item) => item.id === tile.territoryCityId,
        );
        return city?.ownerId === owner?.id;
      });
      const has = (test: (tile: (typeof land)[number]) => boolean): number =>
        land.filter(test).length;
      expect(
        has((tile) => tile.terrain === "FOREST"),
        `seat ${seat}`,
      ).toBeGreaterThanOrEqual(8);
      expect(has((tile) => tile.resource === "FERTILE_GROUND")).toBe(7);
      expect(has((tile) => tile.resource === "ORE")).toBe(3);
      expect(has((tile) => tile.resource === "GAME")).toBe(2);
      expect(has((tile) => tile.improvement === "LUMBER_CAMP")).toBe(4);
    }
    expect(
      offered
        .filter((command) => command.kind === "RESEARCH")
        .map((command) => (command.kind === "RESEARCH" ? command.tech : null)),
    ).toEqual(
      expect.arrayContaining([
        "FARMING",
        "PLANNING",
        "EXPLOSIVES",
        "FIELDCRAFT",
      ]),
    );
    expect(offered.some((command) => command.kind === "HUNT_GAME")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The correction after three hand-played games (section 13 of the tuning
// document): the Force Field holds one attack, Psychic Command every second
// turn, Release, and the Normal AI's rules for a Martian and a Human seat.

describe("the Martian pass, correction: the Force Field holds", () => {
  const knightOn = (
    role: MartianPieceV7["role"],
    extra: Partial<MartianPieceV7>,
  ) =>
    previewAt(
      againstMartian([own("KNIGHT", 4, 2), foe(role, 4, 3, extra)]),
      at(4, 2),
      at(4, 3),
    );

  it("leaves a full-HP unit with a whole field at 1 HP, whatever the attack", () => {
    // A Knight's 13 on a Grunt (8 HP, Shield 4): 7 HP, not 8.
    expect(knightOn("FIGHTER", { shield: 4 })).toMatchObject({
      defenderDies: false,
      damageToDefender: 7,
      defenderShieldDamage: 4,
      advances: false,
    });
    // A Ray Gunner and a Brain too (8 HP: 7). A fielded Tripod (12 HP)
    // takes the Knight's 14 as 4 and 10 and lives without the rule.
    for (const role of ["MARKSMAN", "CAPTAIN"] as const)
      expect(knightOn(role, { shield: 4 }), role).toMatchObject({
        defenderDies: false,
        damageToDefender: 7,
      });
    expect(knightOn("CATAPULT", { shield: 4 })).toMatchObject({
      defenderDies: false,
      damageToDefender: 10,
    });
    // On a walled center too (a tester's Knight killed a Grunt there).
    expect(knightOn("FIGHTER", { shield: 2 }).defenderDies).toBe(true);
  });

  it("does not hold a wounded unit, a dented field, or a Shield that is the unit's own", () => {
    expect(knightOn("FIGHTER", { shield: 4, hp: 7 }).defenderDies).toBe(true);
    expect(knightOn("FIGHTER", { shield: 3 }).defenderDies).toBe(true);
    expect(knightOn("FIGHTER", { shield: 2 }).defenderDies).toBe(true);
    // A Mothership's 4 is its own maximum: no field, and no change.
    expect(roleMechanicsV7("KNIGHT", "MARTIAN").shield).toBe(
      FORCE_FIELD_SHIELD_V7,
    );
    expect(
      forceFieldHoldsV7(
        viewOf(asMartian([own("KNIGHT", 4, 4)])),
        unitAtV7(asMartian([own("KNIGHT", 4, 4)]), at(4, 4)),
        4,
      ),
    ).toBe(false);
  });

  it("holds once: the hit spends the Shield, and the next attack kills", () => {
    const state = againstMartian([
      own("KNIGHT", 4, 2),
      own("KNIGHT", 5, 2),
      foe("FIGHTER", 4, 3, { shield: 4 }),
      foe("FIGHTER", 5, 4, { shield: 4 }),
    ]);
    const first = attackV7(state, at(4, 2), at(4, 3));
    expect(unitAtV7(first.state, at(4, 3))).toMatchObject({ hp: 1 });
    expect(shieldAtV7(first.state, at(4, 3))).toBe(0);
    // The first Knight's ride did not start (no kill, no second attack).
    expect(unitAtV7(first.state, at(4, 2)).activation.overrunActive).toBe(
      false,
    );
    // The second Knight kills it, rides on, and the next field holds.
    const second = previewAt(first.state, at(5, 2), at(4, 3));
    expect(second).toMatchObject({ defenderDies: true, advances: true });
  });

  it("says so in the preview, on the Projector, the technology, and the Help page", () => {
    const state = againstMartian([
      own("KNIGHT", 4, 2),
      foe("FIGHTER", 4, 3, { shield: 4 }),
    ]);
    const preview = previewAt(state, at(4, 2), at(4, 3));
    expect(martianCombatLinesV7(viewOf(state), preview).notes).toContain(
      FORCE_FIELD_HOLDS_V7,
    );
    expect(FORCE_FIELD_HOLDS_V7).toBe("Force Field holds: 1 HP left");
    // Not on a hit that kills or one a plain Shield takes.
    const plain = againstMartian([own("KNIGHT", 4, 2), foe("FIGHTER", 4, 3)]);
    expect(
      martianCombatLinesV7(viewOf(plain), previewAt(plain, at(4, 2), at(4, 3)))
        .notes,
    ).not.toContain(FORCE_FIELD_HOLDS_V7);
    expect(FORCE_FIELDS_UNLOCK_TEXT_V7).toBe(
      "Shield Projectors raise the Shields of units next to them to 4, and at full HP one attack cannot kill such a unit; Shields also recharge at the end of your turn",
    );
    expect(martianAbilityDescriptionV7("FORCE_FIELD", "MARTIAN")).toBe(
      `With Force Fields: own units next to it recharge their Shield to 4. ${FORCE_FIELD_HOLDS_RULE_V7}`,
    );
    expect(new Map(martianHelpRulesV7()).get("Force Field")).toContain(
      FORCE_FIELD_HOLDS_RULE_V7,
    );
  });
});

describe("the Martian pass, correction: Psychic Command every second turn", () => {
  const field = () =>
    asMartian([
      own("CAPTAIN", 4, 5),
      own("FIGHTER", 3, 4),
      own("FIGHTER", 5, 4),
      foe("SWORDSMAN", 4, 2),
    ]);
  const brainId = (state: GameStateV7) => unitAtV7(state, at(4, 5)).id;
  const rallyOffered = (state: GameStateV7): boolean =>
    queryPlayerCommandsV7(viewOf(state)).some(
      (command) => command.kind === "RALLY",
    );
  const nextOwnTurn = (state: GameStateV7): GameStateV7 =>
    endTurnUntilV7(state, seatIdV7(state, 0)).state;

  it("leaves the Brain Cooling for its next turn, and a Cooling Brain cannot command", () => {
    expect(roleMechanicsV7("CAPTAIN", "MARTIAN").rallyCools).toBe(true);
    const start = field();
    const commanded = playV7(start, { kind: "RALLY", unitId: brainId(start) });
    expect(commanded.state.cooling).toEqual([
      { unitId: brainId(start), firedThisTurn: true },
    ]);
    // Its next turn: Cooling, not offered, refused.
    const cooling = nextOwnTurn(commanded.state);
    expect(cooling.cooling).toEqual([
      { unitId: brainId(start), firedThisTurn: false },
    ]);
    expect(rallyOffered(cooling)).toBe(false);
    expect(
      rejectedV7(cooling, { kind: "RALLY", unitId: brainId(start) }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // Mind Control and its Move are not held by it.
    expect(
      queryPlayerCommandsV7(viewOf(cooling)).some(
        (command) =>
          command.kind === "MOVE" && command.unitId === brainId(start),
      ),
    ).toBe(true);
    // The turn after: ready again.
    const ready = nextOwnTurn(cooling);
    expect(ready.cooling).toEqual([]);
    expect(rallyOffered(ready)).toBe(true);
  });

  it("is the Brain's alone: a Human Captain rallies every turn", () => {
    for (const faction of FACTIONS)
      for (const role of ROSTER)
        expect(
          roleMechanicsV7(role, faction).rallyCools,
          `${faction} ${role}`,
        ).toBe(faction === "MARTIAN" && role === "CAPTAIN");
    const state = againstMartian([
      own("CAPTAIN", 4, 5),
      own("FIGHTER", 3, 4),
      foe("FIGHTER", 4, 1),
    ]);
    const rallied = playV7(state, {
      kind: "RALLY",
      unitId: unitAtV7(state, at(4, 5)).id,
    });
    expect(rallied.state.cooling).toEqual([]);
    expect(rallyOffered(nextOwnTurn(rallied.state))).toBe(true);
  });

  it("makes a commanded Grunt shoot like a Ray Gunner at full power, and leaves the Tripod above both", () => {
    // Swordsman, Guard, Knight: a commanded Grunt, a Ray Gunner, a Tripod.
    const shot = (
      shooter: MartianPieceV7["role"],
      target: MartianPieceV7["role"],
      inspired: boolean,
    ): number => {
      const base = asMartian([own(shooter, 4, 4), foe(target, 4, 2)]);
      const state: GameStateV7 = inspired
        ? {
            ...base,
            units: base.units.map((unit) =>
              same(unit.at, at(4, 4))
                ? {
                    ...unit,
                    activation: { ...unit.activation, inspired: true },
                  }
                : unit,
            ),
          }
        : base;
      return previewAt(state, at(4, 4), at(4, 2)).damageToDefender;
    };
    const targets = ["SWORDSMAN", "GUARD", "KNIGHT"] as const;
    expect(targets.map((target) => shot("FIGHTER", target, false))).toEqual([
      4, 6, 6,
    ]);
    expect(targets.map((target) => shot("FIGHTER", target, true))).toEqual([
      7, 10, 10,
    ]);
    expect(targets.map((target) => shot("MARKSMAN", target, false))).toEqual([
      7, 10, 10,
    ]);
    expect(targets.map((target) => shot("CATAPULT", target, false))).toEqual([
      11, 14, 13,
    ]);
  });
});

describe("the Martian pass, correction: Release", () => {
  const field = () =>
    asMartian([
      own("CAPTAIN", 5, 5),
      foe("SWORDSMAN", 5, 6, { hp: 3, controlledBy: at(5, 5) }),
      foe("FIGHTER", 1, 1),
    ]);

  it("returns a controlled unit to its owner where it stands, for no Coins", () => {
    const state = field();
    const unit = unitAtV7(state, at(5, 6));
    expect(unit.ownerId).toBe(seatIdV7(state, 0));
    const release: CommandV7 = { kind: "DISBAND", unitId: unit.id };
    const coins = state.players.find((player) => player.seat === 0)?.coins;
    const done = playV7(state, release);
    expect(done.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["UNIT_RELEASED"]),
    );
    expect(done.events.some((event) => event.kind === "UNIT_DISBANDED")).toBe(
      false,
    );
    expect(unitAtV7(done.state, at(5, 6))).toMatchObject({
      id: unit.id,
      ownerId: seatIdV7(state, 1),
      hp: 3,
      homeCityId: null,
    });
    expect(done.state.mindControlled).toEqual([]);
    expect(done.state.players.find((player) => player.seat === 0)?.coins).toBe(
      coins,
    );
    // The Brain lives and holds nothing.
    expect(unitAtV7(done.state, at(5, 5)).ownerId).toBe(seatIdV7(state, 0));
  });

  it("is never the Normal AI's choice", () => {
    const state = field();
    expect(
      scored(state).some((candidate) => candidate.command.kind === "DISBAND"),
    ).toBe(false);
  });
});

describe("the Martian pass, correction: the Martian seat of the Normal AI", () => {
  const research = (
    techs: readonly TechnologyIdV7[],
    extra: readonly MartianPieceV7[] = [],
  ) =>
    inspectNormalArmyV7(
      viewOf(
        asMartian([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2), ...extra], {
          techs: { 0: techs, 1: [] },
          coins: 40,
        }),
      ),
    ).research;

  it("researches Force Fields as soon as it fields a Projector, before the Ray Gunner", () => {
    // (The Industry reshuffle, 7r56: Force Fields is the Projector's own
    // technology and the first of the order.)
    const grown = ["GATHERING", "FARMING", "DRILL", "ENGINEERING"] as const;
    expect(research(techsOf(...grown))).toMatchObject({
      tech: "FORTIFICATION",
    });
    expect(research(techsOf(...grown), [own("GUARD", 7, 7)])).toMatchObject({
      tech: "FORTIFICATION",
    });
    expect(
      research(techsOf(...grown, "FORTIFICATION"), [own("GUARD", 7, 7)]),
    ).toMatchObject({ tech: "HUNTING" });
  });

  /** Fertile Ground by the capital, Gathering and Drill, and `coins`. */
  const economy = (coins: number, faction: FactionIdV7 = "MARTIAN") => {
    const techs =
      faction === "MARTIAN"
        ? techsOf("GATHERING", "DRILL", "FORTIFICATION")
        : techsOf("GATHERING", "HUNTING", "MARKSMANSHIP");
    const base = orphaned(
      martianFieldV7(
        [
          own("FIGHTER", 8, 7),
          // Step two of the Martian pass (`pulp_wars-w49.25`): three
          // Grunts, so that a Martian seat is not short of units (short
          // of them it trains before it researches and keeps no Coins).
          ...(faction === "MARTIAN"
            ? [own("FIGHTER", 9, 7), own("FIGHTER", 7, 7)]
            : []),
          foe("FIGHTER", 2, 2),
        ],
        {
          factions: [faction, faction === "MARTIAN" ? "ORIGINAL" : "MARTIAN"],
          techs: { 0: techs, 1: [] },
          coins,
        },
      ),
    );
    return {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at(9, 9))
            ? { ...tile, resource: "FERTILE_GROUND" as const }
            : tile,
        ),
      },
    } satisfies GameStateV7;
  };

  it("keeps the Coins for its economy technology instead of a unit a turn", () => {
    const poor = economy(4);
    const target = inspectNormalArmyV7(viewOf(poor)).research;
    expect(target).toMatchObject({ tech: "FARMING", growth: true });
    // 4 Coins, a technology it cannot pay yet: no unit that leaves less
    // than the price less one turn's income.
    expect(trained(poor)).toEqual([]);
    // With the Coins: the technology, before any unit.
    const rich = economy(target?.cost ?? 0);
    expect(scored(rich)[0]?.command).toMatchObject({
      kind: "RESEARCH",
      tech: "FARMING",
    });
  });

  it("trains a Shield Projector as the garrison of a contested center, and no Ray Gunner onto one", () => {
    // Two Human Fighters two tiles from the capital, no Projector by it.
    const bare = orphaned(
      asMartian(
        [
          own("FIGHTER", 9, 6),
          own("FIGHTER", 7, 6),
          foe("FIGHTER", 6, 8),
          foe("FIGHTER", 6, 7),
        ],
        { coins: 20 },
      ),
    );
    expect(trained(bare)).toMatchObject([{ kind: "TRAIN", role: "GUARD" }]);
    // With a Projector beside the center: a Grunt, never a Ray Gunner, a
    // Brain, or a Tripod.
    const held = orphaned(
      asMartian(
        [
          own("FIGHTER", 9, 6),
          own("GUARD", 9, 7),
          foe("FIGHTER", 6, 8),
          foe("FIGHTER", 6, 7),
        ],
        { coins: 20 },
      ),
    );
    // (The ninth unit, 7r55: with 20 Coins the line unit is the Shock
    // Trooper.)
    expect(trained(held)).toMatchObject([{ kind: "TRAIN", role: "SWORDSMAN" }]);
  });

  it("steps a Grunt out of a Knight's reach, and walks none into it", () => {
    // A Knight four tiles away reaches the Grunt (Move 3 and its attack).
    // (Away from the fixture's villages.) The Knight reaches four tiles:
    // its Move of 3 and its attack.
    const state = asMartian([
      own("FIGHTER", 1, 5),
      own("FIGHTER", 3, 7),
      foe("KNIGHT", 1, 1),
    ]);
    const best = unitScored(state, at(1, 5))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ARMY_STEP_BACK_PRIORITY_V7);
    expect(gap(endOf(best?.command as CommandV7) ?? at(0, 0), at(1, 1))).toBe(
      5,
    );
    // One tile further back: no Move takes it into the Knight's reach.
    const safe = asMartian([own("FIGHTER", 1, 6), foe("KNIGHT", 1, 1)]);
    expect(
      unitScored(safe, at(1, 6)).some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          gap(endOf(candidate.command) ?? at(0, 0), at(1, 1)) <= 4,
      ),
    ).toBe(false);
  });

  it("lets a fielded line stand in a Knight's reach (the field holds)", () => {
    const state = asMartian([
      own("FIGHTER", 1, 5, { shield: 4 }),
      own("GUARD", 1, 6),
      foe("KNIGHT", 1, 1),
    ]);
    expect(
      unitScored(state, at(1, 5)).some(
        (candidate) => candidate.score.priority === ARMY_STEP_BACK_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("pulls a Knight into a Tripod's shot before it charges", () => {
    // A Knight three tiles from an unmoved Tripod: the Saucer's pull brings
    // it to two tiles, where the Tripod's full ray kills it.
    const state = asMartian([
      own("CATAPULT", 4, 5),
      own("RAIDER", 4, 4),
      foe("KNIGHT", 4, 2),
    ]);
    const tractor = scored(state).find(
      (candidate) => candidate.command.kind === "TRACTOR_BEAM",
    );
    expect(tractor?.score.priority).toBe(TRACTOR_KILL_SETUP_PRIORITY_V7);
    expect(unitScored(state, at(4, 4))[0]?.command.kind).toBe("TRACTOR_BEAM");
  });

  it("beams a Grunt from its capital to a free village", () => {
    // The Saucer stands beside the village at (5, 5); two Grunts at the
    // capital (8, 8), five tiles away.
    const state = asMartian([
      own("RAIDER", 6, 6),
      own("FIGHTER", 8, 8),
      own("FIGHTER", 8, 7),
      foe("FIGHTER", 1, 1),
    ]);
    const beams = unitScored(state, at(6, 6)).filter(
      (candidate) => candidate.command.kind === "BEAM_DOWN",
    );
    expect(beams[0]?.score.priority).toBe(ARMY_VILLAGE_DELIVERY_PRIORITY_V7);
    const command = beams[0]?.command;
    if (command?.kind !== "BEAM_DOWN") throw new Error("no beam");
    expect(gap(command.to, at(5, 5))).toBe(1);
    // And a Saucer elsewhere flies to that village first.
    const far = asMartian([
      own("RAIDER", 9, 10),
      own("FIGHTER", 8, 8),
      own("FIGHTER", 8, 7),
      foe("FIGHTER", 1, 1),
    ]);
    const flight = unitScored(far, at(9, 10))[0];
    expect(flight?.score.priority).toBe(ARMY_VILLAGE_FERRY_PRIORITY_V7);
    const landing = endOf(flight?.command as CommandV7) ?? at(0, 0);
    expect(
      [at(5, 5), at(8, 5), at(5, 8)].some(
        (village) => gap(landing, village) === 1,
      ),
    ).toBe(true);
  });
});

describe("the Martian pass, correction: the Human seat of the Normal AI", () => {
  /** Seat 0 Human (the viewer) against seat 1 Martian. */
  const human = (
    pieces: readonly MartianPieceV7[],
    options: MartianFieldOptionsV7 = {},
  ) => againstMartian(pieces, options);

  it("takes an economy technology its land can use before its second unit technology", () => {
    const base = human([own("FIGHTER", 8, 7), foe("FIGHTER", 2, 2)], {
      techs: { 0: techsOf("GATHERING", "HUNTING", "MARKSMANSHIP"), 1: [] },
      coins: 40,
    });
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at(9, 9))
            ? { ...tile, resource: "FERTILE_GROUND" as const }
            : tile,
        ),
      },
    };
    expect(inspectNormalArmyV7(viewOf(state)).research).toMatchObject({
      tech: "FARMING",
      growth: true,
    });
    // Without land for it the order goes on: the Guard's Drill.
    expect(inspectNormalArmyV7(viewOf(base)).research).toMatchObject({
      tech: "DRILL",
    });
  });

  it("trains no Guard against an enemy that shoots, and one against an enemy that does not", () => {
    const front = (enemy: MartianPieceV7["role"]) =>
      orphaned(
        human(
          [
            own("FIGHTER", 10, 5),
            foe(enemy, 6, 8),
            foe(enemy, 6, 7),
            foe(enemy, 5, 8),
          ],
          { coins: 20 },
        ),
      );
    // Three Grunts (range 2) by the capital: no Guard.
    const shooters = trained(front("FIGHTER"));
    expect(shooters.length).toBeGreaterThan(0);
    expect(
      shooters.some((command) => "role" in command && command.role === "GUARD"),
    ).toBe(false);
    // Three Shield Projectors (range 1): the Guard is the garrison.
    expect(trained(front("GUARD"))).toMatchObject([
      { kind: "TRAIN", role: "GUARD" },
    ]);
  });

  it("does not ride a Knight ahead of its line into a firing line", () => {
    // A Knight five tiles from three Grunts, its Swordsmen two tiles
    // behind it: no Move without an attack ends alone in their reach.
    const state = human([
      own("KNIGHT", 5, 2),
      own("SWORDSMAN", 5, 0),
      foe("FIGHTER", 4, 7),
      foe("FIGHTER", 5, 7),
      foe("FIGHTER", 6, 7),
    ]);
    const moves = unitScored(state, at(5, 2)).filter(
      (candidate) => candidate.command.kind === "MOVE",
    );
    expect(moves.length).toBeGreaterThan(0);
    for (const candidate of moves) {
      const end = endOf(candidate.command) ?? at(0, 0);
      const alone = gap(end, at(5, 0)) > 1;
      // A Grunt steps one tile and shoots two.
      const inReach = [at(4, 7), at(5, 7), at(6, 7)].some(
        (grunt) => gap(end, grunt) <= 3,
      );
      expect(alone && inReach, JSON.stringify(end)).toBe(false);
    }
    // Nor onto the village in their reach (it took one with nothing
    // beside it and was pulled into a Tripod's shot).
    expect(
      moves.some((candidate) =>
        same(endOf(candidate.command) ?? at(0, 0), at(5, 5)),
      ),
    ).toBe(false);
  });

  it("walks a unit toward a city center the enemy left empty", () => {
    // The Martian capital (2, 8) with nobody on it; a Fighter two tiles
    // away and a Grunt further off.
    const state = human([own("FIGHTER", 1, 5), foe("FIGHTER", 8, 1)]);
    const best = unitScored(state, at(1, 5))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(gap(endOf(best?.command as CommandV7) ?? at(9, 9), at(2, 8))).toBe(
      2,
    );
    expect(best?.score.priority).toBe(ARMY_EMPTY_CENTER_PRIORITY_V7);
  });

  it("at war still builds the growth that leaves the Coins for any unit on offer", () => {
    // Covered by the replayed positions of the hand-played game in the
    // tuning document; here the rule's own gate: a Farm (5 Coins) with 14
    // Coins and a 9-Coin Knight the dearest unit on offer.
    const base = orphaned(
      human(
        [own("FIGHTER", 8, 7), foe("FIGHTER", 5, 8), foe("FIGHTER", 5, 7)],
        { coins: 14 },
      ),
    );
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, at(9, 9))
            ? { ...tile, resource: "FERTILE_GROUND" as const }
            : tile,
        ),
      },
    };
    const kinds = scored(state).map((candidate) => candidate.command.kind);
    expect(kinds).toContain("BUILD_FARM");
    expect(kinds).toContain("TRAIN");
    // With 13 Coins the Farm would leave 8: units only.
    const poor: GameStateV7 = {
      ...state,
      players: state.players.map((player) =>
        player.seat === 0 ? { ...player, coins: 13 } : player,
      ),
    };
    expect(
      scored(poor).map((candidate) => candidate.command.kind),
    ).not.toContain("BUILD_FARM");
  });
});
