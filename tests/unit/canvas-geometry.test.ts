import { describe, expect, it } from "vitest";
import {
  queryPlayerCommands,
  viewFor,
  wallId,
  type Command,
  type PlayerView,
} from "../../src/engine/index";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_HEIGHT,
  TILE_WIDTH,
  boardWorldBounds,
  centerCameraOn,
  cityLabelVerticalBounds,
  compareGroundAnchors,
  fitCamera,
  inverseProject,
  pickGridTile,
  projectGrid,
  territoryBoundarySegments,
  unitHealthBarGeometry,
  worldToScreen,
  zoomCameraAt,
} from "../../src/render/canvas/geometry";
import {
  buildRenderPlan,
  compareEntries,
} from "../../src/render/canvas/render-plan";
import {
  drawBoard,
  drawUnitHealthBar,
} from "../../src/render/canvas/board-renderer";
import type {
  BoardAssetBindings,
  DrawAssetOptions,
} from "../../src/render/canvas/asset-bindings";
import {
  READINESS_PULSE_DURATION_MS,
  READINESS_PULSE_MIN_OPACITY,
  readinessSpriteOpacity,
  unitNeedsReadinessPulse,
} from "../../src/render/canvas/readiness-presentation";
import { gameStateBuilder } from "../fixtures/builders";

