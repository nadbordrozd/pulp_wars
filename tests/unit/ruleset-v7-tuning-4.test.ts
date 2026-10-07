import { describe, expect, it } from "vitest";
import {
  BARRACKS_CAPACITY_V7,
  CITY_REWARD_COINS_V7,
  FACTION_IDS_V7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
  LAND_TRADE_INCOME_COINS_V7,
  MILITIA_FIGHTERS_V7,
  MISSION_REGISTRY_V7,
  PILLAGE_COINS_V7,
  RULESET_7_ID,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  TECHNOLOGY_RESEARCH_COST_V7,
  cityBarracksV7,
  cityUnitCapacityV7,
  createPlayableGameV7,
  missionMatchSetupV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  playerTechnologyResearchCostV7,
  previewEconomicV7,
  projectEventsV7,
  publicLandGrantPriceV7,
  queryLandGrantPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  rewardCandidatesForLevelV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  validateMissionDefinitionV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  mountainV7,
  patchTileV7,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 4 (`pulp_wars-w49.3`, identity `pulp-wars-poc-7r47`;
 * docs/product/RULESET_7_TUNING_HUMAN.md part 4): land trade +1, research
 * priced by the technologies owned, the reward ladder (Scouts, one Militia
 * Fighter, Barracks, the 6-Coin Treasury, the capital's one reward unit),
 * Drill, the Raider and Raiding, Fieldcraft's Forest march, the Field
 * Defense of two levels, the Land Grant of explored tiles, the Blast
 * Mountain preview and projection, and the three lab fixtures.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8).
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;

const offered = (state: GameStateV7, seat = 0): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, seat)));

/** Applies an accepted command; its events and state pass the schemas. */
const applied = (state: GameStateV7, command: CommandV7, seat = 0) => {
  const result = applyOkV7(state, seatIdV7(state, seat), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
};

const coinsOf = (state: GameStateV7, seat = 0): number =>
  state.players.find((player) => player.seat === seat)?.coins ?? -1;

const withCoins = (state: GameStateV7, coins: number, seat = 0): GameStateV7 =>
  checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat ? { ...player, coins } : player,
    ),
  });

const moveTargets = (state: GameStateV7, from: CoordV7): readonly string[] => {
  const unit = unitAtV7(state, from);
  return offered(state).flatMap((command) => {
    if (command.kind !== "MOVE" || command.unitId !== unit.id) return [];
    const to = command.path[command.path.length - 1];
    return to === undefined ? [] : [`${to.x},${to.y}`];
  });
};

describe("tuning 4 keeps the unpublished identity", () => {
  it("is 7r47", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r56");
  });
});

describe("Commerce: land trade pays 1", () => {
  it("is +1 for each linked city in every tree that has it", () => {
    expect(LAND_TRADE_INCOME_COINS_V7).toBe(1);
    for (const faction of FACTION_IDS_V7)
      expect([0, 1]).toContain(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction)
          .landTradeIncomeCoins,
      );
    expect(
      technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, "ORIGINAL")
        .landTradeIncomeCoins,
    ).toBe(1);
  });
});

