import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { queryPlayerCommandsV7, viewForV7 } from "../../src/engine/index";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { chibiAnchorV7 } from "../../src/assets/chibi-art-v7";
import type { BoardGlowCacheV7 } from "../../src/render/canvas/glow-cache-v7";
import {
  buildBoardRenderPlanV7,
  CHIBI_OVERLAY_FRAME_V7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  chibiCameraZoom,
  chibiGarrisonDestinationRect,
} from "../../src/render/canvas/chibi-geometry-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";

type LogEntry = readonly unknown[];

/** Records every method call and property write in order. */
function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                log.push([String(key), ...args]);
              },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

const legacyImages = {
  resolve: (assetId: string) =>
    ({ legacy: assetId }) as unknown as CanvasImageSource,
};

function chibiAsset(
  subject: ArtSubjectV7,
  assetClass: ChibiArtAssetV7["assetClass"],
  width: number,
  height: number,
): ChibiArtAssetV7 {
  return {
    id: `fixture-${subject}`,
    subject,
    assetClass,
    width,
    height,
    url: `/fixture/${subject}.png`,
  };
}

function fakeChibi(
  ready: readonly ChibiArtAssetV7[],
  loading: readonly ArtSubjectV7[] = [],
): ChibiBoardArtV7 & { readonly resolve: ReturnType<typeof vi.fn> } {
  return {
    resolve: vi.fn((request): ChibiResolutionV7 => {
      if (loading.includes(request.subject)) return { kind: "LOADING" };
      const asset = ready.find(
        (candidate) => candidate.subject === request.subject,
      );
      return asset === undefined
        ? { kind: "MISSING" }
        : {
            kind: "READY",
            asset,
            image: { chibi: asset.id } as unknown as CanvasImageSource,
            density: 1,
            smoothing: false,
            cacheKey: `chibi:${asset.id}`,
          };
    }),
  };
}

