import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import { ARMY_RESEARCH_ROLES_V7 } from "../../src/ai/v7-army";
import { technologySubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import {
  FACTION_IDS_V7,
  MISSION_REGISTRY_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SHARED_BASELINE_NODES_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_IDS_V7,
  TECHNOLOGY_SHARED_DISPLAY_NAMES_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { candyFieldV7, type CandyPieceV7 } from "../fixtures/v7-candy";
import { applyOkV7, seatIdV7 } from "../fixtures/v7-goblin-arena";
import { at, mountainV7, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * The Industry reshuffle (`pulp_wars-w49.21`, identity `pulp-wars-poc-7r56`;
 * docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): for every faction the
 * defender moved from the root of Industry to Fortification, the Workshop
 * from Engineering to the root, and the root is shown as "Crafting". No
 * unit, price, or other technology changed.
 *
 * Two-seat field (tests/fixtures/v7-candy.ts): seat 0 capital (8, 8) with
 * territory x 7-9, y 7-9; seat 1 capital (2, 8). Every other land tile is
 * open Grass and explored.
 */

const field = (
  pieces: readonly CandyPieceV7[],
  options: Parameters<typeof candyFieldV7>[1] = {},
): GameStateV7 =>
  candyFieldV7(pieces, { factions: ["ORIGINAL", "ORIGINAL"], ...options });

const offered = (state: GameStateV7): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, 0)));

const produces = (state: GameStateV7, role: string): boolean =>
  offered(state).some(
    (command) =>
      (command.kind === "TRAIN" || command.kind === "LAY_EGG") &&
      command.role === role,
  );

/** The unlocks of a node, a command by its name and the rest by kind. */
const unlocksOf = (faction: FactionIdV7, tech: TechnologyIdV7): string[] =>
  (
    factionTreeV7(faction).nodes.find((node) => node.id === tech)?.unlocks ?? []
  ).map((unlock) =>
    unlock.kind === "COMMAND"
      ? unlock.command
      : unlock.kind === "UNIT_ROLE"
        ? `UNIT:${unlock.role}`
        : unlock.kind,
  );

function policyTurn(start: GameStateV7): readonly CommandV7[] {
  const actor = seatIdV7(start, 0);
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    commands.push(command);
    if (command.kind === "END_TURN") return commands;
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

/** The defender of each faction and what its Fortification holds beside it. */
const FORTIFICATION: Readonly<
  Record<
    FactionIdV7,
    {
      readonly name: string;
      readonly defender: string;
      readonly keeps: string;
    }
  >
> = {
  ORIGINAL: {
    name: "Fortification",
    defender: "Guard",
    keeps: "BUILD_FIELD_DEFENSE",
  },
  UNDEAD: {
    name: "Fortification",
    defender: "Zombie",
    keeps: "BUILD_FIELD_DEFENSE",
  },
  GOBLIN: {
    name: "Fortification",
    defender: "Orc Brute",
    keeps: "BUILD_FIELD_DEFENSE",
  },
  DINOSAUR: { name: "Nesting", defender: "Ankylosaurus", keeps: "NESTING" },
  MARTIAN: {
    name: "Force Fields",
    defender: "Shield Projector",
    keeps: "FORCE_FIELDS",
  },
  ICE_FOLK: { name: "Deep Winter", defender: "Musk Ox", keeps: "DEEP_WINTER" },
  DWARF: { name: "Dig In", defender: "Steam Mole", keeps: "DIG_IN" },
  CANDY: {
    name: "Home Sweet Home",
    defender: "Marshmallow",
    keeps: "HOME_SWEET_HOME",
  },
};

/** Seat 0 with a Farm at (9, 9) and `techs` beside Gathering and Farming. */
const farmed = (
  faction: FactionIdV7,
  techs: readonly TechnologyIdV7[],
): GameStateV7 => {
  const base = patchTileV7(
    field([], {
      factions: [faction, "ORIGINAL"],
      techs: {
        0: TECHNOLOGY_IDS_V7.filter(
          (tech) =>
            tech === "GATHERING" || tech === "FARMING" || techs.includes(tech),
        ),
      },
    }),
    at(9, 9),
    { resource: "FERTILE_GROUND" },
  );
  const actor = seatIdV7(base, 0);
  let state = applyOkV7(base, actor, {
    kind: "BUILD_FARM",
    at: at(9, 9),
  }).state;
  // The Farm takes the level-1 capital to level 2: its reward first.
  for (const choice of state.pendingChoices)
    if (choice.kind === "CITY_REWARD")
      state = applyOkV7(state, actor, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: choice.cityId,
        reachedLevel: choice.reachedLevel,
        reward: "STOCKPILE",
      }).state;
  return state;
};

