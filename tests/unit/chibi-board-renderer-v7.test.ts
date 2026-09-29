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
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

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
      ownerColor: RULESET7_PLAYER_COLORS.CORAL,
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

  it("keeps a ready CHIBI unit opaque at 1:1 and frames its overlays outside the figure", () => {
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
        // Mid-pulse: LEGACY is at its most translucent and enlarged here.
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
      // Anchor (28, 40) on the cell centre, master size times the step.
      expect(unitDraw?.slice(2)).toEqual([
        centre - 28 * step,
        centre - 40 * step,
        56 * step,
        80 * step,
      ]);
      const unitIndex = log.indexOf(unitDraw as LogEntry);
      const alphaBefore = log
        .slice(0, unitIndex)
        .filter((call) => call[0] === "set" && call[1] === "globalAlpha");
      expect(alphaBefore.at(-1)?.[2]).toBe(1);
      // Every overlay rect drawn after the unit stays clear of its 56 px
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
        expect(
          left + width <= centre - 28 * step || left >= centre + 28 * step,
        ).toBe(true);
    }
    // A legacy-fallback unit in the CHIBI set keeps the legacy pulse.
    const fallback = draw(fakeChibi([]), 1);
    const legacyUnit = images(fallback).find(
      (call) =>
        (call[1] as { legacy?: string }).legacy === "unit-original-fighter",
    );
    const fallbackIndex = fallback.indexOf(legacyUnit as LogEntry);
    const fallbackAlpha = fallback
      .slice(0, fallbackIndex)
      .filter((call) => call[0] === "set" && call[1] === "globalAlpha");
    expect(Number(fallbackAlpha.at(-1)?.[2])).toBeLessThan(1);
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
    const units = CHIBI_ART_ASSETS_V7.filter((asset) =>
      asset.subject.startsWith("UNIT:"),
    );
    expect(units.map((asset) => asset.assetClass)).toEqual(
      expect.arrayContaining(["STANDARD_UNIT", "LARGE_UNIT", "GIANT_UNIT"]),
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
      // Each ready unit glows around its full 1:1 canvas, never shrunk to 56 px.
      expect(glowDraws.map((call) => [call[2], call[3]])).toEqual([
        [`chibi:${juggernaut.id}`, rect(juggernaut, centre)],
        [
          `chibi:${knight.id}`,
          rect(knight, { x: centre.x + cell, y: centre.y }),
        ],
      ]);
      const juggernautDraw = images(log).find(
        (call) => (call[1] as { chibi?: string }).chibi === juggernaut.id,
      );
      const { x, y, width, height } = rect(juggernaut, centre);
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
      // The Fighter's seat badge (row 0) is drawn after the giant (row 1),
      // whose hammer overflows into the Fighter's cell.
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
