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
  MIN_VISIBLE_AREA_SHARE,
  boardWorldBounds,
  cameraLimitArea,
  cameraPanLimits,
  cellWorldBounds,
  centerCameraOn,
  cityLabelVerticalBounds,
  clampCamera,
  compareGroundAnchors,
  fitCamera,
  frameCameraOnArea,
  inverseProject,
  pickGridTile,
  projectGrid,
  territoryBoundarySegments,
  unitHealthBarGeometry,
  worldToScreen,
  zoomCameraAt,
  type CameraState,
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

describe("square projection, inverse picking, and camera", () => {
  it("uses the exact documented 128 by 128 axis-aligned projection", () => {
    expect(TILE_WIDTH).toBe(128);
    expect(TILE_HEIGHT).toBe(128);
    expect(projectGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(projectGrid({ x: 1, y: 0 })).toEqual({ x: 128, y: 0 });
    expect(projectGrid({ x: 0, y: 1 })).toEqual({ x: 0, y: 128 });
    expect(projectGrid({ x: 3, y: 5 })).toEqual({ x: 384, y: 640 });
    expect(projectGrid({ x: 3, y: 5 }, { x: 17, y: -9 })).toEqual({
      x: 401,
      y: 631,
    });
    expect(inverseProject(projectGrid({ x: 3, y: 5 }))).toEqual({ x: 3, y: 5 });
  });

  it.each([MIN_ZOOM, 1, MAX_ZOOM])(
    "resolves exact square side and corner ties deterministically at zoom %s",
    (zoom) => {
      const camera = { offsetX: 301.25, offsetY: 97.75, zoom };
      const screen = (worldX: number, worldY: number) =>
        worldToScreen({ x: worldX, y: worldY }, camera);
      const board = { width: 2, height: 2 };
      expect(pickGridTile(screen(-64, -64), camera, board)).toEqual({
        x: 0,
        y: 0,
      });
      expect(pickGridTile(screen(64, 0), camera, board)).toEqual({
        x: 0,
        y: 0,
      });
      expect(pickGridTile(screen(0, 64), camera, board)).toEqual({
        x: 0,
        y: 0,
      });
      expect(pickGridTile(screen(64, 64), camera, board)).toEqual({
        x: 0,
        y: 0,
      });
      expect(pickGridTile(screen(64 + 1e-6, 64), camera, board)).toEqual({
        x: 1,
        y: 0,
      });
      expect(pickGridTile(screen(64, 64 + 1e-6), camera, board)).toEqual({
        x: 0,
        y: 1,
      });
      expect(pickGridTile(screen(-64 - 1e-6, 0), camera, board)).toBeNull();
      expect(pickGridTile(screen(192 + 1e-6, 192), camera, board)).toBeNull();
    },
  );

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
    expect(bounds.bottom).toBe(projectGrid({ x: 24, y: 24 }).y + 64);
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
    expect(segments.slice(0, 2)).toEqual([
      { at: { x: 4, y: 6 }, edge: "NORTH" },
      { at: { x: 4, y: 6 }, edge: "WEST" },
    ]);
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
      { at: { x: 1, y: 0 }, tie: 0, id: 3 },
      { at: { x: 0, y: 1 }, tie: 0, id: 4 },
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

describe("camera pan limits (bead pulp_wars-eu3r.5)", () => {
  const size = { width: 16, height: 16 };
  const square = (x0: number, y0: number, x1: number, y1: number) => {
    const cells = [];
    for (let y = y0; y <= y1; y += 1)
      for (let x = x0; x <= x1; x += 1) cells.push({ x, y });
    return cells;
  };
  // A 3x3 explored patch around (4,4): the limit area is 5x5 cells.
  const explored = square(3, 3, 5, 5);
  const area = cameraLimitArea(size, explored);
  const desktop = {
    area,
    viewport: { width: 1280, height: 720 },
    band: { top: 56, bottom: 720 },
  };
  const phone = {
    area,
    viewport: { width: 390, height: 844 },
    band: { top: 96, bottom: 520 },
  };
  const region = (input: typeof desktop) => ({
    x: [0, input.viewport.width] as const,
    y: [input.band.top, input.band.bottom] as const,
  });
  /** A box's on-screen span per axis. */
  const span = (camera: CameraState, box: typeof area.outer) => ({
    x: [
      camera.offsetX + box.left * camera.zoom,
      camera.offsetX + box.right * camera.zoom,
    ] as const,
    y: [
      camera.offsetY + box.top * camera.zoom,
      camera.offsetY + box.bottom * camera.zoom,
    ] as const,
  });
  const expectKeptInView = (camera: CameraState, input: typeof desktop) => {
    const outer = span(camera, input.area.outer);
    const inner = span(camera, input.area.inner);
    const visible = region(input);
    for (const axis of ["x", "y"] as const) {
      const [low, high] = visible[axis];
      const [outerStart, outerEnd] = outer[axis];
      const [innerStart, innerEnd] = inner[axis];
      if (outerEnd - outerStart <= high - low) {
        expect(outerStart).toBeGreaterThanOrEqual(low - 1e-6);
        expect(outerEnd).toBeLessThanOrEqual(high + 1e-6);
      } else
        expect(
          Math.min(innerEnd, high) - Math.max(innerStart, low),
        ).toBeGreaterThanOrEqual(
          Math.min(
            innerEnd - innerStart,
            (high - low) * MIN_VISIBLE_AREA_SHARE,
          ) - 1e-6,
        );
    }
  };

  it("limits to the explored cells plus one cell, clipped to the board", () => {
    const box = (x0: number, y0: number, x1: number, y1: number) => ({
      left: x0 * TILE_WIDTH - TILE_WIDTH / 2,
      top: y0 * TILE_HEIGHT - TILE_HEIGHT / 2,
      right: x1 * TILE_WIDTH + TILE_WIDTH / 2,
      bottom: y1 * TILE_HEIGHT + TILE_HEIGHT / 2,
    });
    expect(area).toEqual({ inner: box(3, 3, 5, 5), outer: box(2, 2, 6, 6) });
    const whole = box(0, 0, 15, 15);
    expect(cameraLimitArea(size, [])).toEqual({ inner: whole, outer: whole });
    // The keyboard cursor never counts as explored on its own.
    expect(cameraLimitArea(size, [], [{ x: 3, y: 3 }])).toEqual({
      inner: whole,
      outer: whole,
    });
    expect(cameraLimitArea(size, [{ x: 0, y: 15 }])).toEqual({
      inner: box(0, 15, 0, 15),
      outer: box(0, 14, 1, 15),
    });
    // The keyboard cursor joins the area.
    expect(cameraLimitArea(size, explored, [{ x: 10, y: 4 }])).toEqual({
      inner: box(3, 3, 10, 5),
      outer: box(2, 2, 11, 6),
    });
  });

  it("leaves the opening framing and moves inside the limits untouched", () => {
    for (const input of [desktop, phone])
      for (const zoom of [MIN_ZOOM, 1]) {
        const framed = frameCameraOnArea(
          { zoom, offsetX: 0, offsetY: 0 },
          {
            area: cellWorldBounds(explored),
            focus: projectGrid({ x: 4, y: 4 }),
            board: boardWorldBounds(16, 16),
            viewport: input.viewport,
            band: input.band,
          },
        );
        expect(clampCamera(framed, input)).toBe(framed);
        const nudged = { ...framed, offsetX: framed.offsetX + 10 };
        expect(clampCamera(nudged, input, framed)).toBe(nudged);
      }
  });

  it("keeps the explored area in view past every edge at every zoom and viewport", () => {
    const whole = { ...phone, area: cameraLimitArea(size, []) };
    const wide = { ...phone, area: cameraLimitArea(size, square(0, 0, 9, 2)) };
    for (const input of [desktop, phone, whole, wide])
      for (const zoom of [MIN_ZOOM, 1, MAX_ZOOM])
        for (const [dx, dy] of [
          [1e5, 0],
          [-1e5, 0],
          [0, 1e5],
          [0, -1e5],
          [1e5, 1e5],
          [-1e5, -1e5],
        ] as const) {
          const clamped = clampCamera(
            { zoom, offsetX: dx, offsetY: dy },
            input,
          );
          expect(clamped.zoom).toBe(zoom);
          expectKeptInView(clamped, input);
        }
  });

  it("keeps a fitting margin box wholly visible, else half the region explored", () => {
    // 5 margin cells at zoom 1 = 640 px: fits 1280 wide, not 390.
    const right = clampCamera({ zoom: 1, offsetX: 1e5, offsetY: 0 }, desktop);
    expect(span(right, area.outer).x[1]).toBeCloseTo(1280, 6);
    const left = clampCamera({ zoom: 1, offsetX: -1e5, offsetY: 0 }, phone);
    // The 3 explored cells (384 px), not fog, cover half of 390 px.
    expect(span(left, area.inner).x[1]).toBeCloseTo(
      390 * MIN_VISIBLE_AREA_SHARE,
      6,
    );
    const away = clampCamera({ zoom: 1, offsetX: 1e5, offsetY: 0 }, phone);
    expect(span(away, area.inner).x[0]).toBeCloseTo(
      390 * (1 - MIN_VISIBLE_AREA_SHARE),
      6,
    );
  });

  it("is gentle against a prior camera already past a limit", () => {
    const limits = cameraPanLimits(1, desktop);
    const prior = {
      zoom: 1,
      offsetX: limits.maxOffsetX + 300,
      offsetY: (limits.minOffsetY + limits.maxOffsetY) / 2,
    };
    // Further out: held where it was, never snapped back.
    expect(
      clampCamera({ ...prior, offsetX: prior.offsetX + 50 }, desktop, prior)
        .offsetX,
    ).toBe(prior.offsetX);
    // Back towards the area: moves freely.
    expect(
      clampCamera({ ...prior, offsetX: prior.offsetX - 50 }, desktop, prior)
        .offsetX,
    ).toBe(prior.offsetX - 50);
    // Without a prior the same camera is clamped outright.
    expect(clampCamera(prior, desktop).offsetX).toBe(limits.maxOffsetX);
  });

  it("keeps the area in view when zooming out about a far corner", () => {
    const limits = cameraPanLimits(MAX_ZOOM, desktop);
    const edge = {
      zoom: MAX_ZOOM,
      offsetX: limits.minOffsetX,
      offsetY: limits.minOffsetY,
    };
    const out = zoomCameraAt(edge, MIN_ZOOM, { x: 0, y: 56 });
    expectKeptInView(clampCamera(out, desktop, edge), desktop);
  });
});