describe("isometric projection, inverse picking, and camera", () => {
  it("uses the exact documented 128 by 74 diamond projection", () => {
    expect(TILE_WIDTH).toBe(128);
    expect(TILE_HEIGHT).toBe(74);
    expect(projectGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(projectGrid({ x: 1, y: 0 })).toEqual({ x: 64, y: 37 });
    expect(projectGrid({ x: 0, y: 1 })).toEqual({ x: -64, y: 37 });
    expect(projectGrid({ x: 3, y: 5 })).toEqual({ x: -128, y: 296 });
    expect(inverseProject(projectGrid({ x: 3, y: 5 }))).toEqual({ x: 3, y: 5 });
  });

  it.each([MIN_ZOOM, 1, MAX_ZOOM])(
    "inverse-picks every tile center and interior at zoom %s",
    (zoom) => {
      const camera = { offsetX: 511.25, offsetY: 83.75, zoom };
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          const center = worldToScreen(projectGrid({ x, y }), camera);
          expect(
            pickGridTile(center, camera, { width: 16, height: 16 }),
          ).toEqual({ x, y });
          expect(
            pickGridTile(
              { x: center.x + 18 * zoom, y: center.y + 4 * zoom },
              camera,
              { width: 16, height: 16 },
            ),
          ).toEqual({ x, y });
        }
      }
    },
  );

  it("samples the exact shared 1.6-second unit-sprite opacity cycle", () => {
    expect(READINESS_PULSE_DURATION_MS).toBe(1_600);
    expect(READINESS_PULSE_MIN_OPACITY).toBe(0.62);
    expect(readinessSpriteOpacity(0, false)).toBe(1);
    expect(readinessSpriteOpacity(400, false)).toBeCloseTo(0.81, 10);
    expect(readinessSpriteOpacity(800, false)).toBe(0.62);
    expect(readinessSpriteOpacity(1_200, false)).toBeCloseTo(0.81, 10);
    expect(readinessSpriteOpacity(1_600, false)).toBe(1);
    expect(readinessSpriteOpacity(-800, false)).toBe(0.62);
    expect(readinessSpriteOpacity(0, true)).toBe(1);
    expect(readinessSpriteOpacity(800, true)).toBe(1);
  });

  it("uses the feet-anchor geometry for Canvas health background and proportional fill", () => {
    const calls: Array<readonly [number, number, number, number, string]> = [];
    const contextStub: {
      fillStyle: string;
      fillRect(x: number, y: number, width: number, height: number): void;
    } = {
      fillStyle: "",
      fillRect(x: number, y: number, width: number, height: number): void {
        calls.push([x, y, width, height, contextStub.fillStyle]);
      },
    };
    const context = contextStub as unknown as CanvasRenderingContext2D;
    const center = { x: 200, y: 150 };
    drawUnitHealthBar(context, center, 1, { hp: 5, maxHp: 10 });
    const geometry = unitHealthBarGeometry(center, 1, 0.5);
    expect(calls).toEqual([
      [
        geometry.background.left,
        geometry.background.top,
        geometry.background.width,
        geometry.background.height,
        "#172326",
      ],
      [
        geometry.fill.left,
        geometry.fill.top,
        geometry.fill.width,
        geometry.fill.height,
        "#ff6d68",
      ],
    ]);
  });

  it("keeps a cursor-fixed world point stable and clamps supported zoom", () => {
    const camera = { offsetX: 100, offsetY: 75, zoom: 1 };
    const cursor = { x: 340, y: 220 };
    const zoomed = zoomCameraAt(camera, 1.5, cursor);
    expect(zoomed.zoom).toBe(1.5);
    const before = {
      x: (cursor.x - camera.offsetX) / camera.zoom,
      y: (cursor.y - camera.offsetY) / camera.zoom,
    };
    const after = {
      x: (cursor.x - zoomed.offsetX) / zoomed.zoom,
      y: (cursor.y - zoomed.offsetY) / zoomed.zoom,
    };
    expect(after).toEqual(before);
    expect(zoomCameraAt(camera, 0.1, cursor).zoom).toBe(MIN_ZOOM);
    expect(zoomCameraAt(camera, 9, cursor).zoom).toBe(MAX_ZOOM);
  });

  it("fits using tall-object overhang and recenters without simulation input", () => {
    const bounds = boardWorldBounds(11, 11);
    expect(bounds.top).toBe(-148);
    expect(bounds.left).toBeLessThan(projectGrid({ x: 0, y: 10 }).x - 64);
    const camera = fitCamera(
      { width: 11, height: 11 },
      { width: 1024, height: 592 },
    );
    expect(camera.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(camera.zoom).toBeLessThanOrEqual(1);
  });

  it("centers a Huge-map capital at minimum zoom while retaining tall-sprite bounds", () => {
    const viewport = { width: 390, height: 592 };
    const fitted = fitCamera({ width: 25, height: 25 }, viewport);
    expect(fitted.zoom).toBe(MIN_ZOOM);
    const capital = projectGrid({ x: 20, y: 2 });
    const centered = centerCameraOn(fitted, capital, viewport);
    expect(worldToScreen(capital, centered)).toEqual({
      x: viewport.width / 2,
      y: viewport.height * 0.55,
    });
    const bounds = boardWorldBounds(25, 25);
    expect(bounds.top).toBe(-148);
    expect(bounds.bottom).toBe(projectGrid({ x: 24, y: 24 }).y + 62);
  });

  it.each([MIN_ZOOM, 1, MAX_ZOOM])(
    "anchors health immediately at unit feet without touching a colocated city label at zoom %s",
    (zoom) => {
      const center = { x: 240, y: 180 };
      const full = unitHealthBarGeometry(center, zoom, 1);
      const half = unitHealthBarGeometry(center, zoom, 0.5);
      const [cityTop] = cityLabelVerticalBounds(center.y, zoom);
      expect(full.background.top).toBeGreaterThanOrEqual(center.y);
      expect(full.background.top).toBeLessThanOrEqual(center.y + 5 * zoom);
      expect(full.background.top + full.background.height).toBeLessThan(
        cityTop,
      );
      expect(full.fill.height).toBe(6);
      expect(full.fill.width).toBeGreaterThanOrEqual(31.5);
      expect(full.fill.width).toBeLessThanOrEqual(52.5);
      expect(half.fill.width).toBe(full.fill.width / 2);
    },
  );

  it("derives a stable 3x3 territory perimeter from adjacency without interior segments", () => {
    const territory = Array.from({ length: 9 }, (_, index) => ({
      x: 4 + (index % 3),
      y: 6 + Math.floor(index / 3),
    }));
    const segments = territoryBoundarySegments(territory);
    expect(segments).toHaveLength(12);
    expect(segments).toEqual(
      territoryBoundarySegments([...territory].reverse()),
    );
    expect(
      segments.filter((segment) => segment.at.x === 5 && segment.at.y === 7),
    ).toEqual([]);
  });
});

