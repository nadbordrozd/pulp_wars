import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  RESOURCE_IDS,
  UNIT_ROLE_IDS,
  cityId,
  unitId,
  wallId,
} from "../../src/engine/index";
import {
  RENDER_ENTRY_COVERAGE_V6,
  chocolateWallCoverageV6,
  cityCoverageV6,
  improvementCoverageV6,
  roadCoverageV6,
  resourceCoverageV6,
  siteCoverageV6,
  terrainCoverageV6,
  unitCoverageV6,
} from "../../src/render/canvas/asset-coverage-v6";
import {
  BOARD_ART_GEOMETRY,
  RULESET6_UNIT_COSMETIC_OFFSET_Y,
  SQUARE_ART_GEOMETRY,
  anchoredDestinationRect,
} from "../../src/render/canvas/board-art-geometry";
import {
  buildBoardDrawListV6,
  drawBoardV6,
  roadMaskAtV6,
  tileFootprintPoints,
  unitScaleContractForRoleV6,
  unitVisibleFootprintV6,
} from "../../src/render/canvas/board-renderer-v6";
import {
  centerCameraOn,
  projectGrid,
  worldToScreen,
} from "../../src/render/canvas/geometry";
import { createRuleset6AcceptedImageResolver } from "../../src/render/canvas/accepted-images-v6";
import type {
  BoardRenderPlanV6,
  RenderEntryKindV6,
  RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";
import {
  combatAnimationFrameV6,
  type CombatPresentationV6,
} from "../../src/render/canvas/combat-presentation-v6";
import { cityPopulationPresentationV6 } from "../../src/render/city-population-presentation-v6";

const AT = { x: 2, y: 2 } as const;
const WAIT = { kind: "WAIT", unitId: 20 } as const;
const BUILD = { kind: "BUILD_FARM", at: AT } as const;

describe("ruleset-6 Canvas drawing layer", () => {
  it("draws every RenderEntryKindV6 without consulting state", () => {
    const plan = exhaustivePlan();
    const context = drawingContext();
    const first = drawBoardV6({
      context,
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan,
      devicePixelRatio: 2,
    });
    const second = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan: JSON.parse(JSON.stringify(plan)) as BoardRenderPlanV6,
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.commands.length).toBeGreaterThan(plan.entries.length);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.fillText).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it.each([0.625, 1, 1.75] as const)(
    "aligns every tile-sized native overlay to the exact square footprint at %sx",
    (zoom) => {
      const plan = exhaustivePlan();
      const camera = { offsetX: 91, offsetY: 73, zoom } as const;
      const list = buildBoardDrawListV6({
        viewport: { width: 1600, height: 1400 },
        camera,
        plan,
      });
      const fullCellKinds = new Set<RenderEntryKindV6>([
        "FOG",
        "OWNERSHIP",
        "SELECTION",
        "MOVE_TARGET",
        "ATTACK_TARGET",
        "ROLL_TARGET",
        "HEAL_TARGET",
        "WALL_TARGET",
        "ABILITY_TARGET",
        "ECONOMIC_TARGET",
        "TRAIN_TARGET",
        "CHOICE_TARGET",
        "ECONOMIC_CONTRIBUTOR",
      ]);
      for (const entry of plan.entries.filter((candidate) =>
        fullCellKinds.has(candidate.kind),
      )) {
        const polygon = list.commands.find(
          (command) =>
            command.entryKey === entry.key && command.kind === "POLYGON",
        );
        expect(polygon, entry.kind).toMatchObject({
          kind: "POLYGON",
          points: tileFootprintPoints(
            worldToScreen(projectGrid(entry.at), camera),
            zoom,
          ),
        });
      }

      const terrain = plan.entries.find((entry) => entry.kind === "TERRAIN");
      if (terrain === undefined) throw new Error("Missing terrain entry");
      const center = worldToScreen(projectGrid(terrain.at), camera);
      expect(
        list.commands.find(
          (command) =>
            command.entryKey === terrain.key && command.kind === "IMAGE",
        ),
      ).toMatchObject({
        kind: "IMAGE",
        destination: {
          x: center.x - 64 * zoom,
          y: center.y - 64 * zoom,
          width: 128 * zoom,
          height: 128 * zoom,
        },
      });

      const boundary = plan.entries.find(
        (entry) => entry.kind === "CITY_TERRITORY_BOUNDARY",
      );
      if (boundary === undefined) throw new Error("Missing territory boundary");
      const boundaryCenter = worldToScreen(projectGrid(boundary.at), camera);
      expect(
        list.commands.find(
          (command) =>
            command.entryKey === boundary.key && command.kind === "LINE",
        ),
      ).toMatchObject({
        kind: "LINE",
        points: tileFootprintPoints(boundaryCenter, zoom).slice(0, 2),
      });
    },
  );

  it.each([0.625, 1, 1.75] as const)(
    "maps all territory sides and cardinal roads to square edges at %sx",
    (zoom) => {
      const at = { x: 2, y: 2 } as const;
      const edges = ["NORTH", "EAST", "SOUTH", "WEST"] as const;
      const territoryEntries = edges.map((edge, index) => ({
        ...fixtureEntry("CITY_TERRITORY_BOUNDARY", at, { edge }, 6),
        key: `CITY_TERRITORY_BOUNDARY:${edge}`,
        variant: index,
      })) as readonly RenderPlanEntryV6[];
      const roadCoordinates = [
        at,
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 2 },
      ] as const;
      const roadEntries = roadCoordinates.map((roadAt) =>
        fixtureEntry("ROAD", roadAt, null, 3),
      );
      const plan: BoardRenderPlanV6 = {
        planVersion: 6,
        entries: [...roadEntries, ...territoryEntries],
        legalCommands: [],
        commandTargets: [],
        economicPreview: null,
      };
      const camera = { offsetX: 300, offsetY: 220, zoom } as const;
      const list = buildBoardDrawListV6({
        viewport: { width: 900, height: 800 },
        camera,
        plan,
      });
      const center = worldToScreen(projectGrid(at), camera);
      const corners = tileFootprintPoints(center, zoom);
      for (const [index, edge] of edges.entries()) {
        const boundary = list.commands.find(
          (command) =>
            command.entryKey === `CITY_TERRITORY_BOUNDARY:${edge}` &&
            command.kind === "LINE",
        );
        expect(boundary, edge).toMatchObject({
          kind: "LINE",
          points: [corners[index], corners[(index + 1) % corners.length]],
        });
      }

      expect(roadMaskAtV6(plan, at)).toBe(15);
      const centerRoad = list.commands.find(
        (command) =>
          command.entryKey === `ROAD:${at.x},${at.y}` &&
          command.kind === "IMAGE",
      );
      expect(centerRoad).toMatchObject({
        kind: "IMAGE",
        assetId: "terrain-square-road-mask-1111",
        destination: {
          x: center.x - 64 * zoom,
          y: center.y - 64 * zoom,
          width: 128 * zoom,
          height: 128 * zoom,
        },
      });
    },
  );

  it("owns every entry kind with exhaustive code-native or content coverage", () => {
    const kinds = exhaustivePlan().entries.map((entry) => entry.kind);
    expect(Object.keys(RENDER_ENTRY_COVERAGE_V6).sort()).toEqual(
      [...kinds].sort(),
    );
    expect(new Set(kinds).size).toBe(kinds.length);
    const contentKinds = Object.entries(RENDER_ENTRY_COVERAGE_V6)
      .filter(([, mode]) => mode === "CONTENT_ASSET")
      .map(([kind]) => kind);
    expect(contentKinds).toEqual([
      "TERRAIN",
      "ROAD",
      "RESOURCE",
      "IMPROVEMENT",
      "SITE",
      "CHOCOLATE_WALL",
      "CITY_BACK",
      "UNIT",
    ]);
  });

  it("loads accepted images lazily and redraws only at load/error boundaries", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      alt: "not-empty",
      decoding: "auto",
      src: "",
      addEventListener: vi.fn((kind: string, listener: () => void) => {
        listeners.set(kind, listener);
      }),
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const redraw = vi.fn();
    const resolver = createRuleset6AcceptedImageResolver(documentRoot, redraw);
    expect(resolver.resolve("unit-warrior")).toBeNull();
    expect(documentRoot.createElement).toHaveBeenCalledOnce();
    expect(image.alt).toBe("");
    expect(image.decoding).toBe("async");
    expect(image.src).toContain("assets/pixellab/units/warrior.png");
    listeners.get("load")?.();
    expect(redraw).toHaveBeenCalledOnce();
    expect(resolver.resolve("unit-warrior")).toBe(image);
    expect(documentRoot.createElement).toHaveBeenCalledOnce();
    expect(resolver.resolve("missing-v6-asset")).toBeNull();
    expect(documentRoot.createElement).toHaveBeenCalledOnce();
  });

  it("resolves the complete production world inventory without placeholders", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      expect(terrainCoverageV6("GRASS", faction, 0).status).toBe("ACCEPTED");
      expect(terrainCoverageV6("FOREST", faction, 3).status).toBe("ACCEPTED");
      expect(terrainCoverageV6("MOUNTAIN", faction, 7).status).toBe("ACCEPTED");
      for (const resource of RESOURCE_IDS) {
        expect(resourceCoverageV6(resource, faction).status).toBe("ACCEPTED");
      }
      for (const role of UNIT_ROLE_IDS) {
        const item = unitCoverageV6(faction, role);
        expect(item.status, `${faction}:${role}`).toBe("ACCEPTED");
        expect(item.production).toBe(true);
      }
      expect(cityCoverageV6(faction, 1).status).toBe("ACCEPTED");
      expect(cityCoverageV6(faction, 8).status).toBe("ACCEPTED");
    }
    for (const improvement of ECONOMIC_IMPROVEMENT_IDS) {
      expect(improvementCoverageV6(improvement).status).toBe("ACCEPTED");
    }
    expect(siteCoverageV6("VILLAGE").status).toBe("ACCEPTED");
    expect(chocolateWallCoverageV6().status).toBe("ACCEPTED");
    expect(roadCoverageV6()).toMatchObject({
      status: "ACCEPTED",
      semanticId: "infrastructure:ROAD:0000",
      assetId: "terrain-square-road-mask-0000",
      production: true,
    });

    const list = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan: exhaustivePlan(),
    });
    expect(list.coverage.some((item) => item.status === "ACCEPTED")).toBe(true);
    expect(list.coverage.some((item) => item.status === "PLACEHOLDER")).toBe(
      false,
    );
  });

  it("draws UNKNOWN_RESOURCE as ordinary terrain with no world marker", () => {
    const plan = exhaustivePlan();
    const unknown = plan.entries.find(
      (entry) => entry.kind === "UNKNOWN_RESOURCE",
    );
    if (unknown === undefined)
      throw new Error("Missing UNKNOWN_RESOURCE fixture");
    const list = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan,
    });
    expect(
      list.commands.filter((command) => command.entryKey === unknown.key),
    ).toEqual([]);
    expect(
      list.coverage.filter((item) => item.entryKey === unknown.key),
    ).toEqual([]);
  });

  it("draws exactly one compact outlined pip per live improvement level and none at level zero", () => {
    const at = { x: 3, y: 3 } as const;
    const levelEntry = fixtureEntry(
      "IMPROVEMENT_LEVEL",
      at,
      {
        at,
        improvement: "FORGE",
        level: 12,
        measure: "POPULATION",
      },
      8,
    );
    const zeroEntry = fixtureEntry(
      "IMPROVEMENT_LEVEL",
      { x: 4, y: 3 },
      {
        at: { x: 4, y: 3 },
        improvement: "WINDMILL",
        level: 0,
        measure: "POPULATION",
      },
      8,
    );
    const cityEntry = fixtureEntry(
      "CITY_STATUS",
      { x: 5, y: 3 },
      {
        faction: "ORIGINAL",
        level: 2,
        populationLayer: cityPopulationPresentationV6({
          id: cityId(10),
          level: 2,
          population: 2,
        }),
        isCapital: false,
      },
      8,
    );
    const plan: BoardRenderPlanV6 = {
      planVersion: 6,
      entries: [levelEntry, zeroEntry, cityEntry],
      legalCommands: [],
      commandTargets: [],
      economicPreview: null,
    };

    for (const zoom of [0.625, 1, 1.75] as const) {
      const list = buildBoardDrawListV6({
        viewport: { width: 800, height: 600 },
        camera: { offsetX: 400, offsetY: 180, zoom },
        plan,
      });
      const pips = list.commands.filter((command) =>
        command.entryKey.includes(":improvement-level-pip:"),
      );
      expect(pips).toHaveLength(12);
      expect(
        pips.every(
          (command) =>
            command.kind === "RECT" &&
            command.fill === "#89f2d0" &&
            command.stroke === "#102322" &&
            command.width === command.height &&
            command.width >= 3 &&
            command.width <= 5,
        ),
      ).toBe(true);
      expect(
        list.commands.some((command) => command.entryKey === zeroEntry.key),
      ).toBe(false);
      const citySquares = list.commands.filter((command) =>
        command.entryKey.includes(":population-square:"),
      );
      expect(citySquares).toHaveLength(3);
      expect(
        citySquares.every(
          (command) => command.kind === "RECT" && command.fill !== "#89f2d0",
        ),
      ).toBe(true);
    }
  });

  it.each([0.625, 1, 1.75] as const)(
    "keeps Forest Game frontage anchored and ordered through units and overlays at %sx zoom and DPR1/2",
    (zoom) => {
      const at = { x: 3, y: 3 } as const;
      const plan: BoardRenderPlanV6 = {
        planVersion: 6,
        entries: [
          fixtureEntry("TERRAIN", at, { terrain: "FOREST" }, 1),
          fixtureEntry("CONTACT_SHADOW", at, null, 5),
          fixtureEntry("TERRAIN_BODY", at, { terrain: "FOREST" }, 5),
          fixtureEntry("RESOURCE", at, { resource: "GAME" }, 5),
          fixtureEntry(
            "UNIT",
            at,
            {
              faction: "ORIGINAL",
              role: "FIGHTER",
              readiness: "OPAQUE",
            },
            5,
          ),
          fixtureEntry("SELECTION", at, { selectionKind: "UNIT" }, 6),
          fixtureEntry(
            "ATTACK_TARGET",
            at,
            { command: { kind: "WAIT", unitId: 20 } },
            7,
          ),
          fixtureEntry(
            "UNIT_STATUS",
            at,
            {
              role: "FIGHTER",
              faction: "ORIGINAL",
              hp: 10,
              maxHp: 10,
              state: "NEEDS_ACTION",
              veteran: false,
            },
            8,
          ),
        ],
        legalCommands: [],
        commandTargets: [],
        economicPreview: null,
      };

      for (const devicePixelRatio of [1, 2] as const) {
        const context = drawingContext();
        const list = drawBoardV6({
          context,
          viewport: { width: 800, height: 600 },
          camera: { offsetX: 400, offsetY: 180, zoom },
          plan,
          devicePixelRatio,
        });
        expect(context.setTransform).toHaveBeenCalledWith(
          devicePixelRatio,
          0,
          0,
          devicePixelRatio,
          0,
          0,
        );
        const imageCommands = list.commands.filter(
          (command) => command.kind === "IMAGE",
        );
        expect(imageCommands.map((command) => command.entryKey)).toEqual([
          "TERRAIN:3,3",
          "RESOURCE:3,3",
          "UNIT:3,3",
        ]);
        const forest = imageCommands[0];
        const game = imageCommands[1];
        expect(forest?.kind).toBe("IMAGE");
        expect(game?.kind).toBe("IMAGE");
        if (forest?.kind !== "IMAGE" || game?.kind !== "IMAGE") {
          throw new Error("Missing Forest/Game image commands");
        }
        expect(game.destination).toEqual(forest.destination);
        const commandKeys = list.commands.map((command) => command.entryKey);
        expect(commandKeys.indexOf("RESOURCE:3,3")).toBeLessThan(
          commandKeys.indexOf("UNIT:3,3"),
        );
        expect(commandKeys.indexOf("UNIT:3,3")).toBeLessThan(
          commandKeys.indexOf("SELECTION:3,3"),
        );
        expect(commandKeys.indexOf("SELECTION:3,3")).toBeLessThan(
          commandKeys.indexOf("ATTACK_TARGET:3,3"),
        );
        expect(commandKeys.indexOf("ATTACK_TARGET:3,3")).toBeLessThan(
          commandKeys.indexOf("UNIT_STATUS:3,3"),
        );
      }
    },
  );

  it("applies the exact pulse opacity only to ready unit sprites and their fallbacks", () => {
    const plan = exhaustivePlan();
    const unit = plan.entries.find((entry) => entry.kind === "UNIT");
    const status = plan.entries.find((entry) => entry.kind === "UNIT_STATUS");
    const terrain = plan.entries.find((entry) => entry.kind === "TERRAIN");
    if (unit?.kind !== "UNIT" || status === undefined || terrain === undefined)
      throw new Error("Missing renderer fixtures");
    const pulsingPlan: BoardRenderPlanV6 = {
      ...plan,
      entries: plan.entries.map((entry) =>
        entry === unit
          ? {
              ...entry,
              details: {
                ...entry.details,
                role: "FIGHTER",
                readiness: "PULSE",
              },
            }
          : entry,
      ),
    };

    const full = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan: pulsingPlan,
      readinessElapsedMs: 800,
      reducedMotion: false,
    });
    const unitCommands = full.commands.filter(
      (command) => command.entryKey === unit.key,
    );
    expect(unitCommands.length).toBeGreaterThan(0);
    expect(unitCommands.every((command) => command.alpha === 0.62)).toBe(true);
    expect(unitCommands[0]).toMatchObject({
      kind: "IMAGE",
      alpha: 0.62,
      fallback: expect.arrayContaining([
        expect.objectContaining({ alpha: 0.62 }),
      ]),
    });
    expect(
      full.commands
        .filter((command) => command.entryKey === status.key)
        .every((command) => command.alpha === 1),
    ).toBe(true);
    expect(
      full.commands
        .filter((command) => command.entryKey === terrain.key)
        .every((command) => command.alpha !== 0.62),
    ).toBe(true);

    const reduced = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan: pulsingPlan,
      readinessElapsedMs: 800,
      reducedMotion: true,
    });
    expect(
      reduced.commands
        .filter((command) => command.entryKey === unit.key)
        .every((command) => command.alpha === 1),
    ).toBe(true);
  });

  it("transforms only combatant sprites and restores a lethal public snapshot", () => {
    const attackerAt = { x: 2, y: 2 } as const;
    const defenderAt = { x: 3, y: 2 } as const;
    const attacker = fixtureEntry(
      "UNIT",
      attackerAt,
      { faction: "ORIGINAL", role: "FIGHTER", readiness: "OPAQUE" },
      5,
    );
    const status = fixtureEntry(
      "UNIT_STATUS",
      attackerAt,
      {
        faction: "ORIGINAL",
        role: "FIGHTER",
        hp: 7,
        maxHp: 10,
        state: "HANDLED",
        veteran: false,
      },
      8,
    );
    const plan: BoardRenderPlanV6 = {
      planVersion: 6,
      entries: [attacker, status],
      legalCommands: [],
      commandTargets: [],
      economicPreview: null,
    };
    const presentation: CombatPresentationV6 = {
      key: "11:0:22",
      commandIndex: 11,
      motion: "FULL",
      durationMs: 420,
      actorController: "HUMAN",
      kind: "MELEE",
      projectile: null,
      attacker: {
        id: unitId(attacker.id),
        ownerId: 1,
        faction: "ORIGINAL",
        role: "FIGHTER",
        at: attackerAt,
      },
      target: {
        id: unitId(99),
        ownerId: 2,
        faction: "CANDY",
        role: "FIGHTER",
        at: defenderAt,
      },
      targetWall: null,
      targetAt: defenderAt,
      damaged: [
        {
          id: unitId(99),
          ownerId: 2,
          faction: "CANDY",
          role: "FIGHTER",
          at: defenderAt,
        },
      ],
      wallDamaged: false,
      advances: false,
    };
    const options = {
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan,
    } as const;
    const baseline = buildBoardDrawListV6(options);
    const animated = buildBoardDrawListV6({
      ...options,
      combatPresentation: presentation,
      combatFrame: combatAnimationFrameV6(presentation, 120),
    });
    const baselineAttacker = baseline.commands.find(
      (command) =>
        command.entryKey === attacker.key && command.kind === "IMAGE",
    );
    const animatedAttacker = animated.commands.find(
      (command) =>
        command.entryKey === attacker.key && command.kind === "IMAGE",
    );
    if (
      baselineAttacker?.kind !== "IMAGE" ||
      animatedAttacker?.kind !== "IMAGE"
    )
      throw new Error("Missing accepted attacker sprite");
    expect(animatedAttacker.destination).not.toEqual(
      baselineAttacker.destination,
    );
    expect(
      animated.commands.filter((command) => command.entryKey === status.key),
    ).toEqual(
      baseline.commands.filter((command) => command.entryKey === status.key),
    );
    expect(
      animated.commands.some(
        (command) =>
          command.entryKey === "COMBAT_UNIT:11:0:22:99" &&
          command.kind === "IMAGE",
      ),
    ).toBe(true);
  });

  it.each([
    ["NORTH", { x: 2, y: 1 }],
    ["EAST", { x: 3, y: 2 }],
    ["SOUTH", { x: 2, y: 3 }],
    ["WEST", { x: 1, y: 2 }],
  ] as const)(
    "anchors melee travel and ranged projectile geometry from square cell centers toward %s",
    (_direction, targetAt) => {
      const attackerAt = { x: 2, y: 2 } as const;
      const attacker = fixtureEntry(
        "UNIT",
        attackerAt,
        { faction: "ORIGINAL", role: "FIGHTER", readiness: "OPAQUE" },
        5,
      );
      const target = fixtureEntry(
        "UNIT",
        targetAt,
        { faction: "CANDY", role: "GUARD", readiness: "OPAQUE" },
        5,
      );
      const plan: BoardRenderPlanV6 = {
        planVersion: 6,
        entries: [attacker, target],
        legalCommands: [],
        commandTargets: [],
        economicPreview: null,
      };
      const presentation: CombatPresentationV6 = {
        key: `square-${targetAt.x}-${targetAt.y}`,
        commandIndex: 20,
        motion: "FULL",
        durationMs: 420,
        actorController: "HUMAN",
        kind: "MELEE",
        projectile: null,
        attacker: {
          id: unitId(attacker.id),
          ownerId: 1,
          faction: "ORIGINAL",
          role: "FIGHTER",
          at: attackerAt,
        },
        target: {
          id: unitId(target.id),
          ownerId: 2,
          faction: "CANDY",
          role: "GUARD",
          at: targetAt,
        },
        targetWall: null,
        targetAt,
        damaged: [],
        wallDamaged: false,
        advances: false,
      };
      const viewport = { width: 900, height: 700 } as const;
      const zoom = 1.25;
      const camera = centerCameraOn(
        { offsetX: 0, offsetY: 0, zoom },
        projectGrid(attackerAt),
        viewport,
      );
      const baseline = buildBoardDrawListV6({ viewport, camera, plan });
      const baselineImage = baseline.commands.find(
        (command) =>
          command.entryKey === attacker.key && command.kind === "IMAGE",
      );
      if (baselineImage?.kind !== "IMAGE")
        throw new Error("Missing baseline attacker");
      const source = worldToScreen(projectGrid(attackerAt), camera);
      const destination = worldToScreen(projectGrid(targetAt), camera);
      const melee = buildBoardDrawListV6({
        viewport,
        camera,
        plan,
        combatPresentation: presentation,
        combatFrame: {
          attackerTravel: 0.25,
          projectileTravel: 0,
          projectileOpacity: 0,
          shake: 0,
          damagedOpacity: 1,
        },
      });
      const meleeImage = melee.commands.find(
        (command) =>
          command.entryKey === attacker.key && command.kind === "IMAGE",
      );
      if (meleeImage?.kind !== "IMAGE")
        throw new Error("Missing animated attacker");
      expect(
        meleeImage.destination.x - baselineImage.destination.x,
      ).toBeCloseTo((destination.x - source.x) * 0.25);
      expect(
        meleeImage.destination.y - baselineImage.destination.y,
      ).toBeCloseTo((destination.y - source.y) * 0.25);

      const rangedPresentation: CombatPresentationV6 = {
        ...presentation,
        kind: "RANGED",
        projectile: "ARROW",
        attacker: { ...presentation.attacker, role: "MARKSMAN" },
      };
      const ranged = buildBoardDrawListV6({
        viewport,
        camera,
        plan,
        combatPresentation: rangedPresentation,
        combatFrame: {
          attackerTravel: 0,
          projectileTravel: 0.5,
          projectileOpacity: 1,
          shake: 0,
          damagedOpacity: 1,
        },
      });
      const arrowHead = ranged.commands.find(
        (command) =>
          command.entryKey === `COMBAT_PROJECTILE:${presentation.key}` &&
          command.kind === "POLYGON",
      );
      if (arrowHead?.kind !== "POLYGON")
        throw new Error("Missing square-grid projectile");
      expect(arrowHead.points[0]).toEqual({
        x: source.x + (destination.x - source.x) * 0.5,
        y:
          source.y -
          18 * zoom +
          (destination.y - 16 * zoom - (source.y - 18 * zoom)) * 0.5,
      });
    },
  );

  it("layers deterministic ranged projectiles after world bodies and before fog/interaction/status overlays", () => {
    const attackerAt = { x: 2, y: 2 } as const;
    const targetAt = { x: 4, y: 2 } as const;
    const attacker = fixtureEntry(
      "UNIT",
      attackerAt,
      { faction: "ORIGINAL", role: "MARKSMAN", readiness: "OPAQUE" },
      5,
    );
    const fog = fixtureEntry(
      "FOG",
      { x: 3, y: 3 },
      { diplomaticBlock: null },
      0,
    );
    const selection = fixtureEntry(
      "SELECTION",
      attackerAt,
      { selectionKind: "UNIT" },
      6,
    );
    const attackTarget = fixtureEntry(
      "ATTACK_TARGET",
      targetAt,
      { command: WAIT },
      7,
    );
    const status = fixtureEntry(
      "UNIT_STATUS",
      attackerAt,
      {
        faction: "ORIGINAL",
        role: "MARKSMAN",
        hp: 8,
        maxHp: 10,
        state: "HANDLED",
        veteran: false,
      },
      8,
    );
    const plan: BoardRenderPlanV6 = {
      planVersion: 6,
      entries: [fog, attacker, selection, attackTarget, status],
      legalCommands: [],
      commandTargets: [],
      economicPreview: null,
    };
    const presentation: CombatPresentationV6 = {
      key: "12:0:22",
      commandIndex: 12,
      motion: "FULL",
      durationMs: 420,
      actorController: "HUMAN",
      kind: "RANGED",
      projectile: "ARROW",
      attacker: {
        id: unitId(attacker.id),
        ownerId: 1,
        faction: "ORIGINAL",
        role: "MARKSMAN",
        at: attackerAt,
      },
      target: null,
      targetWall: {
        id: wallId(700),
        ownerId: 2,
        faction: "CANDY",
        hp: 3,
        at: targetAt,
      },
      targetAt,
      damaged: [],
      wallDamaged: true,
      advances: false,
    };
    const options = {
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan,
    } as const;
    const baseline = buildBoardDrawListV6(options);
    const flight = buildBoardDrawListV6({
      ...options,
      combatPresentation: presentation,
      combatFrame: combatAnimationFrameV6(presentation, 110),
    });
    const projectile = flight.commands.filter(
      (command) => command.entryKey === "COMBAT_PROJECTILE:12:0:22",
    );
    expect(projectile.map((command) => command.kind)).toEqual([
      "LINE",
      "POLYGON",
    ]);
    const projectileIndexes = flight.commands.flatMap((command, index) =>
      command.entryKey.startsWith("COMBAT_PROJECTILE:") ? [index] : [],
    );
    const worldIndexes = flight.commands.flatMap((command, index) =>
      command.entryKey === attacker.key ||
      command.entryKey === "COMBAT_WALL:12:0:22:700"
        ? [index]
        : [],
    );
    const overlayIndexes = flight.commands.flatMap((command, index) =>
      command.entryKey === fog.key ||
      command.entryKey === selection.key ||
      command.entryKey === attackTarget.key ||
      command.entryKey === status.key
        ? [index]
        : [],
    );
    expect(worldIndexes.length).toBeGreaterThan(0);
    expect(projectileIndexes).toHaveLength(2);
    expect(overlayIndexes.length).toBeGreaterThan(0);
    expect(Math.max(...worldIndexes)).toBeLessThan(
      Math.min(...projectileIndexes),
    );
    expect(Math.max(...projectileIndexes)).toBeLessThan(
      Math.min(...overlayIndexes),
    );
    expect(
      flight.commands.find(
        (command) =>
          command.entryKey === attacker.key && command.kind === "IMAGE",
      ),
    ).toEqual(
      baseline.commands.find(
        (command) =>
          command.entryKey === attacker.key && command.kind === "IMAGE",
      ),
    );
    expect(
      flight.commands.some(
        (command) =>
          command.entryKey === "COMBAT_WALL:12:0:22:700" &&
          command.kind === "IMAGE",
      ),
    ).toBe(true);
    for (const zoom of [0.625, 1, 1.75] as const) {
      const camera = centerCameraOn(
        { offsetX: 0, offsetY: 0, zoom },
        projectGrid(presentation.attacker.at),
        options.viewport,
      );
      const renderAtDpr = (devicePixelRatio: 1 | 2) =>
        drawBoardV6({
          context: drawingContext(),
          viewport: options.viewport,
          camera,
          plan,
          devicePixelRatio,
          combatPresentation: presentation,
          combatFrame: combatAnimationFrameV6(presentation, 110),
        }).commands.filter((command) =>
          command.entryKey.startsWith("COMBAT_PROJECTILE:"),
        );
      const dpr1 = renderAtDpr(1);
      const dpr2 = renderAtDpr(2);
      expect(dpr2).toEqual(dpr1);
      expect(dpr1).toHaveLength(2);
      const points = dpr1.flatMap((command) =>
        command.kind === "LINE" || command.kind === "POLYGON"
          ? command.points
          : [],
      );
      expect(
        points.every(
          (point) =>
            point.x >= 0 &&
            point.x <= options.viewport.width &&
            point.y >= 0 &&
            point.y <= options.viewport.height,
        ),
      ).toBe(true);
    }

    const candyPresentation: CombatPresentationV6 = {
      ...presentation,
      key: "13:0:22",
      projectile: "GUMBALL",
      attacker: {
        ...presentation.attacker,
        faction: "CANDY",
      },
    };
    const candy = buildBoardDrawListV6({
      ...options,
      combatPresentation: candyPresentation,
      combatFrame: combatAnimationFrameV6(candyPresentation, 110),
    });
    expect(
      candy.commands
        .filter((command) => command.entryKey === "COMBAT_PROJECTILE:13:0:22")
        .map((command) => command.kind),
    ).toEqual(["LINE", "ELLIPSE", "ELLIPSE"]);
    const impact = buildBoardDrawListV6({
      ...options,
      combatPresentation: presentation,
      combatFrame: combatAnimationFrameV6(presentation, 240),
    });
    expect(
      impact.commands.some((command) =>
        command.entryKey.startsWith("COMBAT_PROJECTILE:"),
      ),
    ).toBe(false);
  });

  it("labels an isolated Road with accepted mask 0000 and never draws a redundant CAPITAL/CITY site over its city", () => {
    const at = { x: 1, y: 1 } as const;
    const villageAt = { x: 2, y: 1 } as const;
    const plan: BoardRenderPlanV6 = {
      planVersion: 6,
      entries: [
        fixtureEntry("TERRAIN", at, { terrain: "GRASS" }, 1),
        fixtureEntry("ROAD", at, null, 3),
        fixtureEntry("SITE", at, { site: "CAPITAL" }, 5),
        fixtureEntry(
          "CITY_BACK",
          at,
          { faction: "ORIGINAL", isCapital: true },
          5,
        ),
        fixtureEntry(
          "CITY_STATUS",
          at,
          {
            faction: "ORIGINAL",
            level: 2,
            populationLayer: cityPopulationPresentationV6({
              id: cityId(10),
              level: 2,
              population: 1,
            }),
            isCapital: true,
          },
          8,
        ),
        fixtureEntry("TERRAIN", villageAt, { terrain: "GRASS" }, 1),
        fixtureEntry("SITE", villageAt, { site: "VILLAGE" }, 5),
      ],
      legalCommands: [],
      commandTargets: [],
      economicPreview: null,
    };
    const list = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan,
    });
    const road = list.coverage.find(
      (item) => item.semanticId === "infrastructure:ROAD:0000",
    );
    expect(road).toMatchObject({
      status: "ACCEPTED",
      assetId: "terrain-square-road-mask-0000",
      production: true,
    });
    expect(roadMaskAtV6(plan, at)).toBe(0);
    expect(
      list.commands.some(
        (command) =>
          command.entryKey === "SITE:1,1" && command.kind !== "IMAGE",
      ),
    ).toBe(false);
    expect(
      list.coverage.some((item) => item.semanticId === "site:CAPITAL"),
    ).toBe(false);
    expect(
      list.coverage.some((item) => item.semanticId === "site:VILLAGE"),
    ).toBe(true);
  });

  it.each([0.625, 1, 1.75] as const)(
    "draws exactly one deterministic Canvas square per current-layer point at %sx zoom",
    (zoom) => {
      const progress = cityPopulationPresentationV6({
        id: cityId(10),
        level: 3,
        population: 2,
      });
      const deficit = cityPopulationPresentationV6({
        id: cityId(10),
        level: 3,
        population: -6,
      });
      const makePlan = (
        populationLayer: typeof progress,
      ): BoardRenderPlanV6 => ({
        planVersion: 6,
        entries: [
          fixtureEntry(
            "CITY_STATUS",
            AT,
            {
              faction: "ORIGINAL",
              level: 3,
              populationLayer,
              isCapital: false,
            },
            8,
          ),
        ],
        legalCommands: [],
        commandTargets: [],
        economicPreview: null,
      });
      const progressCommands = buildBoardDrawListV6({
        viewport: { width: 800, height: 600 },
        camera: { offsetX: 400, offsetY: 180, zoom },
        plan: makePlan(progress),
      }).commands.filter((command) =>
        command.entryKey.includes(":population-square:"),
      );
      const deficitCommands = buildBoardDrawListV6({
        viewport: { width: 800, height: 600 },
        camera: { offsetX: 400, offsetY: 180, zoom },
        plan: makePlan(deficit),
      }).commands.filter((command) =>
        command.entryKey.includes(":population-square:"),
      );

      expect(progressCommands).toHaveLength(4);
      expect(
        progressCommands.map((command) =>
          command.kind === "RECT" ? command.fill : null,
        ),
      ).toEqual(["#ffd85e", "#ffd85e", "#203331", "#203331"]);
      expect(deficitCommands).toHaveLength(4);
      expect(
        deficitCommands.every(
          (command) => command.kind === "RECT" && command.fill === "#ff6b6b",
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["FIGHTER", "standard"],
    ["BREACHER", "siege"],
    ["JUGGERNAUT", "giant"],
  ] as const)(
    "keeps %s destination bounds and rear overlap inside the %s contract",
    (role, scaleClass) => {
      const footprint = unitVisibleFootprintV6(role);
      const contract = unitScaleContractForRoleV6(role);
      expect(footprint.scaleClass).toBe(scaleClass);
      expect(footprint.width / 128).toBeGreaterThanOrEqual(
        contract.preferredVisibleWidthRatio[0],
      );
      expect(footprint.width / 128).toBeLessThanOrEqual(
        contract.preferredVisibleWidthRatio[1],
      );
      expect(footprint.height / 74).toBeGreaterThanOrEqual(
        contract.preferredVisibleHeightRatio[0],
      );
      expect(footprint.height / 74).toBeLessThanOrEqual(
        contract.preferredVisibleHeightRatio[1],
      );
      expect(footprint.rearTileOcclusionRatio).toBeLessThanOrEqual(
        contract.maximumRearTileOcclusionRatio,
      );
    },
  );

  it("keeps accepted standard scale at 0.25, Breacher at 0.24, and individualized Juggernaut at 0.25", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      expect(unitCoverageV6(faction, "FIGHTER").geometry.displayScale).toBe(
        0.25,
      );
      expect(unitCoverageV6(faction, "BREACHER").geometry.displayScale).toBe(
        0.24,
      );
      expect(unitCoverageV6(faction, "JUGGERNAUT").geometry.displayScale).toBe(
        0.25,
      );
    }
  });

  it.each([0.625, 1, 1.75] as const)(
    "lowers every faction role and Fertile Ground by painted-bound geometry at %sx with DPR-invariant output",
    (zoom) => {
      const camera = { offsetX: 400, offsetY: 180, zoom } as const;
      const center = worldToScreen(projectGrid(AT), camera);
      for (const faction of ["ORIGINAL", "CANDY"] as const) {
        for (const role of UNIT_ROLE_IDS) {
          const coverage = unitCoverageV6(faction, role);
          const baselineGeometry =
            role === "BREACHER"
              ? BOARD_ART_GEOMETRY.siegeUnit
              : role === "JUGGERNAUT"
                ? BOARD_ART_GEOMETRY.giantUnit
                : BOARD_ART_GEOMETRY.unit;
          expect(coverage.geometry.offsetY, `${faction}:${role}`).toBe(
            RULESET6_UNIT_COSMETIC_OFFSET_Y,
          );
          const destination = anchoredDestinationRect(
            center,
            zoom,
            coverage.geometry,
          );
          const baseline = anchoredDestinationRect(
            center,
            zoom,
            baselineGeometry,
          );
          expect(destination.x, `${faction}:${role}`).toBe(baseline.x);
          expect(destination.width, `${faction}:${role}`).toBe(baseline.width);
          expect(destination.height, `${faction}:${role}`).toBe(
            baseline.height,
          );
          expect(destination.y - baseline.y, `${faction}:${role}`).toBeCloseTo(
            RULESET6_UNIT_COSMETIC_OFFSET_Y * zoom,
            8,
          );

          const unit = fixtureEntry(
            "UNIT",
            AT,
            { faction, role, readiness: "PULSE" },
            5,
          );
          const shadow = fixtureEntry("CONTACT_SHADOW", AT, null, 5);
          const status = fixtureEntry(
            "UNIT_STATUS",
            AT,
            {
              faction,
              role,
              hp: 7,
              maxHp: 10,
              state: "NEEDS_ACTION",
              veteran: false,
            },
            8,
          );
          const plan: BoardRenderPlanV6 = {
            planVersion: 6,
            entries: [shadow, unit, status],
            legalCommands: [],
            commandTargets: [],
            economicPreview: null,
          };
          const renderAtDpr = (devicePixelRatio: 1 | 2) =>
            drawBoardV6({
              context: drawingContext(),
              viewport: { width: 800, height: 600 },
              camera,
              plan,
              devicePixelRatio,
              readinessElapsedMs: 125,
            });
          const dpr1 = renderAtDpr(1);
          const dpr2 = renderAtDpr(2);
          expect(dpr2, `${faction}:${role}`).toEqual(dpr1);
          expect(
            dpr1.commands.find(
              (command) =>
                command.kind === "IMAGE" && command.entryKey === unit.key,
            ),
          ).toMatchObject({ kind: "IMAGE", destination });
          expect(
            dpr1.commands.find(
              (command) =>
                command.kind === "ELLIPSE" && command.entryKey === shadow.key,
            ),
          ).toMatchObject({
            kind: "ELLIPSE",
            center: {
              x: center.x,
              y: center.y + (RULESET6_UNIT_COSMETIC_OFFSET_Y - 2) * zoom,
            },
          });
          const footprint = unitVisibleFootprintV6(role);
          expect(
            dpr1.commands.find(
              (command) =>
                command.kind === "RECT" && command.entryKey === status.key,
            ),
          ).toMatchObject({
            kind: "RECT",
            y:
              center.y +
              RULESET6_UNIT_COSMETIC_OFFSET_Y * zoom -
              footprint.height * zoom -
              13 * zoom -
              2,
          });
        }
      }

      const fertile = resourceCoverageV6("FERTILE_GROUND", "ORIGINAL");
      expect(fertile.geometry).toEqual(SQUARE_ART_GEOMETRY.resource);
      expect(anchoredDestinationRect(center, zoom, fertile.geometry)).toEqual({
        x: center.x - 64 * zoom,
        y: center.y - 128 * zoom,
        width: 128 * zoom,
        height: 192 * zoom,
      });
    },
  );

  it("checks in deterministic Original/Candy native and enlarged evidence for every zoom and DPR", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-canvas-renderer/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly factions: readonly string[];
      readonly zooms: readonly number[];
      readonly devicePixelRatios: readonly number[];
      readonly scaleContracts: Readonly<Record<string, number>>;
      readonly placementContracts: {
        readonly unitOffsetY: number;
        readonly fertileGroundOffsetY: number;
        readonly coordinateSpace: string;
      };
      readonly reviewCoverage: readonly string[];
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.factions).toEqual(["ORIGINAL", "CANDY"]);
    expect(evidence.zooms).toEqual([0.625, 1, 1.75]);
    expect(evidence.devicePixelRatios).toEqual([1, 2]);
    expect(evidence.scaleContracts).toEqual({
      standard: 0.25,
      breacher: 0.24,
      juggernaut: 0.25,
    });
    expect(evidence.placementContracts).toEqual({
      unitOffsetY: 18,
      fertileGroundOffsetY: 18,
      coordinateSpace: "nominal CSS pixels at 1x zoom",
    });
    expect(evidence.reviewCoverage).toContain(
      "all nine Original and all nine Candy unit silhouettes visibly centered at 0.625x, 1x and 1.75x",
    );
    expect(evidence.reviewCoverage).toContain(
      "Fertile Ground painted bounds centered across the owning diamond instead of ending at tile center",
    );
    expect(evidence.reviewCoverage).toContain(
      "Forest Game/Animal frontage without a unit and beneath an occupied selected unit",
    );
    expect(evidence.reviewCoverage).toContain(
      "all seven leveled improvements with exact zero, one, and multi-value compact square pips",
    );
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.artifacts).toHaveLength(8);
    expect(evidence.artifacts.map(({ path }) => path).sort()).toEqual(
      ["ORIGINAL", "CANDY"]
        .flatMap((faction) =>
          [1, 2].flatMap((dpr) =>
            ["native", "enlarged"].map(
              (scale) =>
                `art/pixellab/reviews/ruleset6-canvas-renderer/${faction.toLowerCase()}-dpr${dpr}-${scale}.png`,
            ),
          ),
        )
        .sort(),
    );
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(artifact.bytes, artifact.path).toBe(data.byteLength);
      expect(artifact.sha256, artifact.path).toBe(
        createHash("sha256").update(data).digest("hex"),
      );
    }
  });
});