describe("the Industry reshuffle: identity", () => {
  it("was 7r56 after 7r55, with both save keys obsolete now", () => {
    // (Step two of the Undead pass, `pulp_wars-w49.24`, took 7r57, and
    // step two of the Martian pass, `pulp_wars-w49.25`, 7r58.)
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r59");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r59.current");
    expect(PRIOR_RULESET_7_IDS.slice(-4, -2)).toEqual([
      "pulp-wars-poc-7r55",
      "pulp-wars-poc-7r56",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-4, -2)).toEqual([
      "pulpWars.save.v7r55.current",
      "pulpWars.save.v7r56.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    // A 7r55 state has the shape of a current state and is refused by its
    // identity alone (no migration).
    const state = field([]);
    expect(parseGameStateV7(state)).not.toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r55",
        setup: { ...state.setup, rulesetId: "pulp-wars-poc-7r55" },
      }),
    ).toBeNull();
    // No technology ID changed.
    expect(TECHNOLOGY_IDS_V7).toEqual(
      SHARED_BASELINE_NODES_V7.map((node) => node.id),
    );
    expect(TECHNOLOGY_IDS_V7).toContain("DRILL");
  });
});

describe("the Industry reshuffle: the tree of every faction", () => {
  it("gives the Workshop at the root, with Reveal Ore and the Spoils, and no unit", () => {
    for (const faction of FACTION_IDS_V7) {
      expect(unlocksOf(faction, "DRILL"), faction).toEqual([
        "RESOURCE_REVEAL",
        "BUILD_WORKSHOP",
        "ECONOMIC_FORMULA",
        "FIRST_HOSTILE_CAPTURE_SPOILS",
      ]);
      const root = factionTreeV7(faction).nodes.find(
        (node) => node.id === "DRILL",
      );
      expect([root?.tier, root?.prerequisites, root?.unlockedRoles]).toEqual([
        1,
        [],
        [],
      ]);
      expect(technologyCapabilitiesV7(["DRILL"], faction).commands).toContain(
        "BUILD_WORKSHOP",
      );
      expect(
        technologyCapabilitiesV7(["DRILL"], faction).trainableRoles,
      ).not.toContain("GUARD");
    }
    // The rule and the price of the Workshop are unchanged.
    expect(SPATIAL_ECONOMIC_ACTIONS_V7.BUILD_WORKSHOP).toEqual({
      command: "BUILD_WORKSHOP",
      technology: "DRILL",
      cost: 4,
      improvement: "WORKSHOP",
      placementMinimum: 1,
    });
  });

  it("keeps Mountains, the Mine, and Redevelop at Engineering, without the Workshop", () => {
    for (const faction of FACTION_IDS_V7)
      expect(unlocksOf(faction, "ENGINEERING"), faction).toEqual([
        "MOUNTAIN_MOVEMENT",
        "HIGH_GROUND_VISION",
        "BUILD_MINE",
        "REDEVELOP",
      ]);
  });

  it("unlocks the defender at Fortification, which keeps what it had", () => {
    for (const faction of FACTION_IDS_V7) {
      const expected = FORTIFICATION[faction];
      const rule = effectiveRoleRuleV7("GUARD", faction);
      expect([rule.label, rule.technology], faction).toEqual([
        expected.defender,
        "FORTIFICATION",
      ]);
      expect(unlocksOf(faction, "FORTIFICATION"), faction).toEqual([
        expected.keeps,
        "UNIT:GUARD",
      ]);
      const node = factionTreeV7(faction).nodes.find(
        (item) => item.id === "FORTIFICATION",
      );
      expect([node?.tier, node?.prerequisites], faction).toEqual([
        2,
        ["DRILL"],
      ]);
      expect(technologyDisplayNameV7("FORTIFICATION", faction), faction).toBe(
        expected.name,
      );
      // The heavy line unit is on the other sub-branch.
      expect(effectiveRoleRuleV7("SWORDSMAN", faction).technology).toBe(
        "METALLURGY",
      );
      expect(
        factionTreeV7(faction).nodes.find((item) => item.id === "METALLURGY")
          ?.prerequisites,
      ).toEqual(["ENGINEERING"]);
    }
  });

  it("leaves Milling and the mills as they were", () => {
    for (const faction of FACTION_IDS_V7) {
      const milling = factionTreeV7(faction).nodes.find(
        (node) => node.id === "MILLING",
      );
      expect([milling?.tier, milling?.prerequisites], faction).toEqual([
        3,
        ["FARMING"],
      ]);
      expect(unlocksOf(faction, "MILLING"), faction).toEqual([
        "BUILD_WINDMILL",
        "ECONOMIC_FORMULA",
        "ADJACENT_START_TURN_HEALING",
      ]);
    }
    expect(SPATIAL_ECONOMIC_ACTIONS_V7.BUILD_WINDMILL).toMatchObject({
      technology: "MILLING",
      cost: 5,
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7.BUILD_SAWMILL).toMatchObject({
      technology: "SAWMILLING",
      cost: 5,
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7.BUILD_FORGE).toMatchObject({
      technology: "METALLURGY",
      cost: 6,
    });
  });

  it("shows the root as Crafting for every faction, and its card as the faction's own Workshop", () => {
    expect(TECHNOLOGY_SHARED_DISPLAY_NAMES_V7.DRILL).toBe("Crafting");
    for (const faction of FACTION_IDS_V7) {
      expect(technologyDisplayNameV7("DRILL", faction), faction).toBe(
        "Crafting",
      );
      // The card is the Workshop for every faction, never a defender. Since
      // bead pulp_wars-2yc.38 (stage 2) every faction but the Humans draws
      // the Workshop in a look of its own, and a technology card shows the
      // viewer faction's look.
      expect(technologySubjectV7("DRILL", faction), faction).toBe(
        faction === "ORIGINAL"
          ? "IMPROVEMENT:WORKSHOP"
          : `IMPROVEMENT:${faction}:WORKSHOP`,
      );
      expect(technologySubjectV7("ENGINEERING", faction), faction).toBe(
        "TERRAIN:MINED_MOUNTAIN",
      );
    }
    expect(technologySubjectV7("DRILL", "ORIGINAL")).toBe(
      "IMPROVEMENT:WORKSHOP",
    );
  });
});

describe("the Industry reshuffle: the rules", () => {
  it("produces the defender with Fortification and not with the root alone, for every faction", () => {
    for (const faction of FACTION_IDS_V7) {
      const seat = (techs: readonly TechnologyIdV7[]): GameStateV7 =>
        field([], { factions: [faction, "ORIGINAL"], techs: { 0: techs } });
      expect(produces(seat(["DRILL"]), "GUARD"), faction).toBe(false);
      expect(produces(seat(["DRILL", "FORTIFICATION"]), "GUARD"), faction).toBe(
        true,
      );
      // The command itself names the technology it lacks.
      const rootOnly = seat(["DRILL"]);
      const withIt = seat(["DRILL", "FORTIFICATION"]);
      const command = offered(withIt).find(
        (item) =>
          (item.kind === "TRAIN" || item.kind === "LAY_EGG") &&
          item.role === "GUARD",
      );
      if (command === undefined) throw new Error("no production");
      const refused = applyCommandV7(rootOnly, seatIdV7(rootOnly, 0), command);
      expect(refused.accepted, faction).toBe(false);
      if (!refused.accepted)
        expect([refused.error.code, refused.error.params], faction).toEqual([
          "TECH_REQUIRED",
          { tech: "FORTIFICATION" },
        ]);
      const made = applyOkV7(withIt, seatIdV7(withIt, 0), command).state;
      expect(
        made.units.filter(
          (unit) => unit.ownerId === seatIdV7(made, 0) && unit.role === "GUARD",
        ),
        faction,
      ).toHaveLength(1);
    }
  });

  it("builds a Workshop with the root alone, beside a Farm, for 4 Coins", () => {
    for (const faction of FACTION_IDS_V7) {
      const state = farmed(faction, ["DRILL"]);
      const actor = seatIdV7(state, 0);
      const build: CommandV7 = { kind: "BUILD_WORKSHOP", at: at(9, 8) };
      expect(offered(state), faction).toContainEqual(build);
      const coins = (item: GameStateV7): number =>
        item.players.find((player) => player.id === actor)?.coins ?? 0;
      const built = applyOkV7(state, actor, build).state;
      expect(coins(state) - coins(built), faction).toBe(4);
      expect(
        built.board.tiles.find((tile) => tile.at.x === 9 && tile.at.y === 8)
          ?.improvement,
        faction,
      ).toBe("WORKSHOP");
      // Without the root it is not offered and is refused by name.
      const without = farmed(faction, []);
      expect(offered(without), faction).not.toContainEqual(build);
      const refused = applyCommandV7(without, seatIdV7(without, 0), build);
      expect(refused.accepted, faction).toBe(false);
      if (!refused.accepted)
        expect([refused.error.code, refused.error.params], faction).toEqual([
          "TECH_REQUIRED",
          { tech: "DRILL" },
        ]);
    }
  });

  it("still needs Engineering for a Mine, and for a Workshop on a Mountain", () => {
    const state = mountainV7(farmed("ORIGINAL", ["DRILL"]), at(9, 8));
    const actor = seatIdV7(state, 0);
    const onMountain = applyCommandV7(state, actor, {
      kind: "BUILD_WORKSHOP",
      at: at(9, 8),
    });
    expect(onMountain.accepted).toBe(false);
    if (!onMountain.accepted)
      expect([onMountain.error.code, onMountain.error.params]).toEqual([
        "TECH_REQUIRED",
        { tech: "ENGINEERING" },
      ]);
    const ore = patchTileV7(state, at(9, 8), { resource: "ORE" });
    const mine = applyCommandV7(ore, actor, {
      kind: "BUILD_MINE",
      at: at(9, 8),
    });
    expect(mine.accepted).toBe(false);
    if (!mine.accepted)
      expect([mine.error.code, mine.error.params]).toEqual([
        "TECH_REQUIRED",
        { tech: "ENGINEERING" },
      ]);
  });
});

describe("the Industry reshuffle: the missions", () => {
  it("gives Fortification to every seat that owns the root and fields a defender", () => {
    for (const mission of MISSION_REGISTRY_V7)
      for (const [index, seat] of mission.seats.entries()) {
        const defenders = seat.units.some((unit) => unit.role === "GUARD");
        if (defenders && seat.technologies.includes("DRILL"))
          expect(
            seat.technologies,
            `${mission.id} seat ${String(index)}`,
          ).toContain("FORTIFICATION");
      }
  });

  it("bumped the revision of every mission whose technologies changed", () => {
    const revision = (id: string): number | undefined =>
      MISSION_REGISTRY_V7.find((mission) => mission.id === id)?.revision;
    expect(
      [
        "FRONTIER_1",
        "FRONTIER_2",
        "FRONTIER_3",
        "FRONTIER_4",
        "TEST_NECK",
        "LAB_SIEGE",
        "LAB_BACKLINE",
        "LAB_LATE",
        "LAB_BREAKTHROUGH",
        "LAB_BREAKTHROUGH_GOBLIN",
        "LAB_BREAKTHROUGH_UNDEAD",
        "LAB_GOBLIN_MID",
        "LAB_UNDEAD_MID",
        "LAB_MARTIAN_MID",
        "LAB_DINOSAUR_MID",
      ].map((id) => [id, revision(id)]),
    ).toEqual([
      ["FRONTIER_1", 2],
      ["FRONTIER_2", 2],
      ["FRONTIER_3", 2],
      ["FRONTIER_4", 3],
      ["TEST_NECK", 2],
      // Unchanged: both seats owned Fortification already.
      ["LAB_SIEGE", 1],
      ["LAB_BACKLINE", 4],
      ["LAB_LATE", 3],
      ["LAB_BREAKTHROUGH", 4],
      ["LAB_BREAKTHROUGH_GOBLIN", 4],
      ["LAB_BREAKTHROUGH_UNDEAD", 4],
      ["LAB_GOBLIN_MID", 3],
      ["LAB_UNDEAD_MID", 3],
      ["LAB_MARTIAN_MID", 3],
      ["LAB_DINOSAUR_MID", 3],
    ]);
  });
});

describe("the Industry reshuffle: the Normal AI", () => {
  const ARMY: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "MARTIAN",
    "DINOSAUR",
  ];
  const research = (
    faction: FactionIdV7,
    techs: readonly TechnologyIdV7[],
    coins = 40,
  ) => {
    const state = field(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 2) },
      ],
      { factions: [faction, "ORIGINAL"], techs: { 0: techs }, coins },
    );
    return inspectNormalArmyV7(viewForV7(state, seatIdV7(state, 0))).research;
  };

  it("researches the root and then Fortification for the defender, in every army order", () => {
    for (const faction of ARMY) {
      const order = ARMY_RESEARCH_ROLES_V7[faction] ?? [];
      expect(order, faction).toContain("GUARD");
      // The technologies of the units before the defender in the order.
      const before = TECHNOLOGY_IDS_V7.filter((tech) =>
        ["GATHERING", "HUNTING", "MARKSMANSHIP", "SCOUTING"].includes(tech),
      );
      expect(research(faction, before), faction).toMatchObject({
        tech: "DRILL",
        unlocks: null,
      });
      // Step two of the Goblin pass (`pulp_wars-w49.23`): a Goblin seat
      // goes on to Engineering and Armoury (the Ogre, third in its order)
      // and comes to Fortification after them.
      const heavy: readonly TechnologyIdV7[] =
        faction === "GOBLIN" ? ["ENGINEERING", "METALLURGY"] : [];
      if (faction === "GOBLIN")
        expect(
          research(
            faction,
            TECHNOLOGY_IDS_V7.filter(
              (tech) => tech === "DRILL" || before.includes(tech),
            ),
          ),
          faction,
        ).toMatchObject({ tech: "ENGINEERING" });
      expect(
        research(
          faction,
          TECHNOLOGY_IDS_V7.filter(
            (tech) =>
              tech === "DRILL" || before.includes(tech) || heavy.includes(tech),
          ),
        ),
        faction,
      ).toMatchObject({ tech: "FORTIFICATION", unlocks: "GUARD" });
    }
    // The seats whose order begins with the defender.
    expect(
      ARMY.filter(
        (faction) => ARMY_RESEARCH_ROLES_V7[faction]?.[0] === "GUARD",
      ),
    ).toEqual(["UNDEAD", "MARTIAN", "DINOSAUR"]);
  });

  it("does not count the root against the research tempo", () => {
    // A level-1 capital: one technology beside the opener is not due by the
    // city-levels rule, and the root is not counted, so Fortification is.
    for (const faction of ARMY) {
      expect(
        research(faction, ["GATHERING", "DRILL"])?.due,
        `${faction} root`,
      ).toBe(true);
      expect(
        research(faction, ["GATHERING", "HUNTING"])?.due,
        `${faction} other`,
      ).toBe(false);
    }
  });

  it("a seat whose order begins with its defender buys Fortification before its units, and keeps the Coins for it", () => {
    for (const faction of ["UNDEAD", "MARTIAN", "DINOSAUR"] as const) {
      // Step two of the Undead pass (`pulp_wars-w49.24`): an Undead seat
      // with fewer units than its cities and two more trains first
      // (`tests/unit/ruleset-v7-undead-step2.test.ts`), so this one has
      // two Skeletons more, with no home city. Step two of the Martian
      // pass (`pulp_wars-w49.25`): a Martian seat too
      // (`tests/unit/ruleset-v7-martian-step2.test.ts`): two Grunts more.
      // Step two of the Dinosaur pass (`pulp_wars-w49.26`): a Dinosaur seat
      // too (`tests/unit/ruleset-v7-dinosaur-step2.test.ts`): two Cavemen
      // more.
      const spare = [at(9, 9), at(9, 7)];
      const seat = (coins: number): GameStateV7 => {
        const state = field(
          [
            { seat: 0, role: "FIGHTER", at: at(8, 7) },
            ...spare.map((where) => ({
              seat: 0,
              role: "FIGHTER" as const,
              at: where,
            })),
            { seat: 1, role: "FIGHTER", at: at(2, 2) },
          ],
          {
            factions: [faction, "ORIGINAL"],
            techs: { 0: ["GATHERING", "DRILL"] },
            coins,
          },
        );
        return {
          ...state,
          units: state.units.map((unit) =>
            spare.some(
              (where) => where.x === unit.at.x && where.y === unit.at.y,
            )
              ? { ...unit, homeCityId: null }
              : unit,
          ),
        };
      };
      const cost = research(faction, ["GATHERING", "DRILL"])?.cost ?? 0;
      expect(cost, faction).toBe(7);
      // With the price in hand: the technology first, then the defender.
      const paid = policyTurn(seat(cost + 5));
      expect(paid[0], faction).toEqual({
        kind: "RESEARCH",
        tech: "FORTIFICATION",
      });
      expect(
        paid.some(
          (command) =>
            (command.kind === "TRAIN" || command.kind === "LAY_EGG") &&
            command.role === "GUARD",
        ),
        faction,
      ).toBe(true);
      // One Coin short: no unit that would leave it unable to pay next
      // turn.
      const short = policyTurn(seat(cost - 1));
      expect(
        short.filter((command) => command.kind === "RESEARCH"),
        faction,
      ).toEqual([]);
      expect(
        short.filter(
          (command) => command.kind === "TRAIN" || command.kind === "LAY_EGG",
        ),
        faction,
      ).toEqual([]);
    }
    // A Human seat (the Marksman first) keeps its order: units before a
    // technology that is not due.
    const human = policyTurn(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 7) },
          { seat: 1, role: "FIGHTER", at: at(2, 2) },
        ],
        { techs: { 0: ["GATHERING", "HUNTING"] }, coins: 12 },
      ),
    );
    expect(human[0]?.kind).not.toBe("RESEARCH");
  });

  it("a seat outside the army policy that owns the root researches Fortification when it can pay", () => {
    // Every seat of a match with a Candy seat plays the older policy (an
    // Ice Folk or a Dwarf seat too, there; in a match without one they play
    // the army rules since step two of the Ice Folk pass,
    // `pulp_wars-w49.27`, and of the Dwarf pass, `pulp_wars-w49.28`): the
    // last step to the defender is bought ahead of an economic technology
    // (`defenderLastStepResearchV7`). Here the seat trains a Fighter first
    // and still pays for the technology.
    const cases: readonly (readonly [FactionIdV7, FactionIdV7])[] = [
      ["ICE_FOLK", "CANDY"],
      ["DWARF", "CANDY"],
      ["CANDY", "ORIGINAL"],
      ["ORIGINAL", "CANDY"],
      ["UNDEAD", "CANDY"],
    ];
    for (const [faction, other] of cases) {
      const seat = (
        techs: readonly TechnologyIdV7[],
        coins: number,
      ): GameStateV7 =>
        field(
          [
            { seat: 0, role: "FIGHTER", at: at(8, 7) },
            { seat: 1, role: "FIGHTER", at: at(2, 2) },
          ],
          { factions: [faction, other], techs: { 0: techs }, coins },
        );
      const paid = policyTurn(seat(["GATHERING", "DRILL"], 12));
      expect(
        paid.find((command) => command.kind === "RESEARCH"),
        faction,
      ).toEqual({ kind: "RESEARCH", tech: "FORTIFICATION" });
      // One Coin short of its 7: no Fortification this turn.
      expect(
        policyTurn(seat(["GATHERING", "DRILL"], 6)),
        faction,
      ).not.toContainEqual({ kind: "RESEARCH", tech: "FORTIFICATION" });
    }
  });

  it("builds a Workshop from the root alone where a Farm stands", () => {
    for (const faction of ARMY)
      expect(
        policyTurn(farmed(faction, ["DRILL", "FORTIFICATION"])),
        faction,
      ).toContainEqual(expect.objectContaining({ kind: "BUILD_WORKSHOP" }));
  });
});