describe("research price (by the cities owned since the economy rejig)", () => {
  const costs = (
    techs: readonly TechnologyIdV7[],
    pieces: readonly GoblinPieceV7[] = [],
  ) => {
    const state = fieldV7(
      [{ seat: 1, role: "FIGHTER", at: at(1, 1) }, ...pieces],
      { factions: HUMANS, techs: { 0: techs } },
    );
    const tree = queryTechnologyTreeV7(viewForV7(state, seatIdV7(state, 0)));
    return {
      state,
      cost: (id: TechnologyIdV7) =>
        tree.nodes.find((node) => node.id === id)?.cost,
    };
  };

  // The economy rejig (`pulp_wars-w49.16`, 7r54): the price is by the
  // cities owned again, 1 / 2 / 3 Coins a city by tier; the technologies
  // owned no longer enter it. (Tuning 4 priced by the technologies owned,
  // 2 Coins each, and tuning 6 made that 1.)
  it("is the tier base whatever the technologies owned, with one city", () => {
    expect(TECHNOLOGY_RESEARCH_COST_V7).toEqual({
      1: { base: 5, step: 1 },
      2: { base: 7, step: 2 },
      3: { base: 9, step: 3 },
    });
    expect(playerTechnologyResearchCostV7(1, 0, 1)).toBe(0);
    expect(costs([]).cost("HUNTING")).toBe(0);
    const one = costs(["HUNTING"]);
    expect(one.cost("DRILL")).toBe(5);
    expect(one.cost("FORESTRY")).toBe(7);
    const two = costs(["HUNTING", "FORESTRY"]);
    expect(two.cost("DRILL")).toBe(5);
    expect(two.cost("MARKSMANSHIP")).toBe(7);
    expect(two.cost("SAWMILLING")).toBe(9);
    const seven = costs([
      "GATHERING",
      "HUNTING",
      "FORESTRY",
      "MARKSMANSHIP",
      "SCOUTING",
      "RAIDING",
      "DRILL",
    ]);
    expect(seven.cost("CHIVALRY")).toBe(9);
    expect(seven.cost("FARMING")).toBe(7);
  });

  it("reads the number of cities", () => {
    const techs: readonly TechnologyIdV7[] = ["HUNTING", "FORESTRY"];
    const base = costs(techs, [
      { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
    ]);
    const captured = applyOkV7(base.state, seatIdV7(base.state, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base.state, at(8, 5)).id,
    }).state;
    expect(
      captured.cities.filter((city) => city.ownerId === seatIdV7(captured, 0)),
    ).toHaveLength(2);
    const tree = queryTechnologyTreeV7(
      viewForV7(captured, seatIdV7(captured, 0)),
    );
    // A second city: +1 / +2 / +3.
    for (const [id, cost] of [
      ["DRILL", 6],
      ["MARKSMANSHIP", 9],
      ["SAWMILLING", 12],
    ] as const)
      expect(tree.nodes.find((node) => node.id === id)?.cost, id).toBe(cost);
    // The reducer charges the offered price.
    const result = applied(captured, { kind: "RESEARCH", tech: "SAWMILLING" });
    expect(result.events[0]).toMatchObject({
      kind: "TECH_RESEARCHED",
      cost: 12,
    });
  });
});

