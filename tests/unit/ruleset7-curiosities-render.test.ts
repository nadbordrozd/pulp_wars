import { describe, expect, it } from "vitest";
import { queryPlayerCommandsV7, viewForV7 } from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  chibiCameraZoom,
  chibiDestinationRect,
} from "../../src/render/canvas/chibi-geometry-v7";
import { WRECK_WATERLINE_ROW_V7 } from "../../src/render/canvas/curiosity-canvas-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { drawSupportFeedbackV7 } from "../../src/render/canvas/support-presentation-v7";
import { UNIT_SHADOW_TABLE_V7 } from "../../src/render/canvas/unit-shadows-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  CURIOSITIES_UI_V7,
  curiositiesUiFixtureV7,
} from "../fixtures/v7-curiosities-ui";

/**
 * Map curiosities on the canvas (bead pulp_wars-737.6): the live look draws
 * the registered rasters (the Wreck cut at its waterline, the Spider on its
 * measured shadow with no owner chrome), the classic look and LEGACY draw
 * the code markers, and the effect cues draw their sprites.
 */
type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    { measureText: () => ({ width: 20 }) },
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
  return { context: context as unknown as CanvasRenderingContext2D, log };
}

/** The live registry as ready rasters, each image tagged with its asset. */
const liveArt: ChibiBoardArtV7 = {
  resolve: (request) => {
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(request.subject)[0];
    return asset === undefined
      ? { kind: "MISSING" }
      : {
          kind: "READY",
          asset,
          image: { assetId: asset.id } as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: asset.id,
        };
  },
};
/** The classic registry has no curiosity raster (nor any, here). */
const classicArt: ChibiBoardArtV7 = { resolve: () => ({ kind: "MISSING" }) };

const AT = CURIOSITIES_UI_V7;
const camera = { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 };
const centre = (at: { x: number; y: number }) => ({
  x: 40 + at.x * 80,
  y: 40 + at.y * 80,
});

function plan(): BoardRenderPlanV7 {
  const view = viewForV7(curiositiesUiFixtureV7(), 1 as never);
  const full = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
  });
  // Only the curiosities and the Spider: the test reads their draw calls.
  return {
    ...full,
    entries: full.entries.filter(
      (entry) => entry.kind === "CURIOSITY" || entry.monster !== undefined,
    ),
  };
}

function draw(look: "LIVE" | "CLASSIC" | "LEGACY"): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1400, height: 1400 },
    devicePixelRatio: 1,
    camera,
    plan: plan(),
    images: { resolve: () => null },
    reducedMotion: true,
    ...(look === "LEGACY"
      ? { artSet: "LEGACY" as const }
      : { artSet: "CHIBI" as const, chibiArt: classicArt }),
    ...(look === "LIVE"
      ? {
          direction: {
            spec: LIVE_DIRECTION_V7,
            art: createDirectedChibiArtV7({
              base: classicArt,
              samples: liveArt,
              direction: LIVE_DIRECTION_V7,
              environment: {
                readPixels: (_image, width, height) =>
                  new Uint8ClampedArray(width * height * 4).fill(200),
                createSurface: (pixels, width, height) =>
                  ({ pixels, width, height }) as unknown as CanvasImageSource,
              },
            }),
          },
        }
      : {}),
  });
  return log;
}

const imagesDrawn = (log: readonly LogEntry[]): string[] =>
  log
    .filter((call) => call[0] === "drawImage")
    .map((call) => (call[1] as { assetId?: string }).assetId ?? "?");

