import { describe, expect, it, vi } from "vitest";
import {
  canonicalHash,
  createReplay,
  viewFor,
  type FactionId,
  type PlayerId,
  type PlayerView,
} from "../../src/engine/index";
import { createSaveEnvelope } from "../../src/persistence/index";
import type {
  BoardAssetBindings,
  DrawAssetOptions,
} from "../../src/render/canvas/asset-bindings";
import { drawBoard } from "../../src/render/canvas/board-renderer";
import { buildRenderPlan } from "../../src/render/canvas/render-plan";
import { createPixelLabAssetBindings } from "../../src/render/canvas/pixellab-asset-bindings";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

describe("Candy territory renderer integration", () => {
  it("uses authoritative explored ownership even when the city center is withheld", () => {
    const base = candyFixtureView();
    const candy = base.players.find((player) => player.faction === "CANDY");
    const tile = base.board.tiles.find((candidate) => candidate.explored);
    if (candy === undefined || tile?.explored !== true)
      throw new Error("Missing Candy territory fixture");
    const hiddenCenterView = replaceTile(base, tile.at, {
      ...tile,
      terrain: "FOREST",
      resource: "ANIMAL",
      improvement: null,
      site: null,
      territoryOwnerId: candy.id,
      territoryCityId: null,
      territoryCenter: null,
    });
    const entries = buildRenderPlan(hiddenCenterView, null).entries.filter(
      (entry) => sameAt(entry.at, tile.at),
    );

    expect(entries.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(["GROUND", "OWNERSHIP", "ANIMAL", "FOREST"]),
    );
    for (const entry of entries.filter(({ kind }) =>
      ["GROUND", "OWNERSHIP", "ANIMAL", "FOREST"].includes(kind),
    ))
      expect(entry.ownerId, entry.kind).toBe(candy.id);
  });

  it("withholds every owner/faction art entry for fog and diplomatic-only tiles", () => {
    const base = candyFixtureView();
    const tile = base.board.tiles.find((candidate) => candidate.explored);
    if (tile === undefined) throw new Error("Missing fog fixture");
    for (const hiddenTile of [
      { at: tile.at, explored: false as const },
      {
        at: tile.at,
        explored: false as const,
        diplomaticBlock: "ALLIED_TERRITORY" as const,
      },
    ]) {
      const hidden = replaceTile(base, tile.at, hiddenTile);
      expect(
        buildRenderPlan(hidden, null).entries.filter((entry) =>
          sameAt(entry.at, tile.at),
        ),
      ).toEqual([
        {
          kind: "FOG",
          at: tile.at,
          id: tile.at.y * 1024 + tile.at.x,
          ownerId: null,
          variant: expect.any(Number),
        },
      ]);
    }
  });

  it("switches every in-scope family from resulting PlayerViews and reverts on Original recapture", () => {
    const base = candyFixtureView();
    const original = base.players.find(
      (player) => player.faction === "ORIGINAL",
    );
    const candy = base.players.find((player) => player.faction === "CANDY");
    const explored = base.board.tiles.filter(
      (tile): tile is Extract<typeof tile, { readonly explored: true }> =>
        tile.explored,
    );
    const [grass, mountain, forest] = explored;
    const city = base.cities[0];
    if (
      original === undefined ||
      candy === undefined ||
      grass === undefined ||
      mountain === undefined ||
      forest === undefined ||
      city === undefined
    )
      throw new Error("Missing mixed territory fixture");
    const tiles = [
      {
        ...grass,
        terrain: "GRASS" as const,
        resource: "FRUIT" as const,
        improvement: null,
        site: null,
      },
      {
        ...mountain,
        terrain: "MOUNTAIN" as const,
        resource: "ORE" as const,
        improvement: null,
        site: null,
      },
      {
        ...forest,
        terrain: "FOREST" as const,
        resource: "ANIMAL" as const,
        improvement: null,
        site: null,
      },
    ];
    const ownershipView = (ownerId: PlayerId): PlayerView => ({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          const replacement = tiles.find((candidate) =>
            sameAt(candidate.at, tile.at),
          );
          if (replacement !== undefined)
            return { ...replacement, territoryOwnerId: ownerId };
          return sameAt(tile.at, city.at) && tile.explored
            ? { ...tile, territoryOwnerId: ownerId }
            : tile;
        }),
      },
      cities: [{ ...city, ownerId }],
    });
    const neutralView: PlayerView = {
      ...ownershipView(original.id),
      board: {
        ...base.board,
        tiles: ownershipView(original.id).board.tiles.map((tile) =>
          tiles.some((candidate) => sameAt(candidate.at, tile.at)) &&
          tile.explored
            ? { ...tile, territoryOwnerId: null }
            : tile,
        ),
      },
    };

    const neutral = inScopeFactions(
      neutralView,
      tiles.map(({ at }) => at),
    );
    expect(neutral).toHaveLength(7);
    expect(new Set(neutral)).toEqual(new Set(["ORIGINAL"]));
    const candyCapture = ownershipView(candy.id);
    const candyCandify = ownershipView(candy.id);
    const originalRecapture = ownershipView(original.id);
    for (const candyResult of [candyCapture, candyCandify]) {
      const observed = inScopeFactions(
        candyResult,
        tiles.map(({ at }) => at),
      );
      expect(observed).toHaveLength(7);
      expect(new Set(observed)).toEqual(new Set(["CANDY"]));
    }
    const capturedWithCity = inScopeFactions(
      candyCapture,
      [...tiles.map(({ at }) => at), city.at],
      true,
    );
    expect(capturedWithCity).toHaveLength(10);
    expect(new Set(capturedWithCity)).toEqual(new Set(["CANDY"]));
    const recaptured = inScopeFactions(
      originalRecapture,
      [...tiles.map(({ at }) => at), city.at],
      true,
    );
    expect(recaptured).toHaveLength(10);
    expect(new Set(recaptured)).toEqual(new Set(["ORIGINAL"]));

    const before = buildRenderPlan(originalRecapture, null).entries.map(
      ({ kind, at, id, variant }) => ({ kind, at, id, variant }),
    );
    const after = buildRenderPlan(candyCapture, null).entries.map(
      ({ kind, at, id, variant }) => ({ kind, at, id, variant }),
    );
    expect(after).toEqual(before);
  });

  it("maps Candy city levels 1/2/3+ while leaving Ore, improvements, villages, walls, and units unchanged", () => {
    const { bindings, images } = loadingBindings();
    const options = drawOptions(2);
    const base = candyFixtureView();
    const city = base.cities[0];
    const unit = base.units[0];
    if (city === undefined || unit === undefined)
      throw new Error("Missing out-of-scope fixture");

    for (const level of [1, 2, 3, 99])
      bindings.drawCityBack(
        drawingContext(),
        options,
        { ...city, level },
        "CANDY",
      );
    bindings.drawOre(drawingContext(), options);
    bindings.drawMine(drawingContext(), options);
    bindings.drawLumberMill(drawingContext(), options);
    bindings.drawVillage(drawingContext(), options);
    bindings.drawChocolateWall(drawingContext(), options);
    bindings.drawUnit(drawingContext(), options, unit, "ORIGINAL");

    expect(images.map(({ src }) => src)).toEqual(
      expect.arrayContaining([
        "/assets/pixellab/buildings/candy-city-1.png",
        "/assets/pixellab/buildings/candy-city-2.png",
        "/assets/pixellab/buildings/candy-city-3.png",
        "/assets/pixellab/terrain/ore.png",
        "/assets/pixellab/buildings/mine.png",
        "/assets/pixellab/buildings/lumber-mill.png",
        "/assets/pixellab/buildings/village.png",
        "/assets/pixellab/buildings/chocolate-wall.png",
        "/assets/pixellab/units/warrior.png",
      ]),
    );
    expect(images.map(({ src }) => src)).not.toEqual(
      expect.arrayContaining([
        "/assets/pixellab/terrain/candy-ore.png",
        "/assets/pixellab/buildings/candy-village.png",
      ]),
    );
  });

  it("selects deterministic Candy family variants without changing variant inputs", () => {
    const { bindings, images } = loadingBindings();
    bindings.drawGrass(drawingContext(), drawOptions(3), "CANDY");
    bindings.drawMountain(drawingContext(), drawOptions(5), "CANDY");
    bindings.drawForest(drawingContext(), drawOptions(6), "CANDY");
    bindings.drawFruit(drawingContext(), drawOptions(2), "CANDY");
    bindings.drawAnimal(drawingContext(), drawOptions(1), "CANDY");

    expect(images.map(({ src }) => src)).toEqual([
      "/assets/pixellab/terrain/candy-grass-4.png",
      "/assets/pixellab/terrain/grass-4.png",
      "/assets/pixellab/terrain/candy-mountain-3.png",
      "/assets/pixellab/terrain/mountain-3.png",
      "/assets/pixellab/terrain/candy-forest-3.png",
      "/assets/pixellab/terrain/forest-3.png",
      "/assets/pixellab/terrain/candy-fruit.png",
      "/assets/pixellab/terrain/fruit.png",
      "/assets/pixellab/terrain/candy-animal.png",
      "/assets/pixellab/terrain/animal.png",
    ]);
  });

  it("keeps normal accepted art during Candy loading/error, then prefers ready Candy art", () => {
    const { bindings, images, redraw } = loadingBindings();
    const context = drawingContext();
    const options = drawOptions(0);

    bindings.drawGrass(context, options, "CANDY");
    expect(images.map(({ src }) => src)).toEqual([
      "/assets/pixellab/terrain/candy-grass-1.png",
      "/assets/pixellab/terrain/grass-1.png",
    ]);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();

    images[1]?.listeners.get("load")?.();
    vi.mocked(context.drawImage).mockClear();
    bindings.drawGrass(context, options, "CANDY");
    expect(context.drawImage).toHaveBeenCalledWith(
      images[1],
      336,
      263,
      128,
      74,
    );

    images[0]?.listeners.get("error")?.();
    vi.mocked(context.drawImage).mockClear();
    bindings.drawGrass(context, options, "CANDY");
    expect(context.drawImage).toHaveBeenCalledWith(
      images[1],
      336,
      263,
      128,
      74,
    );
    expect(redraw).toHaveBeenCalledTimes(2);

    const ready = loadingBindings();
    ready.bindings.drawGrass(ready.context, options, "CANDY");
    ready.images[0]?.listeners.get("load")?.();
    vi.mocked(ready.context.drawImage).mockClear();
    ready.bindings.drawGrass(ready.context, options, "CANDY");
    expect(ready.context.drawImage).toHaveBeenCalledWith(
      ready.images[0],
      336,
      263,
      128,
      74,
    );
  });

  it("keeps Candy city back/front layering and owner stripe through normal fallback", () => {
    const { bindings, images, context, redraw } = loadingBindings();
    const city = candyFixtureView().cities[0];
    if (city === undefined)
      throw new Error("Missing Candy city fallback fixture");
    const options = drawOptions(0);

    bindings.drawCityBack(context, options, { ...city, level: 2 }, "CANDY");
    bindings.drawCityFront(context, options, { ...city, level: 2 }, "CANDY");
    expect(images.map(({ src }) => src)).toEqual([
      "/assets/pixellab/buildings/candy-city-2.png",
      "/assets/pixellab/buildings/city-2.png",
    ]);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();

    images[1]?.listeners.get("load")?.();
    images[0]?.listeners.get("error")?.();
    vi.mocked(context.drawImage).mockClear();
    vi.mocked(context.fill).mockClear();
    vi.mocked(context.fillRect).mockClear();
    bindings.drawCityBack(context, options, { ...city, level: 2 }, "CANDY");
    bindings.drawCityFront(context, options, { ...city, level: 2 }, "CANDY");

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(
      images[1],
      342.4,
      227.10000000000002,
      115.19999999999999,
      115.19999999999999,
    );
    expect(context.fill).toHaveBeenCalledOnce();
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(redraw).toHaveBeenCalledTimes(2);
  });

  it("does not mutate authoritative hashes, saves, replays, geometry, sorting, or picking inputs", () => {
    const state = gameStateBuilder(
      setupBuilder({ factions: ["ORIGINAL", "CANDY"] }),
    );
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human fixture");
    const view = viewFor(state, human.id);
    const replay = createReplay(state.setup);
    const saveInput = {
      state,
      replay,
      tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
      playerTallies: state.players.map((player) => ({
        playerId: player.id,
        kills: 0,
        losses: 0,
        citiesCaptured: 0,
      })),
    };
    const hash = canonicalHash(state);
    const stateJson = JSON.stringify(state);
    const replayJson = JSON.stringify(replay);
    const saveJson = JSON.stringify(
      createSaveEnvelope(saveInput, "2026-08-17T12:00:00.000Z"),
    );
    const plan = buildRenderPlan(view, null);
    const planJson = JSON.stringify(plan);

    drawBoard({
      context: drawingContext(),
      viewport: { width: 390, height: 844 },
      camera: { offsetX: 80, offsetY: 120, zoom: 0.75 },
      view,
      plan,
      assets: noopAssets(),
      focused: null,
      devicePixelRatio: 2,
      combatPresentation: null,
      combatFrame: null,
      readinessElapsedMs: 0,
      reducedMotion: true,
    });

    expect(canonicalHash(state)).toBe(hash);
    expect(JSON.stringify(state)).toBe(stateJson);
    expect(JSON.stringify(replay)).toBe(replayJson);
    expect(
      JSON.stringify(createSaveEnvelope(saveInput, "2026-08-17T12:00:00.000Z")),
    ).toBe(saveJson);
    expect(JSON.stringify(plan)).toBe(planJson);
  });
});