function exhaustivePlan(): BoardRenderPlanV6 {
  const details: Readonly<Record<RenderEntryKindV6, unknown>> = {
    FOG: { diplomaticBlock: null },
    TERRAIN: { terrain: "GRASS" },
    OWNERSHIP: { faction: "ORIGINAL" },
    ROAD: null,
    RESOURCE: { resource: "STONE" },
    UNKNOWN_RESOURCE: null,
    IMPROVEMENT: { improvement: "WINDMILL" },
    IMPROVEMENT_LEVEL: {
      at: AT,
      improvement: "WINDMILL",
      level: 3,
      measure: "POPULATION",
    },
    CONTACT_SHADOW: null,
    TERRAIN_BODY: { terrain: "FOREST" },
    SITE: { site: "VILLAGE" },
    CHOCOLATE_WALL: { faction: "CANDY", hp: 7 },
    CITY_BACK: { faction: "ORIGINAL", isCapital: true },
    UNIT: { faction: "ORIGINAL", role: "SCOUT", readiness: "OPAQUE" },
    CITY_FRONT: { faction: "ORIGINAL", isCapital: true },
    SELECTION: { selectionKind: "UNIT" },
    CITY_TERRITORY_BOUNDARY: { edge: "NORTH" },
    MOVE_TARGET: { command: WAIT },
    ATTACK_TARGET: { command: WAIT },
    ROLL_TARGET: { command: WAIT },
    ROLL_PATH: { direction: "NORTH", ordinal: 0 },
    HEAL_TARGET: { command: WAIT },
    WALL_TARGET: { command: WAIT },
    ABILITY_TARGET: { command: WAIT },
    ECONOMIC_TARGET: { command: BUILD },
    TRAIN_TARGET: { command: WAIT },
    CHOICE_TARGET: { command: WAIT },
    MOVE_PATH: { ordinal: 0 },
    ECONOMIC_VALUE: {
      command: BUILD,
      ownerCityId: 10,
      cost: 5,
      resultingContribution: 2,
      populationDeltaByCity: [{ cityId: 10, delta: 2 }],
      coinIncomeDeltaByCity: [{ cityId: 10, delta: 1 }],
      capitalRoadConnected: true,
    },
    ECONOMIC_CONTRIBUTOR: {
      command: BUILD,
      ordinal: 0,
      sourceCityId: 10,
    },
    ECONOMIC_PAIR_AXIS: { command: BUILD, axis: "NORTH_SOUTH" },
    UNIT_STATUS: {
      role: "SCOUT",
      faction: "ORIGINAL",
      hp: 7,
      maxHp: 10,
      state: "NEEDS_ACTION",
      veteran: true,
    },
    CHOCOLATE_WALL_STATUS: { hp: 7 },
    CITY_STATUS: {
      faction: "ORIGINAL",
      level: 4,
      populationLayer: cityPopulationPresentationV6({
        id: cityId(10),
        level: 4,
        population: -2,
      }),
      isCapital: true,
    },
  };
  const kinds = Object.keys(details) as RenderEntryKindV6[];
  const entries = kinds.map(
    (kind, index) =>
      ({
        key: `${kind}:${index}`,
        kind,
        at: { x: index % 6, y: Math.floor(index / 6) },
        id: index + 1,
        ownerId: index % 3 === 0 ? null : 1,
        variant: index % 4,
        layer: index,
        details: details[kind],
      }) as RenderPlanEntryV6,
  );
  return {
    planVersion: 6,
    entries,
    legalCommands: [],
    commandTargets: [],
    economicPreview: null,
  };
}

function fixtureEntry(
  kind: RenderEntryKindV6,
  at: { readonly x: number; readonly y: number },
  details: unknown,
  layer: number,
): RenderPlanEntryV6 {
  return {
    key: `${kind}:${at.x},${at.y}`,
    kind,
    at,
    id: at.y * 10 + at.x,
    ownerId: 1,
    variant: 0,
    layer,
    details,
  } as RenderPlanEntryV6;
}

function drawingContext(): CanvasRenderingContext2D {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    lineJoin: "round",
    lineCap: "round",
    globalAlpha: 1,
    font: "10px sans-serif",
    textAlign: "center",
    textBaseline: "middle",
  } as unknown as CanvasRenderingContext2D;
}
