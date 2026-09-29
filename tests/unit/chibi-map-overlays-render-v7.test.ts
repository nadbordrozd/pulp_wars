import { describe, expect, it, vi } from "vitest";
import { viewForV7 } from "../../src/engine/index";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  buildBoardRenderPlanV7,
  CHIBI_OVERLAY_FRAME_V7,
  CHIBI_ROAD_STROKES_V7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Batch 3 (pulp_wars-67q.7): CHIBI restyles of the code-drawn Roads and
 * Field Defense, and resources that a Mine or Farm raster already depicts.
 */

type LogEntry = readonly unknown[];

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

/** Every subject resolves to a ready 1:1 raster of its class's size. */
function readyChibi(): ChibiBoardArtV7 {
  return {
    resolve: vi.fn((request): ChibiResolutionV7 => {
      const subject: ArtSubjectV7 = request.subject;
      const unit = subject.startsWith("UNIT:");
      const resource = subject.startsWith("RESOURCE:");
      const size = unit
        ? { width: 56, height: 80 }
        : resource
          ? { width: 40, height: 40 }
          : { width: 80, height: 80 };
      return {
        kind: "READY",
        asset: {
          id: `fixture-${subject}`,
          subject,
          assetClass: unit
            ? "STANDARD_UNIT"
            : resource
              ? "RESOURCE"
              : "TERRAIN",
          ...size,
          url: `/fixture/${subject}.png`,
        },
        image: { chibi: subject } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: subject,
      };
    }),
  };
}

function plan(entries: readonly BoardRenderPlanEntryV7[]): BoardRenderPlanV7 {
  return { version: 7, entries, targets: [] };
}

function draw(
  built: BoardRenderPlanV7,
  artSet: "LEGACY" | "CHIBI",
  highContrast = false,
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1000, height: 800 },
    devicePixelRatio: 1,
    camera: {
      offsetX: 64,
      offsetY: 64,
      zoom: artSet === "CHIBI" ? chibiCameraZoom(1) : 1,
    },
    plan: built,
    images: legacyImages,
    highContrast,
    ...(artSet === "CHIBI" ? { artSet, chibiArt: readyChibi() } : {}),
  });
  return log;
}

const strokeColours = (log: readonly LogEntry[]): unknown[] =>
  log
    .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
    .map((call) => call[2]);

describe("CHIBI batch-3 map overlays", () => {
  it("skips Ore under a Mine and Fertile Ground under a Farm in CHIBI only", () => {
    const state = exploredAllV7(initialV7(1516));
    const base = viewForV7(state, state.humanPlayerId);
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
                  resource: "ORE" as const,
                  improvement: "MINE" as const,
                }
              : tile.at.x === 1 && tile.at.y === 0
                ? {
                    ...tile,
                    terrain: "MOUNTAIN" as const,
                    resource: "ORE" as const,
                    improvement: null,
                  }
                : tile.at.x === 2 && tile.at.y === 0
                  ? {
                      ...tile,
                      terrain: "GRASS" as const,
                      resource: "FERTILE_GROUND" as const,
                      improvement: "FARM" as const,
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
    const resource = (x: number) =>
      built.entries.find((entry) => entry.key === `resource:${x},0`);
    expect(resource(0)?.coveredByImprovement).toBe(true);
    expect(resource(1)?.coveredByImprovement).toBeUndefined();
    expect(resource(2)?.coveredByImprovement).toBe(true);

    const only = plan(
      [0, 1, 2].flatMap((x) => {
        const entry = resource(x);
        return entry === undefined ? [] : [entry];
      }),
    );
    const drawnResources = (log: readonly LogEntry[]) =>
      log
        .filter((call) => call[0] === "drawImage")
        .map((call) => call[1])
        .filter(
          (image) =>
            (image as { chibi?: string }).chibi?.startsWith("RESOURCE:") ===
              true || (image as { legacy?: string }).legacy !== undefined,
        );
    expect(drawnResources(draw(only, "LEGACY"))).toHaveLength(3);
    expect(drawnResources(draw(only, "CHIBI"))).toEqual([
      { chibi: "RESOURCE:ORE" },
    ]);
  });

  it("draws every CHIBI road casing before any road fill and keeps LEGACY roads", () => {
    const roads = plan([
      {
        key: "road-join:1,1",
        kind: "ROAD_JOIN",
        layer: 1.9,
        at: { x: 1, y: 1 },
        roadJoins: [
          [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
          ],
        ],
      },
      {
        key: "road:1,1",
        kind: "ROAD",
        layer: 2,
        at: { x: 1, y: 1 },
        roadNeighbors: [
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ],
      },
      {
        key: "road:2,1",
        kind: "ROAD",
        layer: 2,
        at: { x: 2, y: 1 },
        roadNeighbors: [{ x: 1, y: 1 }],
      },
    ]);
    const [casing, fill] = CHIBI_ROAD_STROKES_V7;
    const chibi = strokeColours(draw(roads, "CHIBI"));
    expect(chibi).toEqual([
      casing[0],
      casing[0],
      casing[0],
      fill[0],
      fill[0],
      fill[0],
    ]);
    expect(strokeColours(draw(roads, "LEGACY"))).toEqual([
      "#69472e",
      "#a57a4c",
      "#69472e",
      "#a57a4c",
      "#69472e",
      "#a57a4c",
    ]);
  });

  it("draws the CHIBI Field Defense palisade after every piece, in the top-left badge frame", () => {
    const fieldDefense: BoardRenderPlanEntryV7 = {
      key: "field-defense:1,1",
      kind: "FIELD_DEFENSE",
      layer: 8,
      at: { x: 1, y: 1 },
      value: 2,
    };
    const giant: BoardRenderPlanEntryV7 = {
      key: "unit:7",
      kind: "UNIT",
      layer: 5,
      at: { x: 1, y: 2 },
      assetId: "unit-original-juggernaut",
      artSubject: "UNIT:JUGGERNAUT",
    };
    const log = draw(plan([fieldDefense, giant]), "CHIBI");
    const lastImage = log.map((call) => call[0]).lastIndexOf("drawImage");
    const palisade = log.findIndex(
      (call) =>
        call[0] === "set" && call[1] === "fillStyle" && call[2] === "#f1dc8f",
    );
    expect(palisade).toBeGreaterThan(lastImage);
    const zoom = chibiCameraZoom(1);
    const cellX = 64 + 128 * zoom;
    const frame = CHIBI_OVERLAY_FRAME_V7.fieldDefense;
    const bar = CHIBI_OVERLAY_FRAME_V7.hpBar;
    // The badge ends where the HP bar strip begins.
    expect(frame.top + frame.size).toBeLessThanOrEqual(bar.top);
    const crossbar = log.find((call) => call[0] === "strokeRect");
    expect(crossbar?.[1]).toBeCloseTo(cellX + frame.left * zoom);
    expect(crossbar?.[3]).toBeCloseTo(frame.size * zoom);
    expect(log.some((call) => call[0] === "fillText" && call[1] === "2")).toBe(
      true,
    );
    const legacy = draw(plan([fieldDefense]), "LEGACY");
    expect(
      legacy.some(
        (call) =>
          call[0] === "set" && call[1] === "fillStyle" && call[2] === "#f1dc8f",
      ),
    ).toBe(false);
    const contrast = draw(plan([fieldDefense]), "CHIBI", true);
    expect(
      contrast.some(
        (call) =>
          call[0] === "set" && call[1] === "fillStyle" && call[2] === "#f1dc8f",
      ),
    ).toBe(false);
  });
});