describe("the reward ladder", () => {
  it("lists the choices of every level", () => {
    expect(rewardCandidatesForLevelV7(2)).toEqual(["SURVEY", "STOCKPILE"]);
    expect(rewardCandidatesForLevelV7(3)).toEqual(["WALLS", "MILITIA"]);
    expect(rewardCandidatesForLevelV7(4)).toEqual([
      "BOOM",
      "TREASURY_6",
      "BARRACKS",
    ]);
    // The economy rejig (`pulp_wars-w49.16`, 7r54): level 5 offers the
    // Treasury or Barracks; from level 6 every city offers the reward
    // unit, once. (Tuning 4: from level 5, the first capital's only.)
    expect(rewardCandidatesForLevelV7(5)).toEqual(["TREASURY", "BARRACKS"]);
    expect(rewardCandidatesForLevelV7(6)).toEqual([
      "JUGGERNAUT",
      "TREASURY",
      "BARRACKS",
    ]);
    expect(
      rewardCandidatesForLevelV7(7, [
        { reward: "JUGGERNAUT" },
        { reward: "BARRACKS" },
      ]),
    ).toEqual(["TREASURY", "BARRACKS"]);
    expect(CITY_REWARD_COINS_V7).toEqual({
      STOCKPILE: 4,
      TREASURY_6: 6,
      TREASURY: 6,
    });
  });

  it("Scouts: a Human Survey also grants a free Raider", () => {
    // The Undead pass (`pulp_wars-w49.13`, 7r51): an Undead Survey grants
    // a Ghoul, as a Goblin one a Wolf Rider (7r50); since the Dinosaur pass
    // (`pulp_wars-w49.15`, 7r53) a Dinosaur one a Raptor; the Ice Folk, the
    // Dwarves, and the Candy none.
    expect(SURVEY_RAIDERS_V7).toMatchObject({
      ORIGINAL: 1,
      UNDEAD: 1,
      DINOSAUR: 1,
      CANDY: 0,
    });
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      let state = fieldV7([{ seat: 1, role: "FIGHTER", at: at(1, 1) }], {
        factions: [faction, faction === "ORIGINAL" ? "DWARF" : "ORIGINAL"],
      });
      for (const where of [at(7, 7), at(9, 7)]) {
        state = patchTileV7(state, where, { resource: "FRUIT" });
        state = applied(state, { kind: "HARVEST_FRUIT", at: where }).state;
      }
      const pending = state.pendingChoices[0];
      if (pending === undefined) throw new Error("no level-2 choice");
      expect(pending.candidates).toEqual(["SURVEY", "STOCKPILE"]);
      const result = applied(state, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: pending.cityId,
        reachedLevel: 2,
        reward: "SURVEY",
      });
      const granted = result.events.filter(
        (event) => event.kind === "UNIT_REWARD_GRANTED",
      );
      expect(
        granted.map((event) => "role" in event && event.role),
        faction,
      ).toEqual(["RAIDER"]);
      expect(
        result.state.units.filter(
          (unit) =>
            unit.ownerId === seatIdV7(state, 0) && unit.role === "RAIDER",
        ),
        faction,
      ).toHaveLength(1);
    }
  });

  it("Militia: one Human Fighter again", () => {
    expect(MILITIA_FIGHTERS_V7).toMatchObject({ ORIGINAL: 1, GOBLIN: 2 });
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    const result = applied(fixture.state, {
      ...fixture.command,
      reward: "MILITIA",
    });
    expect(
      result.events.filter((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toHaveLength(1);
  });

  it("Barracks: +1 unit in the city, and no unit", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL");
    const before = cityOfV7(fixture.state, 0);
    expect(offered(fixture.state).map((command) => command.kind)).toEqual(
      expect.arrayContaining(["CHOOSE_CITY_REWARD"]),
    );
    const result = applied(fixture.state, {
      ...fixture.command,
      reward: "BARRACKS",
    });
    const after = cityOfV7(result.state, 0);
    expect(cityBarracksV7(after)).toBe(1);
    expect(BARRACKS_CAPACITY_V7).toBe(1);
    expect(cityUnitCapacityV7(result.state, after)).toBe(
      cityUnitCapacityV7(fixture.state, before) + 1,
    );
    expect(result.state.units).toHaveLength(fixture.state.units.length);
    expect(coinsOf(result.state)).toBe(coinsOf(fixture.state));
  });

  it("the Treasury pays 6, and the reward unit comes once", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL");
    const rich = applied(fixture.state, {
      ...fixture.command,
      reward: "TREASURY",
    });
    expect(coinsOf(rich.state) - coinsOf(fixture.state)).toBe(6);
    const giant = applied(fixture.state, fixture.command);
    expect(
      giant.state.units.filter((unit) => unit.role === "JUGGERNAUT"),
    ).toHaveLength(1);
    const capital = cityOfV7(giant.state, 0);
    expect(rewardCandidatesForLevelV7(7, capital.rewards)).toEqual([
      "TREASURY",
      "BARRACKS",
    ]);
  });
});

// Tuning 5 (`pulp_wars-w49.4`, 7r48) removed Drill, the paid Promotion at a
// Barracks (`DRILL_UNIT`, 10 Coins); tests/unit/ruleset-v7-tuning-5.test.ts
// covers the removal. A Barracks is the unit slot of the test above.
describe("Drill is gone", () => {
  it("offers nothing more to the unit on the center of a Barracks city", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
      { role: "FIGHTER", at: at(8, 8) },
    ]);
    const chosen = withCoins(
      applied(fixture.state, { ...fixture.command, reward: "BARRACKS" }).state,
      100,
    );
    const unit = unitAtV7(chosen, at(8, 8));
    expect(
      offered(chosen)
        .filter((command) => "unitId" in command && command.unitId === unit.id)
        .map((command) => command.kind)
        .filter((kind) => kind !== "MOVE"),
    ).toEqual(["DISBAND", "WAIT", "BUILD_FIELD_DEFENSE"]);
  });
});

