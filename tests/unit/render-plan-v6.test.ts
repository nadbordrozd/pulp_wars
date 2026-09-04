import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  RESOURCE_IDS,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  cityId,
  createPlayableGameV6,
  playerId,
  previewEconomicV6,
  queryPlayerCommandsV6,
  unitId,
  viewForV6,
  wallId,
  type CommandV6,
  type CoordV6,
  type EconomicImprovementId,
  type GameStateV6,
  type PlayerTileViewV6,
  type PlayerViewV6,
  type ResourceId,
  type UnitRoleId,
} from "../../src/engine/index";
import { buildRenderPlan } from "../../src/render/canvas/render-plan";
import {
  EMPTY_BOARD_RENDER_INTERACTION_V6,
  buildRenderPlanV6,
  compareEntriesV6,
  type EconomicCommandKindV6,
  type EconomicCommandV6,
  type RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";

const OWN = playerId(1);
const RIVAL = playerId(2);
const OWN_CITY = cityId(100);
const RIVAL_CITY = cityId(101);
const TARGET = { x: 5, y: 5 } as const;
const FRESH = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
} as const;

const ECONOMIC_KINDS = [
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const satisfies readonly EconomicCommandKindV6[];

describe("ruleset-6 observation-safe render plan", () => {
  it("marks only visible owned units named by exact offered MOVE readiness", () => {
    const hiddenAt = { x: 8, y: 8 } as const;
    const ownReady = {
      ...unit(200, OWN, "FIGHTER", { x: 2, y: 2 }),
      activation: { ...FRESH, handled: true },
    };
    const ownIdle = unit(201, OWN, "SCOUT", { x: 3, y: 2 });
    const rival = unit(202, RIVAL, "GUARD", { x: 4, y: 2 });
    const hidden = unit(203, OWN, "RAIDER", hiddenAt);
    const view = replaceWithHidden(
      {
        ...baseView(),
        units: [ownReady, ownIdle, rival, hidden],
      },
      hiddenAt,
    );

    const plan = buildRenderPlanV6(view, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      readyUnitIds: [ownReady.id, rival.id, hidden.id],
    });
    expect(
      entriesOf(plan.entries, "UNIT").map((entry) => ({
        id: entry.id,
        readiness: entry.details.readiness,
      })),
    ).toEqual(
      expect.arrayContaining([
        { id: ownReady.id, readiness: "PULSE" },
        { id: ownIdle.id, readiness: "OPAQUE" },
        { id: rival.id, readiness: "OPAQUE" },
      ]),
    );
    expect(
      entriesOf(plan.entries, "UNIT").some((entry) => entry.id === hidden.id),
    ).toBe(false);
  });

  it("projects every public terrain, resource, improvement, Road, site, entity, faction, and role", () => {
    let view = baseView();
    const tileSpecs: readonly {
      readonly at: CoordV6;
      readonly replacement: Partial<ExploredTile>;
    }[] = [
      { at: { x: 2, y: 0 }, replacement: { terrain: "FOREST" } },
      { at: { x: 3, y: 0 }, replacement: { terrain: "MOUNTAIN" } },
      ...RESOURCE_IDS.map((resource, index) => ({
        at: { x: index, y: 2 },
        replacement: {
          terrain: terrainForResource(resource),
          resource,
        },
      })),
      {
        at: { x: 5, y: 2 },
        replacement: { resource: "UNKNOWN_RESOURCE" },
      },
      ...ECONOMIC_IMPROVEMENT_IDS.map((improvement, index) => ({
        at: { x: index, y: 3 },
        replacement: { improvement },
      })),
      { at: { x: 0, y: 4 }, replacement: { road: true } },
      { at: { x: 1, y: 4 }, replacement: { site: "VILLAGE" } },
      { at: { x: 2, y: 4 }, replacement: { site: "CITY" } },
    ];
    for (const spec of tileSpecs) {
      view = replaceTile(view, spec.at, spec.replacement);
    }
    view = {
      ...view,
      cities: [...view.cities, city(RIVAL_CITY, RIVAL, { x: 2, y: 4 }, false)],
      units: UNIT_ROLE_IDS.flatMap((role, index) => [
        unit(200 + index, OWN, role, { x: index, y: 6 }),
        unit(300 + index, RIVAL, role, { x: index, y: 7 }),
      ]),
      chocolateWalls: [
        { id: wallId(400), ownerId: RIVAL, at: { x: 10, y: 8 }, hp: 7 },
      ],
    };

    const plan = buildRenderPlanV6(inactive(view));
    expect(
      entriesOf(plan.entries, "TERRAIN").map((entry) => entry.details.terrain),
    ).toEqual(expect.arrayContaining(["GRASS", "FOREST", "MOUNTAIN"]));
    expect(
      entriesOf(plan.entries, "RESOURCE").map(
        (entry) => entry.details.resource,
      ),
    ).toEqual(expect.arrayContaining([...RESOURCE_IDS]));
    expect(entriesOf(plan.entries, "UNKNOWN_RESOURCE")).toHaveLength(1);
    expect(
      entriesOf(plan.entries, "IMPROVEMENT").map(
        (entry) => entry.details.improvement,
      ),
    ).toEqual(expect.arrayContaining([...ECONOMIC_IMPROVEMENT_IDS]));
    expect(entriesOf(plan.entries, "ROAD")).toHaveLength(1);
    expect(
      entriesOf(plan.entries, "SITE").map((entry) => entry.details.site),
    ).toEqual(expect.arrayContaining(["CAPITAL", "VILLAGE", "CITY"]));
    expect(entriesOf(plan.entries, "CHOCOLATE_WALL")[0]).toMatchObject({
      ownerId: RIVAL,
      details: { faction: "CANDY", hp: 7 },
    });
    expect(
      entriesOf(plan.entries, "UNIT").map((entry) => [
        entry.details.faction,
        entry.details.role,
      ]),
    ).toEqual(
      expect.arrayContaining(
        UNIT_ROLE_IDS.flatMap((role) => [
          ["ORIGINAL", role],
          ["CANDY", role],
        ]),
      ),
    );
    expect(entriesOf(plan.entries, "CITY_BACK")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          details: { faction: "ORIGINAL", isCapital: true },
        }),
        expect.objectContaining({
          details: { faction: "CANDY", isCapital: false },
        }),
      ]),
    );
    expect(entriesOf(plan.entries, "UNIT_STATUS")).toHaveLength(18);
    expect(entriesOf(plan.entries, "CITY_STATUS")).toHaveLength(2);
    expect(
      entriesOf(plan.entries, "CITY_STATUS")[0]?.details.populationLayer,
    ).toMatchObject({
      maxLevel: false,
      required: 2,
      accumulated: 1,
      deficit: 0,
      squares: ["FILLED", "EMPTY"],
    });
    expect(entriesOf(plan.entries, "CHOCOLATE_WALL_STATUS")).toHaveLength(1);
  });

  it.each(["ORIGINAL", "CANDY"] as const)(
    "is byte-identical for equal %s PlayerViewV6 values and remains stably ordered",
    (faction) => {
      const firstView = inactive(baseView(faction));
      const equalView = JSON.parse(JSON.stringify(firstView)) as PlayerViewV6;
      const first = buildRenderPlanV6(firstView, {
        ...EMPTY_BOARD_RENDER_INTERACTION_V6,
        selection: { kind: "CITY", cityId: OWN_CITY },
      });
      const second = buildRenderPlanV6(equalView, {
        ...EMPTY_BOARD_RENDER_INTERACTION_V6,
        selection: { kind: "CITY", cityId: OWN_CITY },
      });
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      expect([...first.entries].sort(compareEntriesV6)).toEqual(first.entries);
      expect(new Set(first.entries.map((entry) => entry.key)).size).toBe(
        first.entries.length,
      );
      const firstOverlay = first.entries.findIndex((entry) => entry.layer > 5);
      expect(firstOverlay).toBeGreaterThan(0);
      expect(
        first.entries.slice(0, firstOverlay).every((entry) => entry.layer <= 5),
      ).toBe(true);
      expect(
        first.entries.slice(firstOverlay).every((entry) => entry.layer > 5),
      ).toBe(true);
      const selection = entriesOf(first.entries, "SELECTION")[0];
      const statuses = first.entries.filter((entry) =>
        entry.kind.endsWith("STATUS"),
      );
      expect(selection?.layer).toBe(6);
      expect(statuses.every((entry) => entry.layer === 8)).toBe(true);
    },
  );

  it("projects exact zero, one, and multi-level public improvement values without reconstructing economy rules", () => {
    const values = [
      ["WINDMILL", 0, "POPULATION"],
      ["SAWMILL", 1, "POPULATION"],
      ["FORGE", 4, "POPULATION"],
      ["STONEWORKS", 7, "POPULATION"],
      ["WORKSHOP", 3, "POPULATION"],
      ["GRAND_WORKS", 6, "POPULATION"],
      ["MARKET", 5, "COIN_INCOME"],
    ] as const;
    let view = baseView();
    const improvementValues = values.map(
      ([improvement, level, measure], index) => ({
        at: { x: index + 2, y: 4 },
        improvement,
        level,
        measure,
      }),
    );
    for (const value of improvementValues) {
      view = replaceTile(view, value.at, {
        improvement: value.improvement,
        territoryCityId: OWN_CITY,
        territoryOwnerId: OWN,
      });
    }
    view = { ...view, improvementValues };

    const plan = buildRenderPlanV6(inactive(view));
    expect(
      entriesOf(plan.entries, "IMPROVEMENT_LEVEL").map(
        (entry) => entry.details,
      ),
    ).toEqual(improvementValues);
    expect(JSON.stringify(plan)).not.toContain("contributingTiles");
    expect(
      buildRenderPlanV6(
        JSON.parse(JSON.stringify(inactive(view))) as PlayerViewV6,
      ).entries,
    ).toEqual(plan.entries);
  });

  it("emits only fog for unexplored tiles and only a generic marker for UNKNOWN_RESOURCE", () => {
    const hiddenAt = { x: 8, y: 8 } as const;
    const unknownAt = { x: 7, y: 8 } as const;
    let first = baseView();
    first = replaceTile(first, unknownAt, { resource: "UNKNOWN_RESOURCE" });
    first = replaceWithHidden(first, hiddenAt);
    const second = JSON.parse(JSON.stringify(first)) as PlayerViewV6;

    const firstPlan = buildRenderPlanV6(inactive(first));
    const secondPlan = buildRenderPlanV6(inactive(second));
    expect(JSON.stringify(firstPlan)).toBe(JSON.stringify(secondPlan));
    expect(
      firstPlan.entries.filter((entry) => same(entry.at, hiddenAt)),
    ).toEqual([
      expect.objectContaining({
        kind: "FOG",
        ownerId: null,
        details: { diplomaticBlock: null },
      }),
    ]);
    const unknownEntries = firstPlan.entries.filter((entry) =>
      same(entry.at, unknownAt),
    );
    expect(
      unknownEntries.filter((entry) => entry.kind === "UNKNOWN_RESOURCE"),
    ).toHaveLength(1);
    expect(
      unknownEntries.filter((entry) => entry.kind === "RESOURCE"),
    ).toHaveLength(0);
    expect(JSON.stringify(unknownEntries)).not.toMatch(
      /FRUIT|GAME|FERTILE_GROUND|ORE|STONE/,
    );
  });

  it.each(["ORIGINAL", "CANDY"] as const)(
    "renders explored Game before Hunting for %s while keeping hidden Game fogged and Hunt unavailable",
    (faction) => {
      const created = createPlayableGameV6({
        rulesetId: RULESET_6_ID,
        mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
        seed: 42,
        width: 11,
        height: 11,
        aiCount: 1,
        aiDifficulty: "NORMAL",
        aiMode: "RIVAL",
        humanColor: "CORAL",
        factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
      });
      if (!created.ok) throw new Error(created.error.code);
      const viewer = created.state.players.find(
        (player) => player.id === created.state.humanPlayerId,
      );
      if (viewer === undefined) throw new Error("Missing human player");
      const explored = new Set(viewer.explored.map(coordKey));
      const visibleGame = created.state.board.tiles.find(
        (tile) => tile.resource === "GAME" && explored.has(coordKey(tile.at)),
      );
      const hiddenGame = created.state.board.tiles.find(
        (tile) => tile.resource === "GAME" && !explored.has(coordKey(tile.at)),
      );
      if (visibleGame === undefined || hiddenGame === undefined) {
        throw new Error("Seed 42 must include visible and hidden Game");
      }

      const view = viewForV6(created.state, created.state.humanPlayerId);
      expect(view.viewer.researchedTechs).toEqual(["GATHERING"]);
      expect(queryPlayerCommandsV6(view)).not.toContainEqual({
        kind: "HUNT_GAME",
        at: visibleGame.at,
      });
      const plan = buildRenderPlanV6(view);
      expect(
        plan.entries.filter((entry) => same(entry.at, visibleGame.at)),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "RESOURCE",
            details: { resource: "GAME" },
          }),
        ]),
      );
      expect(
        plan.entries.filter((entry) => same(entry.at, hiddenGame.at)),
      ).toEqual([expect.objectContaining({ kind: "FOG" })]);
    },
  );

  it("keeps exact direct-action metadata while rendering only positional map targets", () => {
    let view = baseView();
    view = {
      ...view,
      units: [
        unit(200, OWN, "FIGHTER", TARGET, { hp: 5, maxHp: 10 }),
        unit(201, RIVAL, "FIGHTER", { x: 6, y: 5 }),
      ],
      chocolateWalls: [
        { id: wallId(300), ownerId: RIVAL, at: { x: 4, y: 5 }, hp: 10 },
      ],
    };
    const baseline = buildRenderPlanV6(view);
    const move = must(
      baseline.legalCommands.find(
        (command): command is Extract<CommandV6, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unitId(200),
      ),
    );
    const destination = must(move.path.at(-1));
    const plan = buildRenderPlanV6(view, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(200) },
      activeTarget: destination,
    });
    expect(
      targetCommands(plan.commandTargets, "MOVE").some((command) =>
        sameCommand(command, move),
      ),
    ).toBe(true);
    expect(
      targetCommands(plan.commandTargets, "ATTACK").filter(
        (command) => command.kind === "ATTACK",
      ),
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "ATTACK",
          unitId: unitId(200),
          target: { kind: "UNIT", unitId: unitId(201) },
        },
        {
          kind: "ATTACK",
          unitId: unitId(200),
          target: { kind: "CHOCOLATE_WALL", wallId: wallId(300) },
        },
      ]),
    );
    expect(
      targetCommands(plan.commandTargets, "SELF_ABILITY").map(
        (command) => command.kind,
      ),
    ).toEqual(expect.arrayContaining(["RECOVER", "WAIT"]));
    expect(entriesOf(plan.entries, "MOVE_TARGET").length).toBeGreaterThan(0);
    expect(entriesOf(plan.entries, "ATTACK_TARGET")).toHaveLength(2);
    expect(entriesOf(plan.entries, "ABILITY_TARGET")).toHaveLength(0);
    expect(
      entriesOf(plan.entries, "MOVE_PATH").map((entry) => entry.at),
    ).toEqual(move.path);
    expect(
      plan.commandTargets.every((target) =>
        plan.legalCommands.some((command) =>
          sameCommand(command, target.command),
        ),
      ),
    ).toBe(true);
  });

  it("maps Heal, Candy Roll, and Chocolate Wall targeting without hidden victims", () => {
    const healView = {
      ...baseView(),
      units: [
        unit(200, OWN, "MEDIC", TARGET),
        unit(201, OWN, "FIGHTER", { x: 6, y: 5 }, { hp: 4, maxHp: 10 }),
      ],
    };
    const healPlan = buildRenderPlanV6(healView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(200) },
    });
    expect(targetCommands(healPlan.commandTargets, "HEAL")).toContainEqual({
      kind: "HEAL_ADJACENT",
      unitId: unitId(200),
      targetUnitId: unitId(201),
    });
    expect(entriesOf(healPlan.entries, "HEAL_TARGET")).toHaveLength(1);

    const donutView = {
      ...baseView("CANDY"),
      units: [unit(210, OWN, "RAIDER", TARGET)],
    };
    const rollTarget = { x: 5, y: 4 } as const;
    const rollPlan = buildRenderPlanV6(donutView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(210) },
      activeTarget: rollTarget,
      targetMode: { kind: "KAMIKAZE_ROLL", unitId: unitId(210) },
    });
    expect(
      targetCommands(rollPlan.commandTargets, "ROLL").map(
        (command) => command.kind === "KAMIKAZE_ROLL" && command.direction,
      ),
    ).toEqual(["NORTH", "EAST", "SOUTH", "WEST"]);
    expect(entriesOf(rollPlan.entries, "ROLL_TARGET")).toHaveLength(4);
    expect(
      entriesOf(rollPlan.entries, "ROLL_PATH").map((entry) => entry.at),
    ).toEqual(Array.from({ length: 5 }, (_, y) => ({ x: 5, y })));
    expect(JSON.stringify(rollPlan.entries)).not.toContain("ROLL_VICTIM");

    const guardView = {
      ...baseView("CANDY"),
      units: [unit(220, OWN, "GUARD", TARGET)],
    };
    const wallPlan = buildRenderPlanV6(guardView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(220) },
      targetMode: {
        kind: "BUILD_CHOCOLATE_WALL",
        unitId: unitId(220),
      },
    });
    expect(targetCommands(wallPlan.commandTargets, "WALL").length).toBe(8);
    expect(entriesOf(wallPlan.entries, "WALL_TARGET")).toHaveLength(8);
  });

  it.each(ECONOMIC_KINDS)(
    "keeps exact %s command metadata without exposing a redundant map target",
    (kind) => {
      const view = economicView(kind);
      const command = { kind, at: TARGET } as EconomicCommandV6;
      const plan = buildRenderPlanV6(view, {
        ...EMPTY_BOARD_RENDER_INTERACTION_V6,
        selection: { kind: "TILE", at: TARGET },
      });
      expect(plan.legalCommands).toContainEqual(command);
      expect(
        plan.commandTargets.some(
          (target) =>
            target.family === "ECONOMIC" &&
            same(target.at, TARGET) &&
            sameCommand(target.command, command),
        ),
      ).toBe(true);
      expect(
        entriesOf(plan.entries, "ECONOMIC_TARGET").some((entry) =>
          sameCommand(entry.details.command, command),
        ),
      ).toBe(false);
    },
  );

  it("accepts only a matching public economic preview and sorts contributors, deltas, and pair axes", () => {
    let view = economicView("BUILD_STONEWORKS");
    for (const at of [
      { x: 5, y: 4 },
      { x: 5, y: 6 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
    ]) {
      view = replaceTile(view, at, {
        improvement: "QUARRY",
        territoryCityId: OWN_CITY,
        territoryOwnerId: OWN,
      });
    }
    const command = {
      kind: "BUILD_STONEWORKS",
      at: TARGET,
    } as const satisfies EconomicCommandV6;
    const result = previewEconomicV6(view, command);
    expect(result.ok).toBe(true);
    const plan = buildRenderPlanV6(view, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "TILE", at: TARGET },
      economicPreview: { command, result },
    });
    expect(plan.economicPreview).toEqual({ command, result });
    expect(entriesOf(plan.entries, "ECONOMIC_VALUE")).toHaveLength(1);
    expect(
      [...entriesOf(plan.entries, "ECONOMIC_CONTRIBUTOR")]
        .sort((left, right) => left.details.ordinal - right.details.ordinal)
        .map((entry) => entry.at),
    ).toEqual([
      { x: 5, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
    ]);
    expect(
      entriesOf(plan.entries, "ECONOMIC_PAIR_AXIS").map(
        (entry) => entry.details.axis,
      ),
    ).toEqual(["NORTH_SOUTH", "EAST_WEST"]);

    const forged = result.ok
      ? {
          ok: true as const,
          preview: {
            ...result.preview,
            contributingTiles: [{ x: 10, y: 10 }],
          },
        }
      : result;
    const rejected = buildRenderPlanV6(view, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      economicPreview: { command, result: forged },
    });
    expect(rejected.economicPreview).toBeNull();
    expect(entriesOf(rejected.entries, "ECONOMIC_CONTRIBUTOR")).toHaveLength(0);
  });

  it("keeps direct Train and unit actions off-map while mapping mandatory choices", () => {
    const training = buildRenderPlanV6(baseView(), {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "CITY", cityId: OWN_CITY },
    });
    expect(targetCommands(training.commandTargets, "TRAIN").length).toBe(8);
    expect(entriesOf(training.entries, "TRAIN_TARGET")).toHaveLength(0);

    const rewardView: PlayerViewV6 = {
      ...baseView(),
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: OWN_CITY,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ],
    };
    const reward = buildRenderPlanV6(rewardView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "CITY", cityId: OWN_CITY },
    });
    expect(targetCommands(reward.commandTargets, "CHOICE")).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: OWN_CITY,
        reachedLevel: 2,
        reward: "SURVEY",
      },
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: OWN_CITY,
        reachedLevel: 2,
        reward: "STOCKPILE",
      },
    ]);
    expect(entriesOf(reward.entries, "CHOICE_TARGET")).toHaveLength(2);

    const candifyChoiceView: PlayerViewV6 = {
      ...baseView("CANDY"),
      units: [unit(230, OWN, "FIGHTER", { x: 2, y: 2 })],
      pendingChoices: [
        {
          kind: "CANDIFY_CITY",
          unitId: unitId(230),
          candidateCityIds: [OWN_CITY],
        },
      ],
    };
    const candifyChoice = buildRenderPlanV6(candifyChoiceView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "CITY", cityId: OWN_CITY },
    });
    expect(targetCommands(candifyChoice.commandTargets, "CHOICE")).toEqual([
      {
        kind: "CHOOSE_CANDIFY_CITY",
        unitId: unitId(230),
        cityId: OWN_CITY,
      },
    ]);

    let captureView = baseView();
    captureView = replaceTile(
      captureView,
      { x: 3, y: 3 },
      {
        site: "VILLAGE",
        territoryCityId: null,
        territoryOwnerId: null,
      },
    );
    captureView = {
      ...captureView,
      units: [
        {
          ...unit(240, OWN, "FIGHTER", { x: 3, y: 3 }),
          captureEligible: true,
        },
      ],
    };
    const capture = buildRenderPlanV6(captureView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(240) },
    });
    expect(
      targetCommands(capture.commandTargets, "SELF_ABILITY"),
    ).toContainEqual({
      kind: "CAPTURE",
      unitId: unitId(240),
    });
    expect(entriesOf(capture.entries, "ABILITY_TARGET")).toHaveLength(0);

    let candifyView = baseView("CANDY");
    candifyView = replaceTile(
      candifyView,
      { x: 2, y: 2 },
      {
        territoryCityId: null,
        territoryOwnerId: null,
        site: null,
      },
    );
    candifyView = {
      ...candifyView,
      units: [unit(250, OWN, "FIGHTER", { x: 2, y: 2 })],
    };
    const candify = buildRenderPlanV6(candifyView, {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(250) },
    });
    expect(
      targetCommands(candify.commandTargets, "SELF_ABILITY"),
    ).toContainEqual({
      kind: "CANDIFY",
      unitId: unitId(250),
    });
    expect(entriesOf(candify.entries, "ABILITY_TARGET")).toHaveLength(0);
  });

  it("uses stable row-major square depth, body ties, and public IDs inside each layer", () => {
    const at = { x: 4, y: 4 } as const;
    let view = replaceTile(baseView(), at, {
      terrain: "FOREST",
      improvement: "FARM",
      site: "CITY",
    });
    view = {
      ...view,
      cities: [...view.cities, city(RIVAL_CITY, RIVAL, at, false)],
      units: [unit(777, OWN, "SCOUT", at)],
    };
    const plan = buildRenderPlanV6(inactive(view));
    const bodies = plan.entries.filter(
      (entry) => entry.layer === 5 && same(entry.at, at),
    );
    expect(bodies.map((entry) => entry.kind)).toEqual([
      "CONTACT_SHADOW",
      "TERRAIN_BODY",
      "IMPROVEMENT",
      "SITE",
      "CITY_BACK",
      "UNIT",
      "CITY_FRONT",
    ]);
    expect(
      entriesOf(plan.entries, "UNIT").find((entry) => entry.id === unitId(777)),
    ).toMatchObject({ id: unitId(777), ownerId: OWN, at });
  });

  it("orders square body anchors by row, then column, before same-cell ties", () => {
    const body = (
      id: number,
      at: CoordV6,
      kind: "TERRAIN_BODY" | "UNIT" = "UNIT",
    ): RenderPlanEntryV6 =>
      ({
        key: `${kind}:${id}`,
        kind,
        at,
        id,
        ownerId: OWN,
        variant: 0,
        layer: 5,
        details:
          kind === "UNIT"
            ? { faction: "ORIGINAL", role: "FIGHTER", readiness: "OPAQUE" }
            : { terrain: "FOREST" },
      }) as RenderPlanEntryV6;
    const entries = [
      body(4, { x: 0, y: 1 }),
      body(3, { x: 1, y: 0 }),
      body(2, { x: 1, y: 1 }, "TERRAIN_BODY"),
      body(1, { x: 0, y: 0 }),
      body(5, { x: 1, y: 1 }),
    ].sort(compareEntriesV6);
    expect(entries.map(({ id }) => id)).toEqual([1, 3, 4, 2, 5]);
  });

  it("keeps a northern Farm stack behind the complete Forest stack immediately south", () => {
    const north = { x: 4, y: 3 } as const;
    const south = { x: 4, y: 4 } as const;
    let view = replaceTile(baseView(), north, { improvement: "FARM" });
    view = replaceTile(view, south, { terrain: "FOREST" });

    const plan = buildRenderPlanV6(inactive(view));
    const adjacentWorld = plan.entries.filter(
      (entry) =>
        entry.layer <= 5 && (same(entry.at, north) || same(entry.at, south)),
    );
    const northIndexes = adjacentWorld.flatMap((entry, index) =>
      same(entry.at, north) ? [index] : [],
    );
    const southIndexes = adjacentWorld.flatMap((entry, index) =>
      same(entry.at, south) ? [index] : [],
    );

    expect(adjacentWorld.map((entry) => `${entry.kind}:${entry.at.y}`)).toEqual(
      ["TERRAIN:3", "IMPROVEMENT:3", "TERRAIN:4", "TERRAIN_BODY:4"],
    );
    expect(Math.max(...northIndexes)).toBeLessThan(Math.min(...southIndexes));
  });

  it.each(ECONOMIC_IMPROVEMENT_IDS)(
    "depth-sorts northern %s behind southern terrain/resource and city/unit stacks for both factions",
    (improvement) => {
      const north = { x: 7, y: 5 } as const;
      const south = { x: 7, y: 6 } as const;
      const base = replaceTile(baseView("CANDY"), north, { improvement });
      const mountainView = replaceTile(base, south, {
        terrain: "MOUNTAIN",
        resource: "STONE",
        road: true,
      });
      let occupiedCityView = replaceTile(base, south, {
        site: "CITY",
        territoryCityId: RIVAL_CITY,
        territoryOwnerId: RIVAL,
      });
      occupiedCityView = {
        ...occupiedCityView,
        cities: [
          ...occupiedCityView.cities,
          city(RIVAL_CITY, RIVAL, south, false),
        ],
        units: [unit(779, OWN, "JUGGERNAUT", south)],
      };

      for (const [stack, view, expectedSouthKinds] of [
        [
          "terrain/resource",
          mountainView,
          ["TERRAIN", "ROAD", "RESOURCE", "TERRAIN_BODY"],
        ],
        [
          "city/unit",
          occupiedCityView,
          [
            "TERRAIN",
            "OWNERSHIP",
            "CONTACT_SHADOW",
            "SITE",
            "CITY_BACK",
            "UNIT",
            "CITY_FRONT",
          ],
        ],
      ] as const) {
        const adjacentWorld = buildRenderPlanV6(inactive(view)).entries.filter(
          (entry) =>
            entry.layer <= 5 &&
            (same(entry.at, north) || same(entry.at, south)),
        );
        const lastNorth = adjacentWorld
          .map((entry) => same(entry.at, north))
          .lastIndexOf(true);
        const firstSouth = adjacentWorld.findIndex((entry) =>
          same(entry.at, south),
        );

        expect(lastNorth, `${improvement}:${stack}`).toBeGreaterThanOrEqual(0);
        expect(firstSouth, `${improvement}:${stack}`).toBeGreaterThanOrEqual(0);
        expect(lastNorth, `${improvement}:${stack}`).toBeLessThan(firstSouth);
        expect(
          adjacentWorld
            .slice(firstSouth)
            .filter((entry) => same(entry.at, south))
            .map((entry) => entry.kind),
        ).toEqual(expectedSouthKinds);
      }
    },
  );

  it("uses column order as the stable tie-break between complete stacks in one row", () => {
    const west = { x: 3, y: 7 } as const;
    const east = { x: 4, y: 7 } as const;
    let view = replaceTile(baseView(), west, { improvement: "WINDMILL" });
    view = replaceTile(view, east, { terrain: "FOREST" });

    const entries = buildRenderPlanV6(inactive(view)).entries.filter(
      (entry) =>
        entry.layer <= 5 && (same(entry.at, west) || same(entry.at, east)),
    );
    const lastWest = entries
      .map((entry) => same(entry.at, west))
      .lastIndexOf(true);
    const firstEast = entries.findIndex((entry) => same(entry.at, east));

    expect(lastWest).toBeLessThan(firstEast);
  });

  it("sorts Forest Game frontage after its canopy and before units without moving other resources", () => {
    const gameAt = { x: 4, y: 4 } as const;
    let view = replaceTile(baseView(), gameAt, {
      terrain: "FOREST",
      resource: "GAME",
    });
    for (const [index, resource] of RESOURCE_IDS.filter(
      (candidate) => candidate !== "GAME",
    ).entries()) {
      view = replaceTile(
        view,
        { x: index + 5, y: 3 },
        {
          terrain: terrainForResource(resource),
          resource,
        },
      );
    }
    view = {
      ...view,
      units: [unit(778, OWN, "SCOUT", gameAt)],
    };

    const plan = buildRenderPlanV6(inactive(view), {
      ...EMPTY_BOARD_RENDER_INTERACTION_V6,
      selection: { kind: "UNIT", unitId: unitId(778) },
    });
    const gameStack = plan.entries.filter(
      (entry) => entry.layer === 5 && same(entry.at, gameAt),
    );
    expect(gameStack.map((entry) => entry.kind)).toEqual([
      "CONTACT_SHADOW",
      "TERRAIN_BODY",
      "RESOURCE",
      "UNIT",
    ]);
    expect(gameStack.find((entry) => entry.kind === "RESOURCE")).toMatchObject({
      at: gameAt,
      layer: 5,
      details: { resource: "GAME" },
    });
    expect(
      plan.entries.find(
        (entry) => entry.kind === "SELECTION" && same(entry.at, gameAt),
      )?.layer,
    ).toBe(6);
    expect(
      plan.entries.find(
        (entry) => entry.kind === "UNIT_STATUS" && same(entry.at, gameAt),
      )?.layer,
    ).toBe(8);
    expect(
      entriesOf(plan.entries, "RESOURCE")
        .filter((entry) => entry.details.resource !== "GAME")
        .map((entry) => [entry.details.resource, entry.layer]),
    ).toEqual(
      expect.arrayContaining(
        RESOURCE_IDS.filter((resource) => resource !== "GAME").map(
          (resource) => [resource, 4],
        ),
      ),
    );
  });

  it("keeps the public planner typed to PlayerViewV6 and leaves the historical v5 planner separate", () => {
    expectTypeOf(buildRenderPlanV6).parameter(0).toEqualTypeOf<PlayerViewV6>();
    expectTypeOf<GameStateV6>().not.toMatchTypeOf<PlayerViewV6>();
    expect(buildRenderPlanV6).not.toBe(buildRenderPlan);
  });
});

