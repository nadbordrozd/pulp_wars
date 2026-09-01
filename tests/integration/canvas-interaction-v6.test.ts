// @vitest-environment jsdom

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  canonicalHash,
  createPlayableGameV6,
  previewEconomicV6,
  queryPlayerCommandsV6,
  unitId,
  viewForV6,
  wallId,
  type CommandV6,
  type CoordV6,
  type GameStateV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import {
  CanvasBoardHostV6,
  boardReadinessAnimationNeededV6,
  commandCandidatesAtV6,
  resolveInspectionActivationV6,
  type CanvasBoardHostCallbacksV6,
  type CanvasBoardHostModelV6,
} from "../../src/render/canvas/board-host-v6";
import { UNIT_SCALE_CONTRACT } from "../../src/render/canvas/board-art-geometry";
import {
  buildRenderPlanV6,
  type EconomicCommandV6,
} from "../../src/render/canvas/render-plan-v6";

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("ruleset-6 Canvas host", () => {
  it("bounds readiness redraws and cancels immediately at every lifecycle gate", () => {
    let now = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    const request = vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame;
      nextFrame += 1;
      frames.set(id, callback);
      return id;
    });
    const cancel = vi.fn((id: number) => {
      frames.delete(id);
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: request,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: cancel,
    });
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
      recordingContext([]),
    );

    const fixture = publicFixture();
    const ready = ownUnit(fixture.view);
    const active = model(fixture.view, {
      motion: "FULL",
      interaction: {
        ...model(fixture.view).interaction,
        readyUnitIds: [ready.id],
      },
    });
    expect(boardReadinessAnimationNeededV6(active)).toBe(true);
    const hash = canonicalHash(fixture.state);
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(900, 600);
    host.mount(container, callbacks());
    host.update(active);
    expect(frames.size).toBe(1);

    const first = [...frames.entries()][0];
    if (first === undefined) throw new Error("Missing readiness frame");
    frames.delete(first[0]);
    now = 800;
    first[1](now);
    expect(frames.size).toBe(1);
    expect(canonicalHash(fixture.state)).toBe(hash);

    host.update({
      ...active,
      interaction: { ...active.interaction, readyUnitIds: [] },
    });
    expect(frames.size).toBe(0);
    host.update(active);
    expect(frames.size).toBe(1);

    host.update({
      ...active,
      view: { ...fixture.view, activeSeatIndex: 1 },
    });
    expect(frames.size).toBe(0);
    host.update(active);
    expect(frames.size).toBe(1);
    host.update({ ...active, interactive: false });
    expect(frames.size).toBe(0);
    host.update({ ...active, motion: "REDUCED" });
    expect(frames.size).toBe(0);
    expect(request).toHaveBeenCalledTimes(4);
    expect(cancel).toHaveBeenCalledTimes(3);

    host.update(active);
    expect(frames.size).toBe(1);
    host.mount(container, callbacks());
    expect(frames.size).toBe(0);
    host.update(active);
    expect(frames.size).toBe(1);
    host.unmount();
    expect(frames.size).toBe(0);
    host.mount(container, callbacks());
    host.update(active);
    expect(frames.size).toBe(1);
    host.destroy();
    expect(frames.size).toBe(0);
  });

  it("never schedules readiness for hidden, rival, inactive, blocked, or reduced-motion models", () => {
    const fixture = publicFixture();
    const own = ownUnit(fixture.view);
    const rivalPlayer = fixture.view.players.find(
      (player) => player.id !== fixture.view.viewer.id,
    );
    const hiddenTile = fixture.view.board.tiles.find((tile) => !tile.explored);
    if (rivalPlayer === undefined || hiddenTile === undefined)
      throw new Error("Missing rival player or hidden tile");
    const rival = {
      ...own,
      id: unitId(own.id + 10_000),
      ownerId: rivalPlayer.id,
      at: { x: own.at.x + 1, y: own.at.y },
    };
    const hidden = {
      ...own,
      id: unitId(own.id + 20_000),
      at: hiddenTile.at,
    };
    const testView = {
      ...fixture.view,
      units: [...fixture.view.units, rival, hidden],
    };
    const base = model(testView, { motion: "FULL" });
    expect(
      boardReadinessAnimationNeededV6({
        ...base,
        interaction: { ...base.interaction, readyUnitIds: [rival.id] },
      }),
    ).toBe(false);
    expect(
      boardReadinessAnimationNeededV6({
        ...base,
        interaction: { ...base.interaction, readyUnitIds: [hidden.id] },
      }),
    ).toBe(false);
    expect(
      boardReadinessAnimationNeededV6({
        ...base,
        view: { ...testView, activeSeatIndex: 1 },
        interaction: { ...base.interaction, readyUnitIds: [own.id] },
      }),
    ).toBe(false);
    expect(
      boardReadinessAnimationNeededV6({
        ...base,
        interactive: false,
        interaction: { ...base.interaction, readyUnitIds: [own.id] },
      }),
    ).toBe(false);
    expect(
      boardReadinessAnimationNeededV6({
        ...base,
        motion: "REDUCED",
        interaction: { ...base.interaction, readyUnitIds: [own.id] },
      }),
    ).toBe(false);
  });

  it("is a separate PlayerViewV6-only accessible mount/update/destroy boundary with DPR backing", () => {
    expectTypeOf<
      CanvasBoardHostModelV6["view"]
    >().toEqualTypeOf<PlayerViewV6>();
    expectTypeOf<GameStateV6>().not.toMatchTypeOf<
      CanvasBoardHostModelV6["view"]
    >();
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(800, 520);
    host.mount(container, callbacks());
    host.update(model(publicFixture().view));

    const canvas = requireCanvas(container);
    const activator = requireActivator(container);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(520);
    expect(canvas.style.width).toBe("800px");
    expect(canvas.style.height).toBe("520px");
    expect(canvas.getAttribute("role")).toBe("application");
    expect(canvas.getAttribute("aria-describedby")).toBe(
      activator.getAttribute("aria-describedby"),
    );
    expect(activator.type).toBe("button");
    expect(container.textContent).toContain("Map cursor");

    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    host.update(model(publicFixture().view));
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1040);

    host.destroy();
    expect(container.children).toHaveLength(0);
    expect(host.screenPoint({ x: 0, y: 0 })).toBeNull();
  });

  it("fits responsively, preserves camera on remount/resize, and resets it for a replacement match", () => {
    const fixture = publicFixture();
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(1280, 720);
    const cb = callbacks();
    host.mount(container, cb);
    host.update(model(fixture.view));
    const capital = ownCapital(fixture.view).at;
    const initial = requirePoint(host.screenPoint(capital));
    expect(initial.x).toBeGreaterThan(0);
    expect(initial.x).toBeLessThan(1280);
    expect(initial.y).toBeGreaterThan(0);
    expect(initial.y).toBeLessThan(720);

    pointer(requireCanvas(container), "pointerdown", 1, 500, 300, "mouse");
    pointer(requireCanvas(container), "pointermove", 1, 550, 330, "mouse");
    pointer(requireCanvas(container), "pointerup", 1, 550, 330, "mouse");
    const panned = requirePoint(host.screenPoint(capital));
    expect(panned.x - initial.x).toBeCloseTo(50);
    expect(panned.y - initial.y).toBeCloseTo(30);

    host.mount(container, cb);
    host.update(model(fixture.view));
    expect(host.screenPoint(capital)).toEqual(panned);

    setContainerSize(container, 900, 600);
    window.dispatchEvent(new Event("resize"));
    const resized = requirePoint(host.screenPoint(capital));
    expect(resized.x - panned.x).toBeCloseTo((900 - 1280) / 2);
    expect(resized.y - panned.y).toBeCloseTo((600 - 720) / 2);

    host.update(model(fixture.view, { matchInstanceId: "replacement" }));
    const reset = requirePoint(host.screenPoint(capital));
    expect(reset).not.toEqual(resized);
    expect(reset.x).toBeGreaterThan(0);
    expect(reset.x).toBeLessThan(900);
    expect(reset.y).toBeGreaterThan(0);
    expect(reset.y).toBeLessThan(600);
  });

  it("pans only past the drag threshold, supports touch pinch, and clamps wheel/button zoom", () => {
    const fixture = publicFixture();
    const selections: unknown[] = [];
    const zooms: string[] = [];
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(1024, 592);
    host.mount(
      container,
      callbacks({
        onSelection: (selection) => selections.push(selection),
        onZoom: (direction) => zooms.push(direction),
      }),
    );
    host.update(model(fixture.view));
    const unit = ownUnit(fixture.view);
    const canvas = requireCanvas(container);
    const unitPoint = requirePoint(host.screenPoint(unit.at));

    pointer(canvas, "pointerdown", 1, unitPoint.x, unitPoint.y, "touch");
    pointer(canvas, "pointerup", 1, unitPoint.x, unitPoint.y, "touch");
    expect(selections).toEqual([{ kind: "UNIT", unitId: unit.id }]);

    pointer(canvas, "pointerdown", 2, unitPoint.x, unitPoint.y, "mouse");
    pointer(
      canvas,
      "pointermove",
      2,
      unitPoint.x + 40,
      unitPoint.y + 15,
      "mouse",
    );
    pointer(
      canvas,
      "pointerup",
      2,
      unitPoint.x + 40,
      unitPoint.y + 15,
      "mouse",
    );
    expect(selections).toHaveLength(1);

    pointer(canvas, "pointerdown", 10, 300, 220, "touch");
    pointer(canvas, "pointerdown", 11, 500, 220, "touch");
    pointer(canvas, "pointermove", 11, 560, 220, "touch");
    pointer(canvas, "pointerup", 11, 560, 220, "touch");
    pointer(canvas, "pointerup", 10, 300, 220, "touch");
    expect(zooms).toContain("IN");
    expect(selections).toHaveLength(1);

    for (let index = 0; index < 40; index += 1) host.zoom("IN");
    expect(measuredZoom(host)).toBeCloseTo(1.75);
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -100,
        clientX: 400,
        clientY: 250,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(measuredZoom(host)).toBeCloseTo(1.75);
    for (let index = 0; index < 60; index += 1) host.zoom("OUT");
    expect(measuredZoom(host)).toBeCloseTo(0.625);
  });

  it("moves the logical cursor by keyboard, activates through keyboard and semantic DOM, and cancels with Escape", () => {
    const fixture = publicFixture();
    const selected: unknown[] = [];
    let cancelled = 0;
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(900, 600);
    host.mount(
      container,
      callbacks({
        onSelection: (selection) => selected.push(selection),
        onCancel: () => {
          cancelled += 1;
        },
      }),
    );
    host.update(model(fixture.view));
    const canvas = requireCanvas(container);
    const capital = ownCapital(fixture.view);
    key(canvas, "ArrowRight");
    key(canvas, "Enter");
    expect(selected.at(-1)).toEqual({
      kind: "TILE",
      at: { x: capital.at.x + 1, y: capital.at.y },
    });
    key(canvas, "Escape");
    expect(selected.at(-1)).toBeNull();

    key(canvas, "ArrowLeft");
    requireActivator(container).click();
    expect(selected.at(-1)).toEqual({
      kind: "UNIT",
      unitId: ownUnit(fixture.view).id,
    });

    host.update(
      model(fixture.view, {
        interaction: {
          selection: { kind: "UNIT", unitId: ownUnit(fixture.view).id },
          activeTarget: null,
          targetMode: {
            kind: "KAMIKAZE_ROLL",
            unitId: ownUnit(fixture.view).id,
          },
          economicPreview: null,
          readyUnitIds: [],
        },
      }),
    );
    key(canvas, "Escape");
    expect(cancelled).toBe(1);
  });

  it("cycles visible unit/city/tile and Wall/tile stacks while fog remains content-free", () => {
    const fixture = publicFixture();
    const unit = ownUnit(fixture.view);
    const city = ownCapital(fixture.view);
    expect(unit.at).toEqual(city.at);
    const first = resolveInspectionActivationV6(fixture.view, unit.at, null);
    expect(first.selection).toEqual({ kind: "UNIT", unitId: unit.id });
    const second = resolveInspectionActivationV6(
      fixture.view,
      unit.at,
      first.cycle,
    );
    expect(second.selection).toEqual({ kind: "CITY", cityId: city.id });
    expect(
      resolveInspectionActivationV6(fixture.view, unit.at, second.cycle)
        .selection,
    ).toEqual({ kind: "UNIT", unitId: unit.id });

    const plain = fixture.view.board.tiles.find(
      (tile) =>
        tile.explored &&
        !fixture.view.units.some((candidate) => same(candidate.at, tile.at)) &&
        !fixture.view.cities.some((candidate) => same(candidate.at, tile.at)),
    );
    if (plain === undefined) throw new Error("Missing plain tile");
    const wallView: PlayerViewV6 = {
      ...fixture.view,
      chocolateWalls: [
        {
          id: wallId(900),
          ownerId: fixture.view.viewer.id,
          at: plain.at,
          hp: 7,
        },
      ],
    };
    const wallFirst = resolveInspectionActivationV6(wallView, plain.at, null);
    expect(wallFirst.selection).toEqual({ kind: "WALL", wallId: wallId(900) });
    expect(
      resolveInspectionActivationV6(wallView, plain.at, wallFirst.cycle)
        .selection,
    ).toEqual({ kind: "TILE", at: plain.at });

    const hidden = fixture.view.board.tiles.find((tile) => !tile.explored);
    if (hidden === undefined) throw new Error("Missing hidden tile");
    const poisoned: PlayerViewV6 = {
      ...fixture.view,
      units: fixture.view.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, at: hidden.at } : candidate,
      ),
    };
    expect(resolveInspectionActivationV6(poisoned, hidden.at, null)).toEqual({
      selection: { kind: "TILE", at: hidden.at },
      cycle: null,
    });
  });

  it("returns exact stable single and ambiguous plan candidates and never guesses or commands while view-only", () => {
    const fixture = publicFixture();
    const unit = ownUnit(fixture.view);
    const selected = { kind: "UNIT", unitId: unit.id } as const;
    const interaction = {
      selection: selected,
      activeTarget: null,
      targetMode: null,
      economicPreview: null,
      readyUnitIds: [],
    } as const;
    const freshPlan = buildRenderPlanV6(fixture.view, interaction);
    const single = commandCandidatesAtV6(freshPlan, unit.at);
    expect(single.map((candidate) => candidate.command.kind)).toEqual(["WAIT"]);
    expect(Object.isFrozen(single)).toBe(true);

    const damagedView: PlayerViewV6 = {
      ...fixture.view,
      units: fixture.view.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, hp: Math.max(1, candidate.maxHp - 3) }
          : candidate,
      ),
    };
    const ambiguous = commandCandidatesAtV6(
      buildRenderPlanV6(damagedView, interaction),
      unit.at,
    );
    expect(ambiguous.map((candidate) => candidate.command.kind)).toEqual([
      "RECOVER",
      "WAIT",
    ]);
    expect(ambiguous.map((candidate) => candidate.command)).toEqual(
      queryPlayerCommandsV6(damagedView).filter(
        (command) => command.kind === "RECOVER" || command.kind === "WAIT",
      ),
    );

    const economic = queryPlayerCommandsV6(fixture.view).find(
      (command): command is EconomicCommandV6 =>
        command.kind === "HARVEST_FRUIT",
    );
    if (economic === undefined) throw new Error("Missing Fruit action");
    const directEconomyPlan = buildRenderPlanV6(fixture.view, {
      ...interaction,
      selection: { kind: "TILE", at: economic.at },
    });
    expect(commandCandidatesAtV6(directEconomyPlan, economic.at)).toEqual([]);

    const emitted: CommandV6[][] = [];
    const inspected: unknown[] = [];
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(900, 600);
    host.mount(
      container,
      callbacks({
        onCommandCandidates: (candidates) =>
          emitted.push(candidates.map((candidate) => candidate.command)),
        onSelection: (selection) => inspected.push(selection),
      }),
    );
    host.update(model(fixture.view, { interaction }));
    host.activate(unit.at);
    expect(emitted).toEqual([[single[0]?.command]]);

    host.update(model(damagedView, { interaction }));
    host.activate(unit.at);
    expect(emitted).toEqual([
      [single[0]?.command],
      ambiguous.map((candidate) => candidate.command),
    ]);
    expect(inspected).toEqual([]);

    host.update(model(damagedView, { interactive: false, interaction }));
    host.activate(unit.at);
    expect(emitted).toHaveLength(2);
    expect(inspected).toEqual([{ kind: "UNIT", unitId: unit.id }]);
    expect(requireCanvas(container).getAttribute("aria-disabled")).toBe("true");
  });

  it("redraws exact economic preview state and lazy accepted-image completion without mutating a state/hash", () => {
    const fixture = publicFixture();
    const before = canonicalHash(fixture.state);
    const calls: string[] = [];
    const context = recordingContext(calls);
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
    const images: HTMLImageElement[] = [];
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((
      name: string,
      options?: ElementCreationOptions,
    ) => {
      const element = originalCreate(name, options);
      if (name.toLowerCase() === "img")
        images.push(element as HTMLImageElement);
      return element;
    }) as typeof document.createElement);

    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(900, 600);
    host.mount(container, callbacks());
    host.update(model(fixture.view));
    const initialClears = calls.filter((call) => call === "clearRect").length;
    expect(images.length).toBeGreaterThan(0);

    const economic = queryPlayerCommandsV6(fixture.view).find(
      (command): command is EconomicCommandV6 =>
        command.kind === "HARVEST_FRUIT",
    );
    if (economic === undefined) throw new Error("Missing Fruit action");
    const preview = previewEconomicV6(fixture.view, economic);
    expect(preview.ok).toBe(true);
    host.update(
      model(fixture.view, {
        interaction: {
          selection: { kind: "TILE", at: economic.at },
          activeTarget: economic.at,
          targetMode: null,
          economicPreview: { command: economic, result: preview },
          readyUnitIds: [],
        },
      }),
    );
    expect(calls.filter((call) => call === "clearRect").length).toBeGreaterThan(
      initialClears,
    );
    const beforeLoad = calls.filter((call) => call === "clearRect").length;
    images[0]?.dispatchEvent(new Event("load"));
    expect(calls.filter((call) => call === "clearRect").length).toBeGreaterThan(
      beforeLoad,
    );
    host.zoom("IN");
    const hidden = fixture.view.board.tiles.find((tile) => !tile.explored);
    if (hidden === undefined) throw new Error("Missing hidden tile");
    host.activate(hidden.at);
    expect(canonicalHash(fixture.state)).toBe(before);
  });

  it("keeps inspection across harmless remount, then resets on command, disappearance and match replacement", () => {
    const fixture = publicFixture();
    const unit = ownUnit(fixture.view);
    const selections: unknown[] = [];
    let currentSelection: CanvasBoardHostModelV6["interaction"]["selection"] =
      null;
    const cb = callbacks({
      onSelection: (selection) => {
        currentSelection = selection;
        selections.push(selection);
      },
    });
    const host = new CanvasBoardHostV6(document);
    const container = sizedContainer(900, 600);
    const update = (
      view = fixture.view,
      matchInstanceId: string | number = 1,
    ) =>
      host.update(
        model(view, {
          matchInstanceId,
          interactive: false,
          interaction: {
            selection: currentSelection,
            activeTarget: null,
            targetMode: null,
            economicPreview: null,
            readyUnitIds: [],
          },
        }),
      );
    host.mount(container, cb);
    update();
    host.activate(unit.at);
    expect(selections.at(-1)).toEqual({ kind: "UNIT", unitId: unit.id });

    host.mount(container, cb);
    update();
    host.activate(unit.at);
    expect(selections.at(-1)).toEqual({
      kind: "CITY",
      cityId: ownCapital(fixture.view).id,
    });

    update({ ...fixture.view, commandIndex: fixture.view.commandIndex + 1 });
    host.activate(unit.at);
    expect(selections.at(-1)).toEqual({ kind: "UNIT", unitId: unit.id });

    update({
      ...fixture.view,
      units: fixture.view.units.filter((candidate) => candidate.id !== unit.id),
    });
    update();
    host.activate(unit.at);
    expect(selections.at(-1)).toEqual({ kind: "UNIT", unitId: unit.id });

    update(fixture.view, 2);
    host.activate(unit.at);
    expect(selections.at(-1)).toEqual({ kind: "UNIT", unitId: unit.id });
  });

  it("retains the calibrated compact unit presentation contract", () => {
    expect(UNIT_SCALE_CONTRACT.standard.displayScale).toBe(0.25);
    expect(UNIT_SCALE_CONTRACT.standard.maximumVisibleWidthRatio).toBeLessThan(
      0.5,
    );
    expect(
      UNIT_SCALE_CONTRACT.standard.maximumRearTileOcclusionRatio,
    ).toBeLessThanOrEqual(0.08);
    expect(UNIT_SCALE_CONTRACT.siege.displayScale).toBe(0.24);
    expect(UNIT_SCALE_CONTRACT.giant.maximumRearTileOcclusionRatio).toBe(0.18);
  });

  it("checks in deterministic desktop, tablet and mobile host evidence with no clipped units", async () => {
    const source = await readFile(
      "art/pixellab/reviews/ruleset6-canvas-host/review-evidence.json",
      "utf8",
    );
    const evidence = JSON.parse(source) as {
      readonly generatedBy: string;
      readonly host: string;
      readonly viewports: readonly {
        readonly viewport: string;
        readonly cssSize: { readonly width: number; readonly height: number };
        readonly dpr: number;
        readonly backingSize: {
          readonly width: number;
          readonly height: number;
        };
        readonly unitBounds: readonly { readonly clipped: boolean }[];
      }[];
      readonly scaleContracts: Readonly<Record<string, number>>;
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.generatedBy).toBe("npm run art:ruleset6-host-review");
    expect(evidence.host).toBe("CanvasBoardHostV6");
    expect(evidence.viewports).toMatchObject([
      {
        viewport: "desktop",
        cssSize: { width: 1280, height: 720 },
        dpr: 1,
        backingSize: { width: 1280, height: 720 },
      },
      {
        viewport: "tablet",
        cssSize: { width: 768, height: 1024 },
        dpr: 2,
        backingSize: { width: 1536, height: 2048 },
      },
      {
        viewport: "mobile",
        cssSize: { width: 390, height: 844 },
        dpr: 2,
        backingSize: { width: 780, height: 1688 },
      },
    ]);
    expect(
      evidence.viewports.every((viewport) =>
        viewport.unitBounds.every((unit) => !unit.clipped),
      ),
    ).toBe(true);
    expect(evidence.scaleContracts).toEqual({
      standard: 0.25,
      breacher: 0.24,
      juggernaut: 0.25,
      standardRearOcclusionMaximum: 0.08,
    });
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.artifacts).toHaveLength(6);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
    }
  });
});