describe("the Raider slips past and Raiding pays", () => {
  it("a Human Raider is not stopped by enemy zones of control", () => {
    expect(roleMechanicsV7("RAIDER", "ORIGINAL").ignoresZocStops).toBe(true);
    for (const faction of ["UNDEAD", "GOBLIN", "CANDY"] as const)
      expect(roleMechanicsV7("RAIDER", faction).ignoresZocStops, faction).toBe(
        false,
      );
    const reach = (faction: "ORIGINAL" | "UNDEAD") =>
      moveTargets(
        fieldV7(
          [
            { seat: 0, role: "RAIDER", at: at(5, 1) },
            { seat: 1, role: "FIGHTER", at: at(5, 3) },
          ],
          {
            factions: [faction, faction === "ORIGINAL" ? "DWARF" : "ORIGINAL"],
          },
        ),
        at(5, 1),
      );
    // Every tile of row 2 next to (5, 3) lies in its zone of control; row 3
    // is two steps from (5, 1) only through that row.
    expect(reach("ORIGINAL")).toContain("4,3");
    expect(reach("UNDEAD")).not.toContain("4,3");
  });

  it("a Pillage pays 3 Coins and leaves a Raider its Move", () => {
    expect(PILLAGE_COINS_V7).toBe(3);
    const FARM = at(3, 7);
    const run = (role: "RAIDER" | "FIGHTER") => {
      const base = patchTileV7(
        fieldV7(
          [
            { seat: 0, role, at: at(4, 6) },
            { seat: 1, role: "FIGHTER", at: at(1, 9) },
          ],
          { factions: HUMANS, activeSeat: 1 },
        ),
        FARM,
        { resource: "FERTILE_GROUND" },
      );
      let built = applied(base, { kind: "BUILD_FARM", at: FARM }, 1).state;
      // The Farm takes the capital to level 2: its reward, then the turn.
      const pending = built.pendingChoices[0];
      if (pending !== undefined)
        built = applied(
          built,
          {
            kind: "CHOOSE_CITY_REWARD",
            cityId: pending.cityId,
            reachedLevel: pending.reachedLevel,
            reward: "STOCKPILE",
          },
          1,
        ).state;
      const mine = applied(built, { kind: "END_TURN" }, 1).state;
      const moved = applied(mine, {
        kind: "MOVE",
        unitId: unitAtV7(mine, at(4, 6)).id,
        path: [FARM],
      }).state;
      const unit = unitAtV7(moved, FARM);
      const result = applied(moved, { kind: "PILLAGE", unitId: unit.id });
      return { before: moved, result, unitId: unit.id };
    };
    const raider = run("RAIDER");
    expect(raider.result.events[0]).toMatchObject({
      kind: "IMPROVEMENT_PILLAGED",
      coinDelta: 3,
    });
    expect(coinsOf(raider.result.state) - coinsOf(raider.before)).toBe(3);
    const after = (state: GameStateV7, unitId: number) =>
      offered(state).filter(
        (command) => command.kind === "MOVE" && command.unitId === unitId,
      ).length;
    expect(after(raider.result.state, raider.unitId)).toBeGreaterThan(0);
    // The Escape Move is the Raider's; a Fighter is done.
    const fighter = run("FIGHTER");
    expect(coinsOf(fighter.result.state) - coinsOf(fighter.before)).toBe(3);
    expect(after(fighter.result.state, fighter.unitId)).toBe(0);
  });
});

describe("Fieldcraft: Forest march", () => {
  it("is a capability of Fieldcraft in every tree", () => {
    for (const faction of FACTION_IDS_V7) {
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction).forestMarch,
        faction,
      ).toBe(true);
      expect(
        technologyCapabilitiesV7(withoutTechsV7(faction, "FIELDCRAFT"), faction)
          .forestMarch,
        faction,
      ).toBe(false);
    }
  });

  it("lets a Knight ride through Forest, which stops it without Fieldcraft", () => {
    // A Forest wall on x = 6, y = 0-2: (7, 1) is two steps from (5, 1)
    // through it and more than three around it.
    const reach = (techs?: readonly TechnologyIdV7[]) => {
      let state = fieldV7(
        [
          { seat: 0, role: "KNIGHT", at: at(5, 1) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        {
          factions: HUMANS,
          ...(techs === undefined ? {} : { techs: { 0: techs } }),
        },
      );
      for (const y of [0, 1, 2]) state = forestV7(state, at(6, y));
      return moveTargets(state, at(5, 1));
    };
    const stopped = reach(withoutTechsV7("ORIGINAL", "FIELDCRAFT"));
    expect(stopped).toContain("6,1");
    expect(stopped).not.toContain("7,1");
    expect(reach()).toContain("7,1");
  });
});