type ExploredTile = Extract<PlayerTileViewV6, { readonly explored: true }>;

function baseView(faction: "ORIGINAL" | "CANDY" = "ORIGINAL"): PlayerViewV6 {
  const factionTreeId =
    faction === "ORIGINAL"
      ? ("ORIGINAL_BASELINE" as const)
      : ("CANDY_BASELINE_V1" as const);
  const coordinates = Array.from({ length: 121 }, (_, index) => ({
    x: index % 11,
    y: Math.floor(index / 11),
  }));
  const tiles: PlayerTileViewV6[] = coordinates.map((at) => {
    const owned = Math.max(Math.abs(at.x - 1), Math.abs(at.y - 1)) <= 1;
    return {
      at,
      explored: true,
      terrain: "GRASS",
      resource: null,
      improvement: null,
      road: false,
      site: same(at, { x: 1, y: 1 }) ? "CAPITAL" : null,
      territoryCityId: owned ? OWN_CITY : null,
      territoryOwnerId: owned ? OWN : null,
    };
  });
  const viewer = {
    id: OWN,
    seat: 0,
    controller: "HUMAN" as const,
    color: "CORAL" as const,
    faction,
    factionTreeId,
    status: "ACTIVE" as const,
    coins: 100,
    researchedTechs: [...TECHNOLOGY_IDS],
    explored: coordinates,
  };
  return {
    schemaVersion: 6,
    rulesetId: RULESET_6_ID,
    commandIndex: 0,
    setup: {
      rulesetId: RULESET_6_ID,
      seed: 123,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
      mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
    },
    humanPlayerId: OWN,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: [OWN, RIVAL],
    viewer,
    players: [
      withoutExploration(viewer),
      {
        id: RIVAL,
        seat: 1,
        controller: "AI",
        color: "TEAL",
        faction: faction === "ORIGINAL" ? "CANDY" : "ORIGINAL",
        factionTreeId:
          faction === "ORIGINAL" ? "CANDY_BASELINE_V1" : "ORIGINAL_BASELINE",
        status: "ACTIVE",
        coins: 5,
        researchedTechs: ["GATHERING"],
      },
    ],
    board: { width: 11, height: 11, tiles },
    cities: [city(OWN_CITY, OWN, { x: 1, y: 1 }, true)],
    populationContributions: [],
    improvementValues: [],
    units: [],
    chocolateWalls: [],
    treasureChests: [],
    pendingChoices: [],
    outcome: null,
  };
}