describe("stable draw ordering and deterministic render fixtures", () => {
  it("sorts by projected ground anchor across both grid axes with stable ties", () => {
    const anchors = [
      { at: { x: 0, y: 1 }, tie: 0, id: 4 },
      { at: { x: 1, y: 0 }, tie: 0, id: 3 },
      { at: { x: 1, y: 1 }, tie: 50, id: 2 },
      { at: { x: 1, y: 1 }, tie: 10, id: 9 },
    ].sort(compareGroundAnchors);
    expect(anchors).toEqual([
      { at: { x: 0, y: 1 }, tie: 0, id: 4 },
      { at: { x: 1, y: 0 }, tie: 0, id: 3 },
      { at: { x: 1, y: 1 }, tie: 10, id: 9 },
      { at: { x: 1, y: 1 }, tie: 50, id: 2 },
    ]);
  });

  it("builds byte-stable plans with fog behind every revealed world layer", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const view = viewFor(
      {
        ...state,
        activeSeatIndex: state.turnOrder.indexOf(human.id),
      },
      human.id,
    );
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    const city = view.cities.find(
      (candidate) => candidate.ownerId === human.id,
    );
    if (unit === undefined || city === undefined)
      throw new Error("Missing human entities");
    const first = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: unit.id },
      null,
    );
    const second = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: unit.id },
      null,
    );
    expect(JSON.stringify(first.entries)).toBe(JSON.stringify(second.entries));
    expect([...first.entries].sort(compareEntries)).toEqual(first.entries);
    const colocated = first.entries
      .filter((entry) => entry.at.x === city.at.x && entry.at.y === city.at.y)
      .map((entry) => entry.kind);
    expect(colocated.indexOf("CITY_BACK")).toBeLessThan(
      colocated.indexOf("UNIT"),
    );
    expect(colocated.indexOf("UNIT")).toBeLessThan(
      colocated.indexOf("CITY_FRONT"),
    );
    const lastFog = first.entries.reduce(
      (last, entry, index) => (entry.kind === "FOG" ? index : last),
      -1,
    );
    const firstForeground = first.entries.findIndex(
      (entry) => entry.kind !== "FOG",
    );
    expect(lastFog).toBeGreaterThanOrEqual(0);
    expect(firstForeground).toBeGreaterThan(lastFog);
  });

  it("derives sprite pulse eligibility without adding any marker render entry", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const humanTurn = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
    };
    const base = viewFor(humanTurn, human.id);
    const unit = base.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing human unit");
    expect(unitNeedsReadinessPulse(base, unit)).toBe(true);
    const handledView: PlayerView = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: { ...candidate.activation, handled: true },
            }
          : candidate,
      ),
    };
    const handled = handledView.units.find(
      (candidate) => candidate.id === unit.id,
    );
    if (handled === undefined) throw new Error("Missing handled unit");
    expect(unitNeedsReadinessPulse(handledView, handled)).toBe(false);
    expect(
      unitNeedsReadinessPulse(
        { ...base, activeSeatIndex: (base.activeSeatIndex + 1) % 2 },
        unit,
      ),
    ).toBe(false);
    expect(
      buildRenderPlan(base, null, null).entries.some((entry) =>
        ["READINESS_HALO", "READINESS_BADGE", "WAIT_BADGE"].includes(
          entry.kind,
        ),
      ),
    ).toBe(false);
  });

  it("modulates only an eligible unit raster while reduced motion stays opaque", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const view = viewFor(
      { ...state, activeSeatIndex: state.turnOrder.indexOf(human.id) },
      human.id,
    );
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing human unit");
    const observed: number[] = [];
    const ownerCueObserved: number[] = [];
    const contextState = { globalAlpha: 1, fillStyle: "" };
    const stack: number[] = [];
    const context = {
      ...contextState,
      setTransform(): void {},
      clearRect(): void {},
      fillRect(): void {},
      save(): void {
        stack.push(context.globalAlpha);
      },
      restore(): void {
        context.globalAlpha = stack.pop() ?? 1;
      },
    } as unknown as CanvasRenderingContext2D;
    const assets = {
      drawUnit(drawingContext: CanvasRenderingContext2D): void {
        observed.push(drawingContext.globalAlpha);
      },
      drawUnitOwnerCue(drawingContext: CanvasRenderingContext2D): void {
        ownerCueObserved.push(drawingContext.globalAlpha);
      },
    } as unknown as BoardAssetBindings;
    const plan = {
      entries: [
        {
          kind: "UNIT" as const,
          at: unit.at,
          id: unit.id,
          ownerId: unit.ownerId,
          variant: 0,
        },
      ],
      legalCommands: [],
      attackPreviews: [],
    };
    const common = {
      context,
      viewport: { width: 100, height: 100 },
      camera: { offsetX: 0, offsetY: 0, zoom: 1 },
      view,
      plan,
      assets,
      focused: null,
      devicePixelRatio: 1,
      combatPresentation: null,
      combatFrame: null,
    };
    drawBoard({
      ...common,
      readinessElapsedMs: 800,
      reducedMotion: false,
    });
    drawBoard({
      ...common,
      readinessElapsedMs: 800,
      reducedMotion: true,
    });
    expect(observed).toEqual([0.62, 1]);
    expect(ownerCueObserved).toEqual([1, 1]);
    expect(context.globalAlpha).toBe(1);
  });

  it("jumps only the selected unit raster while its cue and health stay ground-anchored", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const view = viewFor(state, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing selected unit");
    const unitCenters: Array<{ readonly x: number; readonly y: number }> = [];
    const cueCenters: Array<{ readonly x: number; readonly y: number }> = [];
    const healthRects: Array<readonly [number, number, number, number]> = [];
    const target: Record<PropertyKey, unknown> = { globalAlpha: 1 };
    const context = new Proxy(target, {
      get(current, property): unknown {
        if (property === "fillRect")
          return (
            x: number,
            y: number,
            width: number,
            height: number,
          ): void => {
            healthRects.push([x, y, width, height]);
          };
        if (property === "measureText") return () => ({ width: 20 });
        if (property in current) return current[property];
        return (): void => {};
      },
      set(current, property, value): boolean {
        current[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const assets = {
      drawUnit(
        _context: CanvasRenderingContext2D,
        options: DrawAssetOptions,
      ): void {
        unitCenters.push(options.center);
      },
      drawUnitOwnerCue(
        _context: CanvasRenderingContext2D,
        options: DrawAssetOptions,
      ): void {
        cueCenters.push(options.center);
      },
    } as unknown as BoardAssetBindings;
    const zoom = 1.5;
    const ground = worldToScreen(projectGrid(unit.at), {
      offsetX: 0,
      offsetY: 0,
      zoom,
    });
    const common = {
      context,
      viewport: { width: 1024, height: 592 },
      camera: { offsetX: 0, offsetY: 0, zoom },
      view,
      plan: {
        entries: [
          {
            kind: "UNIT" as const,
            at: unit.at,
            id: unit.id,
            ownerId: unit.ownerId,
            variant: 0,
          },
          {
            kind: "UNIT_STATUS" as const,
            at: unit.at,
            id: unit.id,
            ownerId: unit.ownerId,
            variant: 0,
          },
        ],
        legalCommands: [],
        attackPreviews: [],
      },
      assets,
      focused: null,
      devicePixelRatio: 1,
      combatPresentation: null,
      combatFrame: null,
      readinessElapsedMs: 0,
    };
    drawBoard({
      ...common,
      reducedMotion: false,
      selectionJump: { unitId: unit.id, elapsedMs: 120, speed: "NORMAL" },
    });
    drawBoard({
      ...common,
      reducedMotion: true,
      selectionJump: { unitId: unit.id, elapsedMs: 120, speed: "NORMAL" },
    });

    expect(unitCenters).toEqual([{ x: ground.x, y: ground.y - 18 }, ground]);
    expect(cueCenters).toEqual([ground, ground]);
    const expectedHealth = unitHealthBarGeometry(
      ground,
      zoom,
      unit.hp / unit.maxHp,
    );
    expect(healthRects[1]?.[1]).toBe(expectedHealth.background.top);
    expect(healthRects[4]?.[1]).toBe(expectedHealth.background.top);
  });

  it("draws no detached yellow reward circle or W/R letter pixels", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const city = base.cities.find(
      (candidate) => candidate.ownerId === human.id,
    );
    if (city === undefined) throw new Error("Missing city fixture");
    const reviewCity = {
      ...city,
      level: 3,
      isCapital: false,
      rewardLevel2: "WORKSHOP" as const,
      rewardLevel3: "RESOURCES" as const,
    };
    const view: PlayerView = {
      ...base,
      cities: base.cities.map((candidate) =>
        candidate.id === city.id ? reviewCity : candidate,
      ),
    };
    const arcs: unknown[][] = [];
    const labels: string[] = [];
    const target: Record<PropertyKey, unknown> = {};
    const context = new Proxy(target, {
      get(current, property): unknown {
        if (property === "measureText") return () => ({ width: 20 });
        if (property === "arc")
          return (...args: unknown[]): void => {
            arcs.push(args);
          };
        if (property === "fillText")
          return (label: string): void => {
            labels.push(label);
          };
        if (property in current) return current[property];
        return (): void => {};
      },
      set(current, property, value): boolean {
        current[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    drawBoard({
      context,
      viewport: { width: 100, height: 100 },
      camera: { offsetX: 0, offsetY: 0, zoom: 1 },
      view,
      plan: {
        entries: [
          {
            kind: "CITY_STATUS",
            at: reviewCity.at,
            id: reviewCity.id,
            ownerId: reviewCity.ownerId,
            variant: 0,
          },
        ],
        legalCommands: [],
        attackPreviews: [],
      },
      assets: {} as BoardAssetBindings,
      focused: null,
      devicePixelRatio: 1,
      combatPresentation: null,
      combatFrame: null,
      readinessElapsedMs: 0,
      reducedMotion: false,
    });
    expect(arcs).toEqual([]);
    expect(labels).toEqual([`City ${city.id} · L3`]);
    expect(labels).not.toContain("W");
    expect(labels).not.toContain("R");
  });

  it("draws a completed Mine over its mountain on the same ground anchor", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const mountain = base.board.tiles.find(
      (tile) => tile.explored && tile.terrain === "MOUNTAIN",
    );
    if (mountain === undefined) throw new Error("Missing explored mountain");
    const view: PlayerView = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === mountain.at.x && tile.at.y === mountain.at.y
            ? { ...tile, resource: null, improvement: "MINE" as const }
            : tile,
        ),
      },
    };
    const colocated = buildRenderPlan(view, null, null)
      .entries.filter(
        (entry) => entry.at.x === mountain.at.x && entry.at.y === mountain.at.y,
      )
      .map((entry) => entry.kind);

    expect(colocated.indexOf("MOUNTAIN")).toBeLessThan(
      colocated.indexOf("MINE"),
    );
  });

  it("keeps Animal and Lumber Mill terrain-bound beneath the Forest canopy", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const tile = base.board.tiles.find((candidate) => candidate.explored);
    if (tile === undefined) throw new Error("Missing explored tile");
    const withFeature = (
      resource: "ANIMAL" | null,
      improvement: "LUMBER_MILL" | null,
    ): PlayerView => ({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((candidate) =>
          candidate.at.x === tile.at.x && candidate.at.y === tile.at.y
            ? {
                ...candidate,
                terrain: "FOREST" as const,
                resource,
                improvement,
                site: null,
              }
            : candidate,
        ),
      },
    });
    const kindsAtTile = (view: PlayerView): readonly string[] =>
      buildRenderPlan(view, null, null)
        .entries.filter(
          (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
        )
        .map((entry) => entry.kind);

    const animal = kindsAtTile(withFeature("ANIMAL", null));
    expect(animal).toContain("ANIMAL");
    expect(animal.indexOf("ANIMAL")).toBeGreaterThan(animal.indexOf("FOREST"));

    const lumber = kindsAtTile(withFeature(null, "LUMBER_MILL"));
    expect(lumber).toContain("LUMBER_MILL");
    expect(lumber.indexOf("LUMBER_MILL")).toBeLessThan(
      lumber.indexOf("FOREST"),
    );
  });

  it("keeps an occupied Fruit marker below its unit at the shared anchor", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const tile = base.board.tiles.find(
      (candidate) => candidate.explored && candidate.site === null,
    );
    const unit = base.units.find((candidate) => candidate.ownerId === human.id);
    if (tile === undefined || unit === undefined)
      throw new Error("Missing occupied Fruit fixture");
    const view: PlayerView = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((candidate) =>
          candidate.at.x === tile.at.x && candidate.at.y === tile.at.y
            ? {
                ...candidate,
                terrain: "GRASS" as const,
                resource: "FRUIT" as const,
                improvement: null,
              }
            : candidate,
        ),
      },
      units: base.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, at: tile.at } : candidate,
      ),
    };
    const kinds = buildRenderPlan(view, null, null)
      .entries.filter(
        (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
      )
      .map((entry) => entry.kind);

    expect(kinds).toContain("FRUIT");
    expect(kinds).toContain("UNIT");
    expect(kinds.indexOf("FRUIT")).toBeLessThan(kinds.indexOf("UNIT"));
  });

  it("does not leak terrain, features, cities, or units for unexplored tiles", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const view = viewFor(state, human.id);
    const hiddenTiles = view.board.tiles.filter((tile) => !tile.explored);
    expect(hiddenTiles.length).toBeGreaterThan(0);
    const hiddenCoordinates = new Set(
      hiddenTiles.map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    expect(
      state.board.tiles.some(
        (tile) =>
          hiddenCoordinates.has(`${tile.at.x},${tile.at.y}`) &&
          (tile.terrain === "MOUNTAIN" ||
            tile.site !== null ||
            tile.resource !== null),
      ),
    ).toBe(true);
    expect(
      [...state.cities, ...state.units].some((entity) =>
        hiddenCoordinates.has(`${entity.at.x},${entity.at.y}`),
      ),
    ).toBe(true);
    const hiddenEntries = buildRenderPlan(view, null, null).entries.filter(
      (entry) => hiddenCoordinates.has(`${entry.at.x},${entry.at.y}`),
    );

    expect(new Set(hiddenEntries.map((entry) => entry.kind))).toEqual(
      new Set(["FOG"]),
    );
  });

  it("renders explored Chocolate Walls below units with feet-level health and hides them in fog", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const tile = base.board.tiles.find(
      (candidate) => candidate.explored && candidate.site === null,
    );
    if (tile === undefined) throw new Error("Missing explored wall fixture");
    const wall = {
      id: wallId(8_001),
      ownerId: human.id,
      at: tile.at,
      hp: 5,
      kind: "CHOCOLATE_WALL" as const,
      maxHp: 10 as const,
    };
    const visible: PlayerView = { ...base, chocolateWalls: [wall] };
    const kinds = buildRenderPlan(visible, null, null)
      .entries.filter(
        (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
      )
      .map((entry) => entry.kind);
    expect(kinds).toContain("CHOCOLATE_WALL");
    expect(kinds).toContain("CHOCOLATE_WALL_STATUS");
    expect(kinds.indexOf("CHOCOLATE_WALL")).toBeLessThan(
      kinds.indexOf("CHOCOLATE_WALL_STATUS"),
    );

    const hidden: PlayerView = {
      ...visible,
      board: {
        ...visible.board,
        tiles: visible.board.tiles.map((candidate) =>
          candidate.at.x === tile.at.x && candidate.at.y === tile.at.y
            ? { at: candidate.at, explored: false as const }
            : candidate,
        ),
      },
    };
    expect(
      buildRenderPlan(hidden, null, null)
        .entries.filter(
          (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
        )
        .map((entry) => entry.kind),
    ).toEqual(["FOG"]);
  });

  it("bounds only explored selected-city territory and emits nothing over fog", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const base = viewFor(state, human.id);
    const city = base.cities.find(
      (candidate) => candidate.ownerId === human.id,
    );
    if (city === undefined) throw new Error("Missing selected city fixture");
    const territory = base.board.tiles.filter(
      (tile) => tile.explored && tile.territoryCityId === city.id,
    );
    const hiddenTerritory = territory.at(-1);
    if (hiddenTerritory === undefined)
      throw new Error("Missing territory fog fixture");
    const view: PlayerView = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === hiddenTerritory.at.x &&
          tile.at.y === hiddenTerritory.at.y
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    };
    const plan = buildRenderPlan(view, { kind: "CITY", cityId: city.id }, null);
    const boundaries = plan.entries.filter(
      (entry) => entry.kind === "CITY_TERRITORY_BOUNDARY",
    );
    const observable = new Set(
      territory
        .filter(
          (tile) =>
            tile.at.x !== hiddenTerritory.at.x ||
            tile.at.y !== hiddenTerritory.at.y,
        )
        .map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    expect(boundaries.length).toBeGreaterThan(0);
    expect(
      boundaries.every((entry) =>
        observable.has(`${entry.at.x},${entry.at.y}`),
      ),
    ).toBe(true);
    expect(
      plan.entries.filter(
        (entry) =>
          entry.at.x === hiddenTerritory.at.x &&
          entry.at.y === hiddenTerritory.at.y,
      ),
    ).toEqual([
      expect.objectContaining({ kind: "FOG", at: hiddenTerritory.at }),
    ]);
  });

  it("projects authoritative public combat feedback for a hovered legal target", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    const enemyPlayer = state.players.find(
      (player) => player.controller === "AI",
    );
    if (human === undefined || enemyPlayer === undefined)
      throw new Error("Missing player fixtures");
    const activeState = {
      ...state,
      activeSeatIndex: state.turnOrder.findIndex((id) => id === human.id),
    };
    const base = viewFor(activeState, human.id);
    const attacker = base.units.find((unit) => unit.ownerId === human.id);
    const enemySource = state.units.find(
      (unit) => unit.ownerId === enemyPlayer.id,
    );
    if (attacker === undefined || enemySource === undefined)
      throw new Error("Missing unit fixtures");
    const targetTile = base.board.tiles.find(
      (tile) =>
        tile.explored &&
        Math.max(
          Math.abs(tile.at.x - attacker.at.x),
          Math.abs(tile.at.y - attacker.at.y),
        ) === 1 &&
        !base.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    );
    if (targetTile === undefined)
      throw new Error("Missing adjacent target tile");
    const defender = { ...enemySource, at: targetTile.at };
    const view: PlayerView = {
      ...base,
      units: [
        ...base.units.filter((unit) => unit.id !== enemySource.id),
        defender,
      ],
    };
    const plan = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: attacker.id },
      defender.at,
    );
    expect(plan.attackPreviews).toContainEqual({
      at: defender.at,
      preview: expect.objectContaining({
        attackerId: attacker.id,
        target: { kind: "UNIT", unitId: defender.id },
      }),
    });
    expect(
      plan.entries.some(
        (entry) => entry.kind === "ATTACK_TARGET" && entry.id === defender.id,
      ),
    ).toBe(true);
  });

  it("projects only the selected owned unit's exact movement targets", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined)
      throw new Error("Missing movement-target fixtures");
    const activeState = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
      players: state.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
          : player,
      ),
    };
    const view = viewFor(activeState, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    const enemy = view.units.find(
      (candidate) => candidate.ownerId !== human.id,
    );
    if (unit === undefined || enemy === undefined)
      throw new Error("Missing visible selected units");
    const expected = new Set(
      queryPlayerCommands(view)
        .map(({ command }) => command)
        .filter(
          (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
            command.kind === "MOVE" && command.unitId === unit.id,
        )
        .map((command) => {
          const at = command.path.at(-1);
          return at === undefined ? "" : `${at.x},${at.y}`;
        })
        .filter(Boolean),
    );
    const ownedTargets = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: unit.id },
      null,
    ).entries.filter((entry) => entry.kind === "MOVE_TARGET");
    expect(
      new Set(ownedTargets.map((entry) => `${entry.at.x},${entry.at.y}`)),
    ).toEqual(expected);
    expect(expected.size).toBeGreaterThan(0);
    const canonicalMove = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      );
    const destination = canonicalMove?.path.at(-1);
    if (canonicalMove === undefined || destination === undefined)
      throw new Error("Missing canonical move");
    expect(
      buildRenderPlan(view, { kind: "UNIT", unitId: unit.id }, destination)
        .entries.filter((entry) => entry.kind === "PATH")
        .map((entry) => entry.at),
    ).toEqual(canonicalMove.path);

    const enemyTargets = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: enemy.id },
      null,
    ).entries.filter(
      (entry) => entry.kind === "MOVE_TARGET" || entry.kind === "ATTACK_TARGET",
    );
    expect(enemyTargets).toEqual([]);
  });
});
