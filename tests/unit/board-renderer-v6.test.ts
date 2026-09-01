import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  RESOURCE_IDS,
  UNIT_ROLE_IDS,
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
  buildBoardDrawListV6,
  drawBoardV6,
  unitScaleContractForRoleV6,
  unitVisibleFootprintV6,
} from "../../src/render/canvas/board-renderer-v6";
import { createRuleset6AcceptedImageResolver } from "../../src/render/canvas/accepted-images-v6";
import type {
  BoardRenderPlanV6,
  RenderEntryKindV6,
  RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";

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
      "TERRAIN_BODY",
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

  it("labels every reused raster and every non-production placeholder explicitly", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      expect(terrainCoverageV6("GRASS", faction, 0).status).toBe("ACCEPTED");
      expect(terrainCoverageV6("FOREST", faction, 3).status).toBe("ACCEPTED");
      expect(terrainCoverageV6("MOUNTAIN", faction, 7).status).toBe("ACCEPTED");
      for (const resource of RESOURCE_IDS) {
        expect(resourceCoverageV6(resource, faction).status).toBe(
          resource === "FERTILE_GROUND" || resource === "STONE"
            ? "PLACEHOLDER"
            : "ACCEPTED",
        );
      }
      for (const role of UNIT_ROLE_IDS) {
        const expected = ["FIGHTER", "MARKSMAN", "GUARD", "RAIDER"].includes(
          role,
        )
          ? "ACCEPTED"
          : "PLACEHOLDER";
        const item = unitCoverageV6(faction, role);
        expect(item.status, `${faction}:${role}`).toBe(expected);
        expect(item.production).toBe(expected === "ACCEPTED");
      }
      expect(cityCoverageV6(faction, 1).status).toBe("ACCEPTED");
      expect(cityCoverageV6(faction, 8).status).toBe("ACCEPTED");
    }
    for (const improvement of ECONOMIC_IMPROVEMENT_IDS) {
      expect(improvementCoverageV6(improvement).status).toBe(
        improvement === "MINE" ? "ACCEPTED" : "PLACEHOLDER",
      );
    }
    expect(siteCoverageV6("VILLAGE").status).toBe("ACCEPTED");
    expect(chocolateWallCoverageV6().status).toBe("ACCEPTED");
    expect(roadCoverageV6()).toMatchObject({
      status: "PLACEHOLDER",
      semanticId: "infrastructure:ROAD",
      production: false,
    });

    const list = buildBoardDrawListV6({
      viewport: { width: 800, height: 600 },
      camera: { offsetX: 400, offsetY: 180, zoom: 1 },
      plan: exhaustivePlan(),
    });
    expect(list.coverage.some((item) => item.status === "ACCEPTED")).toBe(true);
    expect(list.coverage.some((item) => item.status === "PLACEHOLDER")).toBe(
      true,
    );
    expect(
      list.coverage
        .filter((item) => item.status === "PLACEHOLDER")
        .every((item) => !item.production && item.assetId === null),
    ).toBe(true);
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
        .every((command) => command.alpha === 1),
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

  it("labels temporary Road masks non-production and never draws a redundant CAPITAL/CITY site over its city", () => {
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
            population: 1,
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
      (item) => item.semanticId === "infrastructure:ROAD",
    );
    expect(road).toMatchObject({
      status: "PLACEHOLDER",
      assetId: null,
      production: false,
    });
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
    CONTACT_SHADOW: null,
    TERRAIN_BODY: { terrain: "FOREST" },
    SITE: { site: "VILLAGE" },
    CHOCOLATE_WALL: { faction: "CANDY", hp: 7 },
    CITY_BACK: { faction: "ORIGINAL", isCapital: true },
    UNIT: { faction: "ORIGINAL", role: "SCOUT", readiness: "OPAQUE" },
    CITY_FRONT: { faction: "ORIGINAL", isCapital: true },
    SELECTION: { selectionKind: "UNIT" },
    CITY_TERRITORY_BOUNDARY: { edge: "NORTH_WEST" },
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
      population: -2,
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