function economicView(kind: EconomicCommandKindV6): PlayerViewV6 {
  let view = replaceTile(baseView(), TARGET, {
    terrain: "GRASS",
    resource: null,
    improvement: null,
    road: false,
    site: null,
    territoryCityId: OWN_CITY,
    territoryOwnerId: OWN,
  });
  const supports: readonly [CoordV6, EconomicImprovementId][] =
    kind === "BUILD_WINDMILL"
      ? [[{ x: 5, y: 4 }, "FARM"]]
      : kind === "BUILD_SAWMILL"
        ? [[{ x: 5, y: 4 }, "LUMBER_CAMP"]]
        : kind === "BUILD_FORGE"
          ? [[{ x: 5, y: 4 }, "MINE"]]
          : kind === "BUILD_STONEWORKS"
            ? [[{ x: 5, y: 4 }, "QUARRY"]]
            : kind === "BUILD_WORKSHOP"
              ? [
                  [{ x: 5, y: 4 }, "FARM"],
                  [{ x: 6, y: 5 }, "MINE"],
                ]
              : kind === "BUILD_GRAND_WORKS"
                ? [
                    [{ x: 5, y: 4 }, "WINDMILL"],
                    [{ x: 6, y: 5 }, "SAWMILL"],
                    [{ x: 5, y: 6 }, "FORGE"],
                  ]
                : kind === "BUILD_MARKET"
                  ? [
                      [{ x: 5, y: 4 }, "FARM"],
                      [{ x: 6, y: 5 }, "MINE"],
                    ]
                  : [];
  for (const [at, improvement] of supports) {
    view = replaceTile(view, at, {
      improvement,
      territoryCityId: OWN_CITY,
      territoryOwnerId: OWN,
    });
  }
  switch (kind) {
    case "HARVEST_FRUIT":
      return replaceTile(view, TARGET, { terrain: "GRASS", resource: "FRUIT" });
    case "HUNT_GAME":
      return replaceTile(view, TARGET, { terrain: "FOREST", resource: "GAME" });
    case "BUILD_FARM":
      return replaceTile(view, TARGET, {
        terrain: "GRASS",
        resource: "FERTILE_GROUND",
      });
    case "BUILD_LUMBER_CAMP":
    case "CLEAR_FOREST":
      return replaceTile(view, TARGET, { terrain: "FOREST" });
    case "BUILD_MINE":
      return replaceTile(view, TARGET, {
        terrain: "MOUNTAIN",
        resource: "ORE",
      });
    case "BUILD_QUARRY":
      return replaceTile(view, TARGET, {
        terrain: "MOUNTAIN",
        resource: "STONE",
      });
    case "REDEVELOP":
      return replaceTile(view, TARGET, { improvement: "FARM" });
    default:
      return view;
  }
}