describe("Field Defense is two levels", () => {
  it("gives the unit on it +2 Defense levels", () => {
    expect(FIELD_DEFENSE_FORTIFICATION_LEVELS_V7).toBe(2);
    const fortified = fieldDefenseV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(3, 6) },
          { seat: 1, role: "FIGHTER", at: at(2, 7) },
        ],
        {
          factions: HUMANS,
          techs: { 0: withoutTechsV7("ORIGINAL", "EXPLOSIVES") },
        },
      ),
      at(2, 7),
    );
    expect(attackV7(fortified, at(3, 6), at(2, 7)).combat).toMatchObject({
      fortificationLevel: 2,
    });
  });
});

describe("Land Grant claims and charges explored tiles only", () => {
  const grantState = (coins = 100): GameStateV7 => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL");
    const chosen = applyOkV7(fixture.state, seatIdV7(fixture.state, 0), {
      ...fixture.command,
      reward: "TREASURY",
    }).state;
    return withCoins(chosen, coins);
  };
  const footprint = (state: GameStateV7): readonly CoordV7[] => {
    const city = cityOfV7(state, 0);
    return state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === null &&
          Math.abs(tile.at.x - city.at.x) <= 2 &&
          Math.abs(tile.at.y - city.at.y) <= 2,
      )
      .map((tile) => tile.at);
  };

  it("leaves unexplored tiles neutral and unpaid", () => {
    const open = grantState();
    const tiles = footprint(open);
    const hidden = tiles.slice(0, 4);
    const state = unexploreV7(open, 0, hidden);
    const city = cityOfV7(state, 0);
    const preview = queryLandGrantPreviewV7(
      viewForV7(state, seatIdV7(state, 0)),
      city.id,
    );
    expect(preview?.tiles).toHaveLength(tiles.length - 4);
    // 1 Coin a tile since tuning 5 (`pulp_wars-w49.4`; 2 before).
    expect(preview?.cost).toBe(tiles.length - 4);
    const result = applied(state, { kind: "LAND_GRANT", cityId: city.id });
    const granted = result.events[0];
    if (granted?.kind !== "LAND_GRANTED") throw new Error("no grant");
    expect(granted.cost).toBe(preview?.cost);
    expect(granted.tiles).toEqual(preview?.tiles);
    for (const where of hidden)
      expect(
        result.state.board.tiles.find(
          (tile) => tile.at.x === where.x && tile.at.y === where.y,
        )?.territoryCityId,
      ).toBeNull();
    expect(result.events.some((event) => event.kind === "TILES_REVEALED")).toBe(
      false,
    );
  });

  it("keeps its price visible while the player cannot pay", () => {
    const state = grantState(5);
    const city = cityOfV7(state, 0);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(offered(state)).not.toContainEqual({
      kind: "LAND_GRANT",
      cityId: city.id,
    });
    expect(queryLandGrantPreviewV7(view, city.id)).toBeNull();
    const price = publicLandGrantPriceV7(view, city.id);
    expect(price?.cost).toBe(footprint(state).length);
    expect(price?.tiles).toHaveLength(footprint(state).length);
    // Used, or below level 3: no price.
    const rich = grantState();
    const used = applied(rich, { kind: "LAND_GRANT", cityId: city.id }).state;
    expect(
      publicLandGrantPriceV7(viewForV7(used, seatIdV7(used, 0)), city.id),
    ).toBeNull();
  });
});