function publicFixture(): {
  readonly state: GameStateV6;
  readonly view: PlayerViewV6;
} {
  const created = createPlayableGameV6({
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 8,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY"],
  });
  if (!created.ok) throw new Error(created.error.code);
  return {
    state: created.state,
    view: viewForV6(created.state, created.state.humanPlayerId),
  };
}

function model(
  view: PlayerViewV6,
  overrides: Partial<CanvasBoardHostModelV6> = {},
): CanvasBoardHostModelV6 {
  return {
    matchInstanceId: 1,
    view,
    interactive: true,
    interaction: {
      selection: null,
      activeTarget: null,
      targetMode: null,
      economicPreview: null,
      readyUnitIds: [],
    },
    ...overrides,
  };
}

function callbacks(
  overrides: Partial<CanvasBoardHostCallbacksV6> = {},
): CanvasBoardHostCallbacksV6 {
  return {
    onSelection(): void {},
    onInspect(): void {},
    onCommandCandidates(): void {},
    onZoom(): void {},
    ...overrides,
  };
}

function sizedContainer(width: number, height: number): HTMLElement {
  const container = document.querySelector<HTMLElement>("#host");
  if (container === null) throw new Error("Missing host");
  setContainerSize(container, width, height);
  return container;
}

function setContainerSize(
  container: HTMLElement,
  width: number,
  height: number,
): void {
  Object.defineProperties(container, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
      }),
    },
  });
}

function requireCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = container.querySelector("canvas");
  if (canvas === null) throw new Error("Missing Canvas");
  return canvas;
}

function requireActivator(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    ".map-cursor-activator",
  );
  if (button === null) throw new Error("Missing semantic activator");
  return button;
}

function ownUnit(view: PlayerViewV6): PlayerViewV6["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  if (unit === undefined) throw new Error("Missing owned unit");
  return unit;
}

function ownCapital(view: PlayerViewV6): PlayerViewV6["cities"][number] {
  const city = view.cities.find(
    (candidate) => candidate.ownerId === view.viewer.id && candidate.isCapital,
  );
  if (city === undefined) throw new Error("Missing capital");
  return city;
}

function key(target: HTMLCanvasElement, value: string, shiftKey = false): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function pointer(
  target: HTMLCanvasElement,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
  pointerType: "mouse" | "touch",
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}

function measuredZoom(host: CanvasBoardHostV6): number {
  const origin = requirePoint(host.screenPoint({ x: 0, y: 0 }));
  const east = requirePoint(host.screenPoint({ x: 1, y: 0 }));
  return Math.abs(east.x - origin.x) / 64;
}

function requirePoint<Value>(value: Value | null): Value {
  if (value === null) throw new Error("Missing point");
  return value;
}

function recordingContext(calls: string[]): CanvasRenderingContext2D {
  const target: Record<PropertyKey, unknown> = { globalAlpha: 1 };
  return new Proxy(target, {
    get(current, property): unknown {
      if (property === "measureText") return () => ({ width: 20 });
      if (property in current) return current[property];
      return (...args: unknown[]): void => {
        void args;
        calls.push(String(property));
      };
    },
    set(current, property, value): boolean {
      current[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