function replaceTile(
  view: PlayerViewV6,
  at: CoordV6,
  replacement: Partial<ExploredTile>,
): PlayerViewV6 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        same(tile.at, at)
          ? ({
              ...mustExplored(tile),
              ...replacement,
              at: tile.at,
              explored: true,
            } satisfies ExploredTile)
          : tile,
      ),
    },
  };
}

function replaceWithHidden(view: PlayerViewV6, at: CoordV6): PlayerViewV6 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        same(tile.at, at) ? { at: tile.at, explored: false as const } : tile,
      ),
    },
  };
}

function coordKey(at: CoordV6): string {
  return `${at.x},${at.y}`;
}

function inactive(view: PlayerViewV6): PlayerViewV6 {
  return { ...view, activeSeatIndex: 1 };
}

function city(
  id: ReturnType<typeof cityId>,
  ownerId: ReturnType<typeof playerId>,
  at: CoordV6,
  isCapital: boolean,
): PlayerViewV6["cities"][number] {
  return {
    id,
    ownerId,
    at,
    level: 1,
    permanentPopulation: 1,
    economicPopulation: 0,
    population: 1,
    isCapital,
    expanded: true,
    rewards: [],
  };
}

function unit(
  id: number,
  ownerId: ReturnType<typeof playerId>,
  role: UnitRoleId,
  at: CoordV6,
  values: { readonly hp?: number; readonly maxHp?: number } = {},
): PlayerViewV6["units"][number] {
  return {
    id: unitId(id),
    ownerId,
    homeCityId: ownerId === OWN ? OWN_CITY : RIVAL_CITY,
    role,
    at,
    hp: values.hp ?? 10,
    maxHp: values.maxHp ?? 10,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: FRESH,
  };
}