function entry(
  kind: BoardRenderPlanEntryV7["kind"],
  x: number,
  y: number,
  assetId: string,
  artSubject: ArtSubjectV7,
  extra: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanEntryV7 {
  return {
    key: `${kind.toLowerCase()}:${x},${y}`,
    kind,
    layer: kind === "TERRAIN" ? 1 : kind === "UNIT" ? 5 : 4,
    at: { x, y },
    assetId,
    artSubject,
    ...extra,
  };
}

function plan(entries: readonly BoardRenderPlanEntryV7[]): BoardRenderPlanV7 {
  return { version: 7, entries, targets: [] };
}

const images = (log: readonly LogEntry[]) =>
  log.filter((call) => call[0] === "drawImage");

describe("CHIBI board rendering", () => {
  it("adds art subjects to the plan without changing any legacy asset choice", () => {
    const state = exploredAllV7(initialV7(1516));
    const base = viewForV7(state, state.humanPlayerId);
    const owned = base.units.find((unit) => unit.ownerId === base.viewer.id);
    if (owned === undefined) throw new Error("owned unit missing");
    const view = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          !tile.explored
            ? tile
            : tile.at.x === 0 && tile.at.y === 0
              ? {
                  ...tile,
                  terrain: "MOUNTAIN" as const,
                  improvement: "MINE" as const,
                }
              : tile.at.x === 1 && tile.at.y === 0
                ? {
                    ...tile,
                    terrain: "FOREST" as const,
                    improvement: "LUMBER_CAMP" as const,
                    resource: null,
                  }
                : tile.at.x === 2 && tile.at.y === 0
                  ? {
                      ...tile,
                      terrain: "GRASS" as const,
                      resource: "FRUIT" as const,
                      improvement: null,
                    }
                  : tile,
        ),
      },
    };
    const built = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const byKey = (key: string) =>
      built.entries.find((candidate) => candidate.key === key);
    expect(byKey("terrain:0,0")).toMatchObject({
      artSubject: "TERRAIN:MINED_MOUNTAIN",
    });
    expect(byKey("terrain:1,0")).toMatchObject({
      assetId: "terrain-ruleset7-original-grass-1",
      artSubject: "TERRAIN:GRASS",
    });
    expect(byKey("improvement:1,0")).toMatchObject({
      artSubject: "IMPROVEMENT:LUMBER_CAMP",
    });
    expect(byKey("resource:2,0")).toMatchObject({
      artSubject: "RESOURCE:FRUIT",
    });
    expect(byKey(`unit:${owned.id}`)).toMatchObject({
      artSubject: `UNIT:${owned.role}`,
      // The Human seat's faction colour (bead pulp_wars-b5f.4).
      ownerColor: FACTION_COLOURS_V7.ORIGINAL,
    });
    const city = view.cities[0];
    if (city === undefined) throw new Error("city missing");
    expect(byKey(`city:${city.id}`)?.artSubject).toMatch(/^CITY:[123]$/);
  });

  it("leaves LEGACY drawing identical and draws unregistered CHIBI subjects with their legacy asset", () => {
    const state = exploredAllV7(initialV7(1516));
    const view = viewForV7(state, state.humanPlayerId);
    const built = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const draw = (
      camera: { offsetX: number; offsetY: number; zoom: number },
      extra: Partial<Parameters<typeof drawBoardV7>[0]> = {},
    ) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 1200, height: 900 },
        devicePixelRatio: 1,
        camera,
        plan: built,
        images: legacyImages,
        ...extra,
      });
      return log;
    };
    const legacyCamera = { offsetX: 60, offsetY: 80, zoom: 1 };
    const baseline = draw(legacyCamera);
    expect(images(baseline).length).toBeGreaterThan(0);
    const unused = fakeChibi([chibiAsset("TERRAIN:GRASS", "TERRAIN", 80, 80)]);
    expect(draw(legacyCamera, { artSet: "LEGACY", chibiArt: unused })).toEqual(
      baseline,
    );
    expect(unused.resolve).not.toHaveBeenCalled();

    const chibiCamera = { offsetX: 60, offsetY: 80, zoom: chibiCameraZoom(1) };
    const fallback = fakeChibi([]);
    expect(draw(chibiCamera, { artSet: "CHIBI", chibiArt: fallback })).toEqual(
      draw(chibiCamera),
    );
    expect(fallback.resolve).toHaveBeenCalled();
    // Legacy art at chibi geometry: the whole cell is 80 CSS px.
    const terrain = images(
      draw(chibiCamera, { artSet: "CHIBI", chibiArt: fallback }),
    ).find(
      (call) =>
        String((call[1] as { legacy?: string }).legacy).includes("grass") &&
        call.length === 6,
    );
    expect(terrain?.slice(4)).toEqual([80, 80]);
  });

  it("draws a registered unit bottom-centred at 1:1 with smoothing off and skips loading subjects", () => {
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    const chibi = fakeChibi([fighter], ["CITY:1"]);
    const { context, log } = recordingContext();
    const camera = { offsetX: 40.2, offsetY: 40, zoom: chibiCameraZoom(1) };
    drawBoardV7({
      context,
      viewport: { width: 800, height: 600 },
      devicePixelRatio: 2,
      camera,
      plan: plan([
        entry("CITY", 0, 0, "building-city-1", "CITY:1", { value: 1 }),
        entry("UNIT", 1, 1, "unit-original-fighter", "UNIT:FIGHTER", {
          ownerColor: RULESET7_PLAYER_COLORS.TEAL,
          ownerSeat: 1,
          hp: 10,
          maxHp: 10,
        }),
      ]),
      images: legacyImages,
      artSet: "CHIBI",
      chibiArt: chibi,
    });
    const drawn = images(log);
    expect(drawn).toHaveLength(1);
    // Offset 40.2 snaps to 40 on DPR 2; cell (1,1) centre is (120, 120).
    expect(drawn[0]).toEqual([
      "drawImage",
      { chibi: fighter.id },
      92,
      80,
      56,
      80,
    ]);
    const drawIndex = log.indexOf(drawn[0] as LogEntry);
    const smoothingWrites = log
      .slice(0, drawIndex)
      .filter(
        (call) => call[0] === "set" && call[1] === "imageSmoothingEnabled",
      );
    expect(smoothingWrites.at(-1)?.[2]).toBe(false);
    expect(chibi.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "UNIT:FIGHTER",
        ownerColor: RULESET7_PLAYER_COLORS.TEAL,
        deviceScale: 2,
      }),
    );
  });

  it("marks a registered CHIBI capital with a crown and leaves LEGACY and fallback cities unmarked", () => {
    const city = chibiAsset("CITY:2", "SETTLEMENT", 96, 100);
    const crownFills = (
      extra: Partial<Parameters<typeof drawBoardV7>[0]>,
      capital: boolean,
    ) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(1) },
        plan: plan([
          entry("CITY", 1, 1, "building-city-2", "CITY:2", {
            value: 2,
            ...(capital ? { capital: true } : {}),
          }),
        ]),
        images: legacyImages,
        ...extra,
      });
      return log.filter(
        (call) =>
          call[0] === "set" && call[1] === "fillStyle" && call[2] === "#f4c542",
      ).length;
    };
    const chibi = fakeChibi([city]);
    expect(crownFills({ artSet: "CHIBI", chibiArt: chibi }, true)).toBe(1);
    expect(crownFills({ artSet: "CHIBI", chibiArt: chibi }, false)).toBe(0);
    expect(crownFills({ artSet: "CHIBI", chibiArt: fakeChibi([]) }, true)).toBe(
      0,
    );
    expect(crownFills({ artSet: "LEGACY", chibiArt: chibi }, true)).toBe(0);
  });

  it("keeps a ready CHIBI unit opaque at its garrison size and frames its overlays outside the figure", () => {
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    const city = chibiAsset("CITY:1", "SETTLEMENT", 88, 96);
    const draw = (chibiArt: ChibiBoardArtV7, step: 0.75 | 1) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(step) },
        plan: plan([
          entry("CITY", 1, 1, "building-city-1", "CITY:1", {
            value: 1,
            population: 1,
            capital: true,
            ownerColor: RULESET7_PLAYER_COLORS.TEAL,
            ownerSeat: 0,
          }),
          entry("UNIT", 1, 1, "unit-original-fighter", "UNIT:FIGHTER", {
            ownerColor: RULESET7_PLAYER_COLORS.TEAL,
            ownerSeat: 0,
            hp: 6,
            maxHp: 10,
            ready: true,
          }),
        ]),
        images: legacyImages,
        artSet: "CHIBI",
        chibiArt,
        // Mid-pulse: the pre-q8b LEGACY pulse was most translucent here.
        readinessElapsedMs: 800,
      });
      return log;
    };
    for (const step of [1, 0.75] as const) {
      const log = draw(fakeChibi([fighter, city]), step);
      const centre = 40 + 128 * chibiCameraZoom(step);
      const unitDraw = images(log).find(
        (call) => (call[1] as { chibi?: string }).chibi === fighter.id,
      );
      // On the capital: 0.75 x master x step, feet on the cell's bottom
      // edge, right edge floored inside the pip column (46 world units).
      const unitRight = centre + 46 * chibiCameraZoom(step);
      const unitLeft = Math.floor(unitRight - 42 * step);
      expect(unitDraw?.slice(2)).toEqual([
        unitLeft,
        centre + 40 * step - 60 * step,
        42 * step,
        60 * step,
      ]);
      const unitIndex = log.indexOf(unitDraw as LogEntry);
      const alphaBefore = log
        .slice(0, unitIndex)
        .filter((call) => call[0] === "set" && call[1] === "globalAlpha");
      expect(alphaBefore.at(-1)?.[2]).toBe(1);
      // Every overlay rect drawn after the unit stays clear of its garrison
      // canvas. The capital crown (now drawn after the pieces) is a path in
      // the top-right corner; only its 1.5-unit band is a rect, skipped here.
      const zoom = chibiCameraZoom(step);
      const overlays = log
        .slice(unitIndex + 1)
        .filter((call) => call[0] === "fillRect" || call[0] === "strokeRect")
        .map((call) => call.slice(1) as number[])
        .filter(([, , , height = 0]) => height !== 1.5 * zoom);
      expect(overlays.length).toBeGreaterThanOrEqual(3);
      for (const [left = 0, , width = 0] of overlays)
        expect(left + width <= unitLeft || left >= unitLeft + 42 * step).toBe(
          true,
        );
    }
    // A legacy-fallback unit in the CHIBI set is opaque and unscaled too
    // (pulp_wars-q8b): the outline alone carries readiness.
    const fallback = draw(fakeChibi([]), 1);
    const legacyUnit = images(fallback).find(
      (call) =>
        (call[1] as { legacy?: string }).legacy === "unit-original-fighter",
    );
    const fallbackIndex = fallback.indexOf(legacyUnit as LogEntry);
    const fallbackAlpha = fallback
      .slice(0, fallbackIndex)
      .filter((call) => call[0] === "set" && call[1] === "globalAlpha");
    expect(fallbackAlpha.at(-1)?.[2]).toBe(1);
  });

  it("draws a CHIBI unit on a city or village centre smaller in the front-right and leaves other units and LEGACY unchanged", () => {
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    const city = chibiAsset("CITY:1", "SETTLEMENT", 88, 96);
    const village = chibiAsset("SITE:VILLAGE", "SETTLEMENT", 80, 88);
    const unit = (x: number, y: number) =>
      entry("UNIT", x, y, "unit-original-fighter", "UNIT:FIGHTER", {
        key: `unit:${x},${y}`,
        ownerColor: RULESET7_PLAYER_COLORS.TEAL,
        ownerSeat: 0,
        hp: 10,
        maxHp: 10,
      });
    const draw = (
      artSet: "CHIBI" | "LEGACY",
      step: 1 | 2,
      devicePixelRatio: number,
    ) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1200 },
        devicePixelRatio,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(step) },
        plan: plan([
          entry("CITY", 1, 1, "building-city-1", "CITY:1", { value: 1 }),
          entry("SITE", 3, 1, "building-village", "SITE:VILLAGE"),
          unit(1, 1),
          unit(3, 1),
          unit(5, 1),
          // Mid-move off the city: a fractional cell is never garrisoned.
          unit(1.5, 1),
        ]),
        images: legacyImages,
        artSet,
        chibiArt: fakeChibi([fighter, city, village]),
      });
      return log;
    };
    const unitDraws = (log: readonly LogEntry[]) =>
      log
        .map((call, index) => ({ call, index }))
        .filter(
          ({ call }) =>
            call[0] === "drawImage" &&
            ((call[1] as { chibi?: string }).chibi === fighter.id ||
              (call[1] as { legacy?: string }).legacy ===
                "unit-original-fighter"),
        );
    const smoothingAt = (log: readonly LogEntry[], index: number) =>
      log
        .slice(0, index)
        .filter(
          (call) => call[0] === "set" && call[1] === "imageSmoothingEnabled",
        )
        .at(-1)?.[2];

    const chibi = draw("CHIBI", 1, 1);
    const [onCity, onVillage, onGrass, moving] = unitDraws(chibi);
    const zoom = chibiCameraZoom(1);
    const cellX = (x: number) => 40 + 128 * x * zoom;
    const cellY = 40 + 128 * zoom;
    for (const [drawn, x] of [
      [onCity, 1],
      [onVillage, 3],
    ] as const) {
      // 42 x 60 CSS px, feet on the cell's bottom edge, right edge at the
      // pip column: the settlement's left side and roofs stay uncovered.
      expect(drawn?.call.slice(2)).toEqual([
        Math.floor(cellX(x) + 46 * zoom - 42),
        cellY + 40 - 60,
        42,
        60,
      ]);
      // 0.75 on a DPR 1 screen is fractional, so the unit is smoothed.
      expect(smoothingAt(chibi, drawn?.index ?? 0)).toBe(true);
    }
    for (const [drawn, x] of [
      [onGrass, 5],
      [moving, 1.5],
    ] as const) {
      expect(drawn?.call.slice(2)).toEqual([cellX(x) - 28, cellY - 40, 56, 80]);
      expect(smoothingAt(chibi, drawn?.index ?? 0)).toBe(false);
    }

    // Zoom 2 on DPR 2: 0.75 x 2 x 2 = 3 whole device pixels per master pixel.
    const crisp = draw("CHIBI", 2, 2);
    const [crispCity] = unitDraws(crisp);
    expect(crispCity?.call.slice(4)).toEqual([84, 120]);
    expect(smoothingAt(crisp, crispCity?.index ?? 0)).toBe(false);

    // LEGACY draws a unit on a city exactly like a unit anywhere else.
    const legacy = unitDraws(draw("LEGACY", 1, 1)).map(({ call }) =>
      call.slice(2),
    );
    const [legacyCity, , legacyGrass] = legacy;
    expect(legacyCity?.[2]).toBe(legacyGrass?.[2]);
    expect(legacyCity?.[3]).toBe(legacyGrass?.[3]);
    expect(Number(legacyGrass?.[0]) - Number(legacyCity?.[0])).toBeCloseTo(
      4 * 128 * zoom,
    );
  });

  it("puts capital on the plan entry of the viewer's capital only", () => {
    const state = exploredAllV7(initialV7(1516));
    const view = viewForV7(state, state.humanPlayerId);
    const built = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const cities = built.entries.filter(
      (candidate) => candidate.kind === "CITY",
    );
    expect(cities.length).toBeGreaterThan(0);
    for (const candidate of cities) {
      const source = view.cities.find(
        (city) => `city:${city.id}` === candidate.key,
      );
      expect(candidate.capital === true).toBe(source?.isCapital === true);
    }
  });

  it("fills the exact cell with opaque terrain at every zoom step", () => {
    const grass = chibiAsset("TERRAIN:GRASS", "TERRAIN", 80, 80);
    for (const [step, expected] of [
      [0.75, [30, 30, 60, 60]],
      [1, [40, 40, 80, 80]],
      [1.5, [60, 60, 120, 120]],
      [2, [80, 80, 160, 160]],
    ] as const) {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(step) },
        plan: plan([
          entry(
            "TERRAIN",
            1,
            1,
            "terrain-ruleset7-original-grass-1",
            "TERRAIN:GRASS",
          ),
        ]),
        images: legacyImages,
        artSet: "CHIBI",
        chibiArt: fakeChibi([grass]),
      });
      const drawn = images(log);
      expect(drawn).toHaveLength(1);
      expect(drawn[0]?.slice(2)).toEqual([0, 0, 80, 80, ...expected]);
    }
  });

  it("keeps row-major draw order for tall terrain, city and unit overflow", () => {
    const forest = chibiAsset("TERRAIN:FOREST", "TALL_TERRAIN", 80, 104);
    const city = {
      ...chibiAsset("CITY:1", "SETTLEMENT", 96, 104),
      ownerMaskUrl: "/fixture/city-mask.png",
    };
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    const { context, log } = recordingContext();
    drawBoardV7({
      context,
      viewport: { width: 800, height: 600 },
      devicePixelRatio: 1,
      camera: { offsetX: 40, offsetY: 64, zoom: chibiCameraZoom(1) },
      plan: plan([
        entry("UNIT", 1, 0, "unit-original-fighter", "UNIT:FIGHTER"),
        entry("UNIT", 2, 0, "unit-original-marksman", "UNIT:MARKSMAN"),
        entry(
          "TERRAIN",
          1,
          1,
          "terrain-ruleset7-original-forest-1",
          "TERRAIN:FOREST",
        ),
        entry("CITY", 2, 1, "building-city-1", "CITY:1", { value: 1 }),
      ]),
      images: legacyImages,
      artSet: "CHIBI",
      chibiArt: fakeChibi([forest, city, fighter]),
    });
    const drawn = images(log).map((call) => call.slice(1));
    expect(drawn).toEqual([
      // Ground pass: the forest's owning cell only, below Roads.
      [{ chibi: forest.id }, 0, 24, 80, 80, 80, 104, 80, 80],
      // Foreground pass in row-major order: row 0 first.
      [{ chibi: fighter.id }, 92, 24, 56, 80],
      [{ legacy: "unit-original-marksman" }, ...(drawn[2]?.slice(1) ?? [])],
      // The forest's upward overflow covers the row behind it.
      [{ chibi: forest.id }, 0, 0, 80, 24, 80, 80, 80, 24],
      // The city overflows 8 px each side and 24 px upward, still after row 0.
      [{ chibi: city.id }, 152, 80, 96, 104],
    ]);
  });
  it("keeps every registered chibi unit's opaque pixels clear of its HP bar and seat badge", async () => {
    // World units (128 = one cell) to CSS px at zoom 1 (80 = one cell).
    const css = 80 / 128;
    const { hpBar, seatBadge } = CHIBI_OVERLAY_FRAME_V7;
    // A 1 px margin covers the badge stroke and fractional edges.
    const frames = [
      [hpBar.left, hpBar.top, hpBar.width, hpBar.height],
      [seatBadge.left, seatBadge.top, seatBadge.size, seatBadge.size],
    ].map(([left = 0, top = 0, width = 0, height = 0]) => ({
      left: left * css - 1,
      top: top * css - 1,
      right: (left + width) * css + 1,
      bottom: (top + height) * css + 1,
    }));
    // Giants are exempt (CHIBI_ART_DIRECTION.md section 3): they may reach
    // the overlay strips, and the overlays are drawn after every piece (see
    // "draws a giant's HP bar, seat badge and Undead badge after its sprite").
    const units = CHIBI_ART_ASSETS_V7.filter(
      (asset) =>
        asset.subject.startsWith("UNIT:") && asset.assetClass !== "GIANT_UNIT",
    );
    expect(units.map((asset) => asset.assetClass)).toEqual(
      expect.arrayContaining(["STANDARD_UNIT", "LARGE_UNIT"]),
    );
    for (const asset of units) {
      const file = `public/${asset.url.replace(/^.*?assets\//, "assets/")}`;
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([asset.width, asset.height]);
      const anchor = chibiAnchorV7(asset);
      const covered: string[] = [];
      for (let py = 0; py < info.height; py += 1)
        for (let px = 0; px < info.width; px += 1) {
          if ((data[(py * info.width + px) * 4 + 3] ?? 0) < 128) continue;
          const x = px - anchor.x;
          const y = py - anchor.y;
          if (
            frames.some(
              (frame) =>
                x + 1 > frame.left &&
                x < frame.right &&
                y + 1 > frame.top &&
                y < frame.bottom,
            )
          )
            covered.push(`${px},${py}`);
        }
      expect({ id: asset.id, covered }).toEqual({ id: asset.id, covered: [] });
    }
  });

  it("labels Goblin units, asks for UNIT:GOBLIN art and badges them only over Human art (pulp_wars-0ao.4)", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 6, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 5 } },
      ],
    );
    const view = viewForV7(state, state.humanPlayerId);
    const units = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.filter((candidate) => candidate.kind === "UNIT");
    const at = (x: number, y: number) =>
      units.find((candidate) => candidate.at.x === x && candidate.at.y === y);
    expect(at(4, 3)).toMatchObject({
      faction: "GOBLIN",
      label: "Goblin",
      artSubject: "UNIT:GOBLIN:FIGHTER",
      assetId: at(4, 5)?.assetId,
    });
    expect(at(6, 3)).toMatchObject({
      faction: "GOBLIN",
      label: "Troll",
      artSubject: "UNIT:GOBLIN:JUGGERNAUT",
    });
    expect(at(4, 5)?.faction).toBeUndefined();
    expect(at(4, 5)?.label).toBe("Fighter");
    const goblin = at(4, 3);
    if (goblin === undefined) throw new Error("Goblin missing");
    const placeholder = chibiAsset(
      "UNIT:GOBLIN:FIGHTER",
      "STANDARD_UNIT",
      56,
      80,
    );
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    const discs = (
      artSet: "LEGACY" | "CHIBI",
      ready: readonly ChibiArtAssetV7[],
    ) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(1) },
        plan: plan([{ ...goblin, at: { x: 1, y: 1 } }]),
        images: legacyImages,
        artSet,
        chibiArt: fakeChibi(ready),
      });
      return {
        drawn: images(log).map((call) => call[1]),
        arcs: log.filter((call) => call[0] === "arc").length,
      };
    };
    // LEGACY: the Human sprite plus the Goblin badge (a disc).
    const legacy = discs("LEGACY", [placeholder]);
    expect(legacy.drawn).toEqual([{ legacy: goblin.assetId }]);
    expect(legacy.arcs).toBeGreaterThan(0);
    // CHIBI with the placeholder registered: the placeholder, no badge.
    const own = discs("CHIBI", [placeholder, fighter]);
    expect(own.drawn).toEqual([{ chibi: placeholder.id }]);
    expect(own.arcs).toBe(0);
  });

  it("draws a giant's HP bar, seat badge and Undead badge after its sprite", () => {
    const abomination = chibiAsset(
      "UNIT:UNDEAD:JUGGERNAUT",
      "GIANT_UNIT",
      88,
      104,
    );
    const juggernaut = chibiAsset("UNIT:JUGGERNAUT", "GIANT_UNIT", 88, 104);
    const giant = (x: number, owner: string, seat: number) =>
      entry(
        "UNIT",
        x,
        1,
        "unit-original-juggernaut",
        "UNIT:UNDEAD:JUGGERNAUT",
        {
          ownerColor: owner,
          ownerSeat: seat,
          hp: 20,
          maxHp: 40,
          faction: "UNDEAD",
        },
      );
    const draw = (ready: readonly ChibiArtAssetV7[]) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(1) },
        plan: plan([
          giant(1, RULESET7_PLAYER_COLORS.CORAL, 0),
          giant(2, RULESET7_PLAYER_COLORS.TEAL, 1),
        ]),
        images: legacyImages,
        artSet: "CHIBI",
        chibiArt: fakeChibi(ready),
      });
      return log;
    };
    for (const ready of [[abomination], [juggernaut]]) {
      const log = draw(ready);
      const lastSprite = Math.max(
        ...images(log).map((call) => log.indexOf(call)),
      );
      expect(lastSprite).toBeGreaterThan(-1);
      const after = log.slice(lastSprite + 1);
      const fills = after
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2]);
      // Both seat badges and HP bars come after both giants' sprites.
      expect(fills).toContain(RULESET7_PLAYER_COLORS.CORAL);
      expect(fills).toContain(RULESET7_PLAYER_COLORS.TEAL);
      expect(
        after.filter((call) => call[0] === "fillRect").length,
      ).toBeGreaterThanOrEqual(4);
      // The Undead skull badge (a disc) is drawn only over the Human
      // stand-in, and then also after every sprite.
      const discs = after.filter((call) => call[0] === "arc");
      if (ready[0] === juggernaut) expect(discs.length).toBeGreaterThan(0);
      else expect(discs).toEqual([]);
    }
  });

  it("glows large and giant ready units over their whole canvas and draws every piece overlay above them", () => {
    const knight = chibiAsset("UNIT:KNIGHT", "LARGE_UNIT", 72, 88);
    const juggernaut = chibiAsset("UNIT:JUGGERNAUT", "GIANT_UNIT", 88, 104);
    const city = chibiAsset("CITY:3", "SETTLEMENT", 96, 104);
    const fighter = chibiAsset("UNIT:FIGHTER", "STANDARD_UNIT", 56, 80);
    for (const step of [1, 0.75] as const) {
      const glowDraws: unknown[][] = [];
      const glowCache = {
        draw: (...args: unknown[]) => glowDraws.push(args),
      } as unknown as BoardGlowCacheV7;
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(step) },
        plan: plan([
          // Row 0: a Fighter whose overlays the giant below overflows into.
          entry("UNIT", 1, 0, "unit-original-fighter", "UNIT:FIGHTER", {
            ownerColor: RULESET7_PLAYER_COLORS.CORAL,
            ownerSeat: 1,
            hp: 3,
            maxHp: 10,
          }),
          entry("CITY", 1, 1, "building-city-3", "CITY:3", {
            value: 3,
            population: 2,
            capital: true,
            ownerColor: RULESET7_PLAYER_COLORS.TEAL,
            ownerSeat: 0,
          }),
          entry("UNIT", 1, 1, "unit-original-juggernaut", "UNIT:JUGGERNAUT", {
            ownerColor: RULESET7_PLAYER_COLORS.TEAL,
            ownerSeat: 0,
            hp: 20,
            maxHp: 40,
            ready: true,
          }),
          entry("UNIT", 2, 1, "unit-original-knight", "UNIT:KNIGHT", {
            ownerColor: RULESET7_PLAYER_COLORS.TEAL,
            ownerSeat: 0,
            hp: 15,
            maxHp: 15,
            ready: true,
          }),
        ]),
        images: legacyImages,
        artSet: "CHIBI",
        chibiArt: fakeChibi([knight, juggernaut, city, fighter]),
        glowCache,
        readinessElapsedMs: 800,
      });
      const cell = 128 * chibiCameraZoom(step);
      const centre = { x: 40 + cell, y: 40 + cell };
      const rect = (
        asset: ChibiArtAssetV7,
        at: { readonly x: number; readonly y: number },
      ) => ({
        x: at.x - (asset.width / 2) * step,
        y: at.y - (asset.height - 40) * step,
        width: asset.width * step,
        height: asset.height * step,
      });
      // Each ready unit glows around its whole drawn canvas, never shrunk to
      // 56 px: the Knight at 1:1, the Juggernaut garrisoning the city at its
      // garrison size.
      const garrison = chibiGarrisonDestinationRect(
        centre,
        { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(step) },
        juggernaut,
        1,
      );
      // Two outline layers each (aura, then band).
      const knightRect = rect(knight, { x: centre.x + cell, y: centre.y });
      expect(glowDraws.map((call) => [call[2], call[3]])).toEqual([
        [`chibi:${juggernaut.id}`, garrison],
        [`chibi:${juggernaut.id}`, garrison],
        [`chibi:${knight.id}`, knightRect],
        [`chibi:${knight.id}`, knightRect],
      ]);
      const juggernautDraw = images(log).find(
        (call) => (call[1] as { chibi?: string }).chibi === juggernaut.id,
      );
      const { x, y, width, height } = garrison;
      expect(juggernautDraw?.slice(2)).toEqual([x, y, width, height]);
      // The population pips and capital crown of the garrisoned city come
      // after every unit, so the giant cannot cover them.
      const lastUnit = log.indexOf(
        images(log).find(
          (call) => (call[1] as { chibi?: string }).chibi === knight.id,
        ) as LogEntry,
      );
      const after = log.slice(lastUnit + 1);
      const fills = after
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2]);
      expect(fills).toContain("#f4c542");
      // The Fighter's seat badge (row 0) is drawn after every piece, row 1
      // included, so a giant's upward overflow can never cover it.
      expect(fills).toContain(RULESET7_PLAYER_COLORS.CORAL);
      const fighterBar = after.find(
        (call) =>
          call[0] === "fillRect" &&
          call[1] ===
            centre.x +
              CHIBI_OVERLAY_FRAME_V7.hpBar.left * chibiCameraZoom(step) &&
          call[2] ===
            centre.y -
              cell +
              CHIBI_OVERLAY_FRAME_V7.hpBar.top * chibiCameraZoom(step),
      );
      expect(fighterBar).toBeDefined();
      const pipLefts = after
        .filter(
          (call) =>
            call[0] === "fillRect" &&
            call[3] === 7 * chibiCameraZoom(step) &&
            call[4] === 7 * chibiCameraZoom(step),
        )
        .map((call) => call[1]);
      expect(pipLefts).toHaveLength(4);
      for (const left of pipLefts)
        expect(left).toBe(
          centre.x +
            CHIBI_OVERLAY_FRAME_V7.populationColumn.left *
              chibiCameraZoom(step),
        );
    }
  });
});
