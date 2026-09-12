import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  createInitialMapStateV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
} from "../../src/engine/index";
import type { PlayerViewV7 } from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  cityIncomeForViewerV7,
  economicFormulaV7,
  monumentSourceForViewerV7,
  recruitmentRolePresentationV7,
  specialBoundaryNoticeV7,
  technologyEffectGroupsV7,
} from "../../src/render/dom/app-view-v7";
import {
  checkedV7,
  exploredAllV7,
  initialV7,
  setupV7,
} from "../fixtures/v7-builders";

describe("Ruleset 7 public presentation", () => {
  it("presents canonical recruitment base data and exact Horse Archer limits", () => {
    const horseArcher = recruitmentRolePresentationV7("HORSE_ARCHER");
    expect(horseArcher.label).toBe("Horse Archer");
    expect(horseArcher.stats).toEqual([
      { label: "Max HP", value: "10" },
      { label: "Attack", value: "2" },
      { label: "Defense", value: "1" },
      { label: "Move", value: "3" },
      { label: "Range", value: "1–2" },
      { label: "Sight", value: "1" },
    ]);
    expect(horseArcher.abilities.join(" ")).toContain(
      "Up to 2 total attacks in this activation",
    );
    expect(horseArcher.abilities.join(" ")).toContain(
      "other units and End Turn remain available",
    );
    expect(horseArcher.abilities.join(" ")).toContain(
      "cannot Capture and never advances",
    );

    const marksman = recruitmentRolePresentationV7("MARKSMAN");
    expect(marksman.restrictions).toContain(
      "Does not advance after a ranged kill.",
    );
    expect(marksman.restrictions).not.toContain("Never advances after a kill.");
  });

  it("groups technology detail items from structured effect kinds", () => {
    expect(
      technologyEffectGroupsV7([
        { kind: "UNIT_ROLE", role: "HORSE_ARCHER" },
        { kind: "COMMAND", command: "BUILD_MARKET" },
        { kind: "MARKET_CAPITAL_ROAD_BONUS", coins: 1 },
      ]),
    ).toEqual([
      {
        id: "UNITS",
        label: "Units",
        items: [
          "Train Horse Archer · 9 Coins",
          "Attack: Attack an offered hostile target at range 1–2.",
          "Dash: May take its ordinary Move before its first Attack.",
          "Two shots: Up to 2 total attacks in this activation. Move only before firing. After the first shot, this unit cannot move or use another self action; other units and End Turn remain available. It cannot Capture and never advances.",
        ],
      },
      {
        id: "BUILDINGS",
        label: "Buildings",
        items: ["Build market"],
      },
      {
        id: "PASSIVE_EFFECTS",
        label: "Passive effects",
        items: ["Market connected to the capital adds +1 Coin"],
      },
    ]);
  });

  it("keeps legal Attack highlighted when BASE_ONLY makes exact damage uncertain", () => {
    let state = exploredAllV7(initialV7(1517));
    const attacker = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    );
    const target = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId,
    );
    if (attacker === undefined || target === undefined)
      throw new Error("units missing");
    state = checkedV7({
      ...state,
      units: [
        {
          ...attacker,
          role: "MARKSMAN" as const,
          hp: 10,
          maxHp: 10,
          at: { x: 4, y: 4 },
        },
        {
          ...target,
          role: "GUARD" as const,
          hp: 15,
          maxHp: 15,
          at: { x: 5, y: 4 },
        },
      ],
    });
    const view = viewForV7(state, state.humanPlayerId);
    const attack = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === attacker.id &&
        command.targetUnitId === target.id,
    );
    expect(attack).toBeDefined();
    if (attack?.kind !== "ATTACK") return;
    expect(queryCombatPreviewV7(view, attacker.id, target.id)).not.toBeNull();
    const redacted = {
      ...view,
      unitStats: view.unitStats.map((stats) =>
        stats.unitId !== target.id
          ? stats
          : {
              ...stats,
              stats: stats.stats.map((stat) =>
                stat.id === "DEFENSE"
                  ? { ...stat, visibility: "BASE_ONLY" as const, modifiers: [] }
                  : stat,
              ),
            },
      ),
    };
    expect(queryCombatPreviewV7(redacted, attacker.id, target.id)).toBeNull();
    const plan = buildBoardRenderPlanV7(redacted, [attack], {
      selection: { kind: "UNIT", unitId: attacker.id },
      selectedUnitId: attacker.id,
      selectedAchievement: null,
    });
    expect(plan.targets).toContainEqual(
      expect.objectContaining({
        family: "ATTACK",
        previewLabel: "Damage uncertain",
      }),
    );
  });

  it("uses role-true projectiles for adjacent Marksman and Catapult fire", () => {
    for (const scenario of [
      { role: "MARKSMAN" as const, targetX: 5, kind: "RANGED" as const },
      { role: "CATAPULT" as const, targetX: 6, kind: "CATAPULT" as const },
    ]) {
      let state = exploredAllV7(initialV7(1518));
      const attacker = state.units.find(
        (unit) => unit.ownerId === state.humanPlayerId,
      );
      const target = state.units.find(
        (unit) => unit.ownerId !== state.humanPlayerId,
      );
      if (attacker === undefined || target === undefined)
        throw new Error("units missing");
      state = checkedV7({
        ...state,
        units: [
          {
            ...attacker,
            role: scenario.role,
            hp: 10,
            maxHp: 10,
            at: { x: 4, y: 4 },
          },
          {
            ...target,
            role: "GUARD" as const,
            hp: 15,
            maxHp: 15,
            at: { x: scenario.targetX, y: 4 },
          },
        ],
      });
      const before = viewForV7(state, state.humanPlayerId);
      const attacked = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: target.id,
      });
      expect(attacked.accepted).toBe(true);
      if (!attacked.accepted) continue;
      const envelope = projectEventsV7(
        state,
        attacked.state,
        state.humanPlayerId,
        attacked.events,
      );
      expect(corePresentationPlanV7(before, envelope)).toContainEqual(
        expect.objectContaining({
          kind: scenario.kind,
          unitId: attacker.id,
        }),
      );
    }
  });

  it("renders negative city progress and processor/Monument pips from public facts", () => {
    const state = exploredAllV7(initialV7(1520));
    const view = viewForV7(state, state.humanPlayerId);
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("city missing");
    const at = city.at;
    const presentationView = {
      ...view,
      cities: view.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, level: 4, population: -7 }
          : candidate,
      ),
      improvementValues: [
        {
          at,
          improvement: "WINDMILL" as const,
          level: 0,
          measure: "POPULATION" as const,
          contributingTiles: [],
        },
        {
          at: { x: at.x + 1, y: at.y },
          improvement: "FORGE" as const,
          level: 2,
          measure: "POPULATION" as const,
          contributingTiles: [],
        },
        {
          at: { x: at.x, y: at.y + 1 },
          improvement: "MONUMENT" as const,
          level: 3,
          measure: "POPULATION" as const,
          contributingTiles: [],
        },
      ],
    };
    const plan = buildBoardRenderPlanV7(presentationView, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(plan.entries).toContainEqual(
      expect.objectContaining({ kind: "CITY", value: 4, population: -7 }),
    );
    expect(
      plan.entries
        .filter((entry) => entry.kind === "VALUE")
        .map((entry) => entry.value),
    ).toEqual([0, 2, 3]);
    expect(
      plan.entries.find((entry) => entry.assetId === "building-square-monument")
        ?.ownerId,
    ).toBeUndefined();
  });

  it("highlights only the selected unlocked entitlement's offered Monument tiles", () => {
    const state = exploredAllV7(initialV7(1521));
    const view = viewForV7(state, state.humanPlayerId);
    const tile = view.board.tiles.find(
      (candidate) =>
        candidate.explored &&
        candidate.site === null &&
        candidate.resource === null &&
        candidate.improvement === null,
    );
    if (tile === undefined) throw new Error("empty tile missing");
    const commands = [
      {
        kind: "BUILD_MONUMENT" as const,
        achievement: "ENGINEER" as const,
        at: tile.at,
      },
      {
        kind: "BUILD_MONUMENT" as const,
        achievement: "MUSTER" as const,
        at: { x: tile.at.x + 1, y: tile.at.y },
      },
    ];
    const plan = buildBoardRenderPlanV7(view, commands, {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: "ENGINEER",
    });
    expect(plan.targets).toEqual([
      expect.objectContaining({ family: "MONUMENT", command: commands[0] }),
    ]);
  });

  it("announces an automatic +12 Treasury without requiring a ghost choice", () => {
    const state = initialV7(1522);
    const view = viewForV7(state, state.humanPlayerId);
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    expect(
      specialBoundaryNoticeV7(
        [
          {
            kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
            playerId: view.viewer.id,
            cityId: city.id,
            reachedLevel: 5,
            reward: "TREASURY",
            coins: 12,
          },
        ],
        view.viewer.id,
      ),
    ).toBe("Treasury automatically granted · +12 Coins.");
    expect(view.pendingChoices).toEqual([]);
  });

  it("keeps city economy private and does not count cooperative allies as besiegers", () => {
    const state = exploredAllV7(initialV7(1523));
    const view = viewForV7(state, state.humanPlayerId);
    const ownedCity = view.cities.find(
      (city) => city.ownerId === view.viewer.id,
    );
    const observedCity = view.cities.find(
      (city) => city.ownerId !== view.viewer.id,
    );
    const hostileUnit = view.units.find(
      (unit) => unit.ownerId !== view.viewer.id,
    );
    if (
      ownedCity === undefined ||
      observedCity === undefined ||
      hostileUnit === undefined
    )
      throw new Error("economy fixture missing");
    const baseIncome = cityIncomeForViewerV7(view, ownedCity.id);
    expect(baseIncome).not.toBeNull();
    const occupied = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === hostileUnit.id ? { ...unit, at: ownedCity.at } : unit,
      ),
    };
    expect(
      cityIncomeForViewerV7(
        { ...occupied, setup: { ...occupied.setup, aiMode: "COOPERATIVE" } },
        ownedCity.id,
      ),
    ).toBe(0);
    expect(cityIncomeForViewerV7(occupied, ownedCity.id)).toBe(0);
    expect(cityIncomeForViewerV7(view, observedCity.id)).toBeNull();

    const created = createInitialMapStateV7({
      ...setupV7(1524, 3),
      aiMode: "COOPERATIVE",
    });
    if (!created.ok) throw new Error(created.error.code);
    const allExplored = checkedV7({
      ...created.state,
      players: created.state.players.map((player) => ({
        ...player,
        explored: created.state.board.tiles.map((tile) => tile.at),
      })),
    });
    const aiPlayers = allExplored.players.filter(
      (player) => player.controller === "AI",
    );
    const aiViewer = aiPlayers[0];
    const aiAlly = aiPlayers[1];
    if (aiViewer === undefined || aiAlly === undefined)
      throw new Error("AI alliance fixture missing");
    const alliedView = viewForV7(allExplored, aiViewer.id);
    const alliedCity = alliedView.cities.find(
      (city) => city.ownerId === aiViewer.id,
    );
    const alliedUnit = alliedView.units.find(
      (unit) => unit.ownerId === aiAlly.id,
    );
    if (alliedCity === undefined || alliedUnit === undefined)
      throw new Error("allied economy fixture missing");
    const alliedBase = cityIncomeForViewerV7(alliedView, alliedCity.id);
    const alliedOccupied = {
      ...alliedView,
      units: alliedView.units.map((unit) =>
        unit.id === alliedUnit.id ? { ...unit, at: alliedCity.at } : unit,
      ),
    };
    expect(cityIncomeForViewerV7(alliedOccupied, alliedCity.id)).toBe(
      alliedBase,
    );
  });

  it("states all revision-4 economic formulas with their exact numbers", () => {
    expect([
      economicFormulaV7("WINDMILL", "CONNECTED_ORTHOGONAL_CLUSTER"),
      economicFormulaV7("SAWMILL", "CONNECTED_ORTHOGONAL_CLUSTER"),
      economicFormulaV7("FORGE", "ADJACENT_MINES"),
      economicFormulaV7("WORKSHOP", "DISTINCT_BASIC_TYPES"),
      economicFormulaV7("GRAND_WORKS", "DISTINCT_PROCESSOR_TYPES"),
      economicFormulaV7("MARKET", "DISTINCT_ECONOMIC_FAMILIES"),
    ]).toEqual([
      expect.stringMatching(/\+1.*Farm.*cap 8.*0/),
      expect.stringMatching(/\+1.*Lumber Camp.*cap 8/),
      expect.stringMatching(/\+1.*Mine.*maximum 6.*at least one Mine.*0/),
      expect.stringMatching(/0.*\+1 plus.*distinct.*cap 4/),
      expect.stringMatching(/0 below two.*\+4 plus.*\+2 per.*cap 10/),
      expect.stringMatching(
        /\+1 recurring Coin.*inactive processors.*\+1.*Road.*cap 4/,
      ),
    ]);
  });

  it("shows Monument provenance only from the FULL current-owner projection", () => {
    const state = initialV7(1525);
    const view = viewForV7(state, state.humanPlayerId);
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    const full: PlayerViewV7 = {
      ...view,
      populationContributions: [
        {
          id: 10,
          cityId: city.id,
          category: "LIVE" as const,
          amount: 3,
          source: {
            kind: "MONUMENT" as const,
            visibility: "FULL" as const,
            achievement: "ENGINEER" as const,
            at: city.at,
          },
        },
      ],
    };
    expect(monumentSourceForViewerV7(full, city.at)).toBe("ENGINEER");
    const fullContribution = full.populationContributions[0];
    if (fullContribution === undefined)
      throw new Error("Monument contribution missing");
    expect(
      monumentSourceForViewerV7(
        {
          ...full,
          populationContributions: [
            {
              ...fullContribution,
              category: "LIVE" as const,
              amount: 3 as const,
              source: {
                kind: "MONUMENT" as const,
                visibility: "BUILDING_ONLY" as const,
                at: city.at,
              },
            },
          ],
        },
        city.at,
      ),
    ).toBeNull();
  });
});