function entriesOf<Kind extends RenderPlanEntryV6["kind"]>(
  entries: readonly RenderPlanEntryV6[],
  kind: Kind,
): readonly Extract<RenderPlanEntryV6, { readonly kind: Kind }>[] {
  return entries.filter(
    (entry): entry is Extract<RenderPlanEntryV6, { readonly kind: Kind }> =>
      entry.kind === kind,
  );
}

function targetCommands(
  targets: ReturnType<typeof buildRenderPlanV6>["commandTargets"],
  family: ReturnType<
    typeof buildRenderPlanV6
  >["commandTargets"][number]["family"],
): readonly CommandV6[] {
  return targets
    .filter((target) => target.family === family)
    .map((target) => target.command);
}

function withoutExploration(
  player: PlayerViewV6["viewer"],
): PlayerViewV6["players"][number] {
  const { explored: _explored, ...publicPlayer } = player;
  void _explored;
  return publicPlayer;
}

function terrainForResource(
  resource: ResourceId,
): "GRASS" | "FOREST" | "MOUNTAIN" {
  return resource === "GAME"
    ? "FOREST"
    : resource === "ORE" || resource === "STONE"
      ? "MOUNTAIN"
      : "GRASS";
}

function mustExplored(tile: PlayerTileViewV6): ExploredTile {
  if (!tile.explored) throw new Error("expected explored tile");
  return tile;
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function sameCommand(left: CommandV6, right: CommandV6): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function must<Value>(value: Value | null | undefined): Value {
  if (value === null || value === undefined)
    throw new Error("missing fixture value");
  return value;
}