function candyFixtureView(): PlayerView {
  const state = gameStateBuilder(
    setupBuilder({ factions: ["ORIGINAL", "CANDY"] }),
  );
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) throw new Error("Missing human fixture");
  return viewFor(state, human.id);
}

function replaceTile(
  view: PlayerView,
  at: { readonly x: number; readonly y: number },
  replacement: PlayerView["board"]["tiles"][number],
): PlayerView {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        sameAt(tile.at, at) ? replacement : tile,
      ),
    },
  };
}

function inScopeFactions(
  view: PlayerView,
  coordinates: readonly { readonly x: number; readonly y: number }[],
  includeCity = false,
): readonly FactionId[] {
  const observed: FactionId[] = [];
  const assets = noopAssets({
    drawGrass(_context, _options, faction = "ORIGINAL"): void {
      observed.push(faction);
    },
    drawMountain(_context, _options, faction = "ORIGINAL"): void {
      observed.push(faction);
    },
    drawFruit(_context, _options, faction = "ORIGINAL"): void {
      observed.push(faction);
    },
    drawAnimal(_context, _options, faction = "ORIGINAL"): void {
      observed.push(faction);
    },
    drawForest(_context, _options, faction = "ORIGINAL"): void {
      observed.push(faction);
    },
    drawCityBack(_context, _options, _city, faction = "ORIGINAL"): void {
      if (includeCity) observed.push(faction);
    },
    drawCityFront(_context, _options, _city, faction = "ORIGINAL"): void {
      if (includeCity) observed.push(faction);
    },
  });
  const plan = buildRenderPlan(view, null);
  drawBoard({
    context: drawingContext(),
    viewport: { width: 1024, height: 592 },
    camera: { offsetX: 0, offsetY: 0, zoom: 1 },
    view,
    plan: {
      ...plan,
      entries: plan.entries.filter((entry) =>
        coordinates.some((at) => sameAt(entry.at, at)),
      ),
    },
    assets,
    focused: null,
    devicePixelRatio: 1,
    combatPresentation: null,
    combatFrame: null,
    readinessElapsedMs: 0,
    reducedMotion: true,
  });
  return observed;
}