describe("Blast Mountain outside the territory", () => {
  const pieces: GoblinPieceV7[] = [
    { seat: 0, role: "FIGHTER", at: at(5, 2) },
    { seat: 1, role: "GUARD", at: at(5, 3) },
    { seat: 1, role: "MARKSMAN", at: at(6, 4) },
  ];
  const state = () =>
    mountainV7(fieldV7(pieces, { factions: HUMANS }), at(5, 3));
  const blast: CommandV7 = { kind: "BLAST_MOUNTAIN", at: at(5, 3) };

  it("has an exact preview: its price and no city change", () => {
    const view = viewForV7(state(), seatIdV7(state(), 0));
    const preview = previewEconomicV7(view, blast);
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        cost: 3,
        ownerCityId: null,
        populationDeltaByCity: [],
        coinIncomeDeltaByCity: [],
        resultingContribution: 0,
      },
    });
  });

  it("is projected to both players with every unit it hit", () => {
    const before = state();
    const result = applied(before, blast);
    for (const seat of [0, 1]) {
      const projected = projectEventsV7(
        before,
        result.state,
        seatIdV7(before, seat),
        result.events,
      ).events;
      const explosion = projected.find(
        (event) => event.kind === "EXPLOSION_RESOLVED",
      );
      if (explosion?.kind !== "EXPLOSION_RESOLVED")
        throw new Error(`seat ${seat} sees no explosion`);
      expect(explosion.cause).toBe("BLAST");
      // Every unit but the one that set the charge (tuning 5,
      // `pulp_wars-w49.4`: the Fighter next to the Mountain is not hit).
      expect(explosion.results.map((entry) => entry.unitId).sort()).toEqual(
        before.units
          .filter((unit) => unit.ownerId !== seatIdV7(before, 0))
          .map((unit) => unit.id)
          .sort(),
      );
    }
  });
});

describe("the Human labs", () => {
  // The three labs of tuning 4. Tuning 6 added the breakthrough labs
  // (tests/unit/ruleset-v7-tuning-6.test.ts), two of which are not mirrors.
  const labs = MISSION_REGISTRY_V7.filter((mission) =>
    ["LAB_SIEGE", "LAB_BACKLINE", "LAB_LATE"].includes(mission.id),
  );

  it("are three hidden mirror fixtures", () => {
    expect(labs.map((mission) => mission.id)).toEqual([
      "LAB_SIEGE",
      "LAB_BACKLINE",
      "LAB_LATE",
    ]);
    expect(
      MISSION_REGISTRY_V7.filter((mission) =>
        mission.id.startsWith("LAB_"),
      ).map((mission) => mission.id),
    ).toEqual([
      "LAB_SIEGE",
      "LAB_BACKLINE",
      "LAB_LATE",
      "LAB_BREAKTHROUGH",
      "LAB_BREAKTHROUGH_GOBLIN",
      "LAB_BREAKTHROUGH_UNDEAD",
      // The Goblin pass: the hand player as the Goblins, no mirror.
      "LAB_GOBLIN_MID",
      // The Undead pass: the hand player as the Undead, no mirror.
      "LAB_UNDEAD_MID",
      // The Martian pass: the hand player as the Martians, no mirror.
      "LAB_MARTIAN_MID",
      // The Dinosaur pass: the hand player as the Dinosaurs, no mirror.
      "LAB_DINOSAUR_MID",
    ]);
    for (const mission of labs) {
      expect(mission, mission.id).toMatchObject({ hidden: true, mirror: true });
      expect(() => validateMissionDefinitionV7(mission)).not.toThrow();
      // A mirror must be hidden.
      expect(() =>
        validateMissionDefinitionV7({
          ...mission,
          hidden: undefined,
        } as never),
      ).toThrow();
    }
  });

  it("build into playable Human mirrors that offer commands to the player", () => {
    for (const mission of labs) {
      const setup = missionMatchSetupV7(mission);
      if (setup === null) throw new Error(mission.id);
      expect(setup.factions, mission.id).toEqual(["ORIGINAL", "ORIGINAL"]);
      expect(parseMatchSetupV7(setup)).toEqual(setup);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(`${mission.id} ${created.error.code}`);
      const state = created.state;
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
      const commands = queryPlayerCommandsV7(
        viewForV7(state, state.humanPlayerId),
      );
      expect(
        commands.some((command) => command.kind === "MOVE"),
        mission.id,
      ).toBe(true);
      expect(commands).toContainEqual({ kind: "END_TURN" });
    }
  });

  it("LAB_LATE starts both sides at the unit limit with hires on offer", () => {
    const mission = labs.find((item) => item.id === "LAB_LATE");
    if (mission === undefined) throw new Error("no LAB_LATE");
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    for (const city of state.cities)
      expect(
        state.units.filter((unit) => unit.homeCityId === city.id).length,
        `c${city.id}`,
      ).toBe(cityUnitCapacityV7(state, city));
    const commands = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    );
    expect(commands.some((command) => command.kind === "HIRE")).toBe(true);
  });
});
