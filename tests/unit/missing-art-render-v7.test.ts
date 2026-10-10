import { describe, expect, it } from "vitest";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  drawMissingArtMarkerV7,
  missingArtLetterV7,
  missingTerrainWashV7,
} from "../../src/render/canvas/missing-art-v7";
import { missingArtLetterOfAssetV7 } from "../../src/render/dom/app-view-v7";
import { readyBoardArtV7 } from "../fixtures/v7-board-art";

/**
 * Bead pulp_wars-67q.15: Ruleset 7 has one art set, and a subject whose
 * raster is missing or failed to load is drawn in code, never with a raster
 * of the earlier set.
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

const entries: readonly BoardRenderPlanEntryV7[] = [
  {
    key: "terrain:0,0",
    kind: "TERRAIN",
    layer: 1,
    at: { x: 0, y: 0 },
    assetId: "terrain-ruleset7-water-deep",
    artSubject: "TERRAIN:DEEP_WATER",
  },
  {
    key: "terrain:1,0",
    kind: "TERRAIN",
    layer: 1,
    at: { x: 1, y: 0 },
    assetId: "terrain-ruleset7-original-forest-1",
    artSubject: "TERRAIN:FOREST",
  },
  {
    key: "improvement:1,0",
    kind: "IMPROVEMENT",
    layer: 4,
    at: { x: 1, y: 0 },
    assetId: "building-square-windmill",
    artSubject: "IMPROVEMENT:WINDMILL",
  },
  {
    key: "unit:1",
    kind: "UNIT",
    layer: 5,
    at: { x: 0, y: 0 },
    assetId: "unit-original-knight",
    artSubject: "UNIT:KNIGHT",
    ownerColor: "#f06762",
    ownerSeat: 0,
    hp: 5,
    maxHp: 10,
  },
];

function draw(
  options: Partial<Parameters<typeof drawBoardV7>[0]> = {},
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 400, height: 300 },
    devicePixelRatio: 1,
    camera: { offsetX: 40, offsetY: 40, zoom: chibiCameraZoom(1) },
    plan: { version: 7, entries, targets: [] },
    ...options,
  });
  return log;
}

const fillsBefore = (log: readonly LogEntry[], index: number): unknown =>
  log
    .slice(0, index)
    .filter((call) => call[0] === "set" && call[1] === "fillStyle")
    .at(-1)?.[2];

describe("a board subject without a raster (pulp_wars-67q.15)", () => {
  it("draws the ground as a flat wash of its terrain, on the whole cell", () => {
    const log = draw();
    expect(log.filter((call) => call[0] === "drawImage")).toEqual([]);
    const cells = log
      .map((call, index) => ({ call, index }))
      .filter(
        ({ call }) =>
          call[0] === "fillRect" && call[3] === 80 && call[4] === 80,
      );
    expect(
      cells.map(({ call, index }) => [
        call[1],
        call[2],
        fillsBefore(log, index),
      ]),
    ).toEqual([
      [0, 0, missingTerrainWashV7("TERRAIN:DEEP_WATER")],
      [80, 0, missingTerrainWashV7("TERRAIN:FOREST")],
    ]);
    expect(missingTerrainWashV7("TERRAIN:DEEP_WATER")).not.toBe(
      missingTerrainWashV7("TERRAIN:SHALLOW_WATER"),
    );
    expect(missingTerrainWashV7("TERRAIN:UNDEAD:GRASS")).toBe(
      missingTerrainWashV7("TERRAIN:GRASS"),
    );
    expect(missingTerrainWashV7(undefined)).toBe(
      missingTerrainWashV7("TERRAIN:GRASS"),
    );
  });

  it("draws a unit as a lettered disc in its owner's colour and a building as a plate", () => {
    const log = draw();
    const letters = log.filter((call) => call[0] === "fillText");
    // The Windmill's plate, the Knight's disc, and the Knight's seat number.
    expect(letters.map((call) => call[1])).toEqual(
      expect.arrayContaining(["W", "K", "1"]),
    );
    // One disc (the unit) at the marker's size, and one square plate.
    const zoom = chibiCameraZoom(1);
    expect(
      log.filter((call) => call[0] === "arc" && call[3] === 26 * zoom),
    ).toHaveLength(1);
    expect(
      log.filter(
        (call) =>
          call[0] === "rect" && call[3] === 52 * zoom && call[4] === 52 * zoom,
      ),
    ).toHaveLength(1);
    // The unit keeps its HP bar (the plain one under a stand-in).
    expect(log.some((call) => call[0] === "set" && call[2] === "#65d889")).toBe(
      true,
    );
  });

  it("draws the same frame for no art at all and for art that has nothing", () => {
    expect(
      draw({ chibiArt: readyBoardArtV7({ missing: () => true }) }),
    ).toEqual(draw());
  });

  it("draws only the missing subject in code when the others have rasters", () => {
    const log = draw({
      chibiArt: readyBoardArtV7({
        missing: (subject) => subject === "UNIT:KNIGHT",
      }),
    });
    const drawn = log
      .filter((call) => call[0] === "drawImage")
      .map((call) => (call[1] as { id: string }).id);
    expect(drawn).toEqual(
      expect.arrayContaining([
        "TERRAIN:DEEP_WATER",
        "IMPROVEMENT:WINDMILL",
        "TERRAIN:FOREST",
      ]),
    );
    expect(drawn).not.toContain("UNIT:KNIGHT");
    expect(
      log
        .filter((call) => call[0] === "fillText")
        .map((call) => call[1])
        .filter((text) => text === "K" || text === "W"),
    ).toEqual(["K"]);
  });

  it("letters a marker with the first letter of the subject's own name", () => {
    expect(missingArtLetterV7("UNIT:UNDEAD:JUGGERNAUT")).toBe("J");
    expect(missingArtLetterV7("CITY:2")).toBe("C");
    expect(missingArtLetterV7("SITE:VILLAGE")).toBe("V");
    expect(missingArtLetterV7(undefined)).toBe("?");
    expect(missingArtLetterOfAssetV7("unit-original-captain-v7r10")).toBe("C");
    expect(missingArtLetterOfAssetV7("building-city-1")).toBe("C");
    expect(missingArtLetterOfAssetV7("ui-tech-roads")).toBe("R");
    expect(missingArtLetterOfAssetV7("")).toBe("?");
  });

  it("draws the marker in black and white in high contrast", () => {
    const { context, log } = recordingContext();
    drawMissingArtMarkerV7(context, 100, 100, 1, {
      shape: "DISC",
      letter: "K",
      ownerColor: "#f06762",
      highContrast: true,
    });
    const colours = log
      .filter(
        (call) =>
          call[0] === "set" &&
          (call[1] === "fillStyle" || call[1] === "strokeStyle"),
      )
      .map((call) => call[2]);
    expect(new Set(colours)).toEqual(new Set(["#ffffff", "#000000"]));
  });
});