function noopAssets(
  overrides: Partial<BoardAssetBindings> = {},
): BoardAssetBindings {
  return {
    drawGrass(): void {},
    drawMountain(): void {},
    drawOre(): void {},
    drawFruit(): void {},
    drawAnimal(): void {},
    drawMine(): void {},
    drawLumberMill(): void {},
    drawChocolateWall(): void {},
    drawForest(): void {},
    drawVillage(): void {},
    drawCityBack(): void {},
    drawCityFront(): void {},
    drawUnit(): void {},
    drawUnitOwnerCue(): void {},
    ...overrides,
  };
}

function loadingBindings(): {
  readonly bindings: BoardAssetBindings;
  readonly images: Array<
    HTMLImageElement & { readonly listeners: Map<string, () => void> }
  >;
  readonly redraw: ReturnType<typeof vi.fn>;
  readonly context: CanvasRenderingContext2D;
} {
  const images: Array<
    HTMLImageElement & { readonly listeners: Map<string, () => void> }
  > = [];
  const documentRoot = {
    createElement(): HTMLImageElement {
      const listeners = new Map<string, () => void>();
      const image = {
        addEventListener(type: string, listener: () => void): void {
          listeners.set(type, listener);
        },
        listeners,
        alt: "",
        decoding: "auto",
        src: "",
      } as HTMLImageElement & { readonly listeners: Map<string, () => void> };
      images.push(image);
      return image;
    },
  } as unknown as Document;
  const redraw = vi.fn();
  const context = drawingContext();
  return {
    bindings: createPixelLabAssetBindings(documentRoot, redraw),
    images,
    redraw,
    context,
  };
}

function drawOptions(variant: number): DrawAssetOptions {
  return {
    center: { x: 400, y: 300 },
    zoom: 1,
    ownerColor: "#f06762",
    variant,
  };
}

function drawingContext(): CanvasRenderingContext2D {
  const target: Record<PropertyKey, unknown> = {
    globalAlpha: 1,
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
  };
  return new Proxy(target, {
    get(current, property): unknown {
      if (property in current) return current[property];
      if (property === "measureText") return () => ({ width: 20 });
      return vi.fn();
    },
    set(current, property, value): boolean {
      current[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function sameAt(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