describe("curiosities on the canvas", () => {
  it("draws the registered rasters in the live look, the web before the Spider", () => {
    const log = draw("LIVE");
    const drawn = imagesDrawn(log);
    expect(drawn).toEqual([
      "chibi-curiosity-wreck",
      "chibi-curiosity-web",
      "chibi-curiosity-giant-spider",
      "chibi-curiosity-fountain",
      "chibi-curiosity-shrine",
      // Deferred with the piece overlays: the provoked marker.
      "chibi-curiosity-status-provoked",
    ]);
    // Each overlay fills exactly its cell.
    for (const [id, at] of [
      ["chibi-curiosity-web", AT.lair],
      ["chibi-curiosity-fountain", AT.fountain],
      ["chibi-curiosity-shrine", AT.shrine],
      ["chibi-curiosity-wreck", AT.wreck],
    ] as const) {
      const call = log.find(
        (entry) =>
          entry[0] === "drawImage" &&
          (entry[1] as { assetId?: string }).assetId === id,
      );
      const at0 = centre(at);
      expect(call?.slice(2), id).toEqual([at0.x - 40, at0.y - 40, 80, 80]);
    }
  });

  it("cuts the Wreck's hull at its waterline", () => {
    const log = draw("LIVE");
    const index = log.findIndex(
      (entry) =>
        entry[0] === "drawImage" &&
        (entry[1] as { assetId?: string }).assetId === "chibi-curiosity-wreck",
    );
    const before = log.slice(0, index);
    const rect = [...before].reverse().find((entry) => entry[0] === "rect");
    const at0 = centre(AT.wreck);
    expect(rect?.slice(1)).toEqual([
      at0.x - 40,
      at0.y - 40,
      80,
      WRECK_WATERLINE_ROW_V7,
    ]);
    expect(before.at(-1)?.[0]).toBe("clip");
    // No other overlay is clipped.
    expect(log.filter((entry) => entry[0] === "clip")).toHaveLength(1);
  });

  it("stands the Spider on its measured shadow, with no owner chrome", () => {
    const log = draw("LIVE");
    const anchor = UNIT_SHADOW_TABLE_V7["UNIT:MONSTER_GIANT_SPIDER"];
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
      "UNIT:MONSTER_GIANT_SPIDER",
    )[0];
    if (anchor?.shadow == null || asset === undefined)
      throw new Error("no Spider anchor");
    const rect = chibiDestinationRect(centre(AT.spider), camera, asset, 1);
    let style: unknown = null;
    let ellipse: number[] | null = null;
    const shadows: number[][] = [];
    for (const call of log) {
      if (call[0] === "ellipse") ellipse = call.slice(1, 5).map(Number);
      if (call[0] === "set" && call[1] === "fillStyle") style = call[2];
      if (
        call[0] === "fill" &&
        style === DIRECTED_GROUND_SHADOW_COLOUR_V7 &&
        ellipse !== null
      )
        shadows.push(ellipse);
    }
    expect(shadows).toHaveLength(1);
    expect(shadows[0]?.[0]).toBeCloseTo(rect.x + anchor.shadow.x);
    expect(shadows[0]?.[1]).toBeCloseTo(rect.y + anchor.shadow.y);
    expect(shadows[0]?.[2]).toBeCloseTo(anchor.shadow.radiusX);
    // The shadow spans its spread legs: wider than a standard unit's.
    expect(anchor.shadow.radiusX).toBeGreaterThanOrEqual(33);
    // No seat badge, flag or pennant: nothing is written on the board.
    expect(log.some((entry) => entry[0] === "fillText")).toBe(false);
  });

  for (const look of ["CLASSIC", "LEGACY"] as const)
    it(`${look}: draws code markers and a code Spider, and no raster`, () => {
      const log = draw(look);
      expect(imagesDrawn(log)).toEqual([]);
      // A basin, an arch, a mast, a web and a spider: plenty of strokes,
      // and the "!" of the code-drawn provoked marker.
      expect(
        log.filter((entry) => entry[0] === "stroke").length,
      ).toBeGreaterThan(20);
      expect(
        log.filter((entry) => entry[0] === "fillText").map((entry) => entry[1]),
      ).toEqual(["!"]);
    });
});

describe("the curiosity effect cues", () => {
  const art = {
    devicePixelRatio: 1,
    image: (subject: string) => ({
      image: { subject } as unknown as CanvasImageSource,
      width: 48,
      height: 48,
    }),
  };
  const cue = (
    effect: "FOUNTAIN" | "BLESSING" | "SALVAGE" | "BOUNTY",
    amount: number | undefined,
    sprites: boolean,
    reducedMotion = false,
  ): LogEntry[] => {
    const { context, log } = recordingContext();
    drawSupportFeedbackV7(
      context,
      camera,
      {
        effect,
        actor: {
          unitId: 1,
          at: { x: 2, y: 2 },
          ...(amount === undefined ? {} : { amount }),
        },
        recipients: [],
        progress: 0.3,
      },
      reducedMotion,
      sprites ? art : null,
    );
    return log;
  };
  const subjects = (log: readonly LogEntry[]): string[] =>
    log
      .filter((call) => call[0] === "drawImage")
      .map((call) => (call[1] as { subject: string }).subject);
  const floats = (log: readonly LogEntry[]): unknown[] =>
    log.filter((call) => call[0] === "fillText").map((call) => call[1]);

  it("draws each cue's sprite and its rising number", () => {
    expect(subjects(cue("FOUNTAIN", 7, true))).toEqual([
      "EFFECT:FOUNTAIN_HEAL",
    ]);
    expect(floats(cue("FOUNTAIN", 7, true))).toEqual(["+7"]);
    expect(subjects(cue("BLESSING", undefined, true))).toEqual([
      "EFFECT:SHRINE_BLESSING",
    ]);
    expect(floats(cue("BLESSING", undefined, true))).toEqual([]);
    for (const [effect, amount] of [
      ["SALVAGE", 8],
      ["BOUNTY", 10],
    ] as const) {
      expect(subjects(cue(effect, amount, true))).toEqual([
        "EFFECT:SALVAGE_COINS",
      ]);
      expect(floats(cue(effect, amount, true))).toEqual([`+${amount}`]);
    }
  });

  it("keeps a code cue without the sprites (LEGACY) and holds still under reduced motion", () => {
    for (const effect of [
      "FOUNTAIN",
      "BLESSING",
      "SALVAGE",
      "BOUNTY",
    ] as const) {
      const log = cue(effect, effect === "BLESSING" ? undefined : 5, false);
      expect(subjects(log)).toEqual([]);
      expect(
        log.filter((call) => call[0] === "fill" || call[0] === "stroke").length,
        effect,
      ).toBeGreaterThan(0);
    }
    const still = (progress: number): LogEntry[] => {
      const { context, log } = recordingContext();
      drawSupportFeedbackV7(
        context,
        camera,
        {
          effect: "SALVAGE",
          actor: { unitId: 1, at: { x: 2, y: 2 }, amount: 8 },
          recipients: [],
          progress,
        },
        true,
        art,
      );
      return log;
    };
    expect(still(0.1)).toEqual(still(0.9));
  });
});
