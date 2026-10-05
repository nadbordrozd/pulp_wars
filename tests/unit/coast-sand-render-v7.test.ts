import { describe, expect, it } from "vitest";
import {
  COAST_E,
  COAST_N,
  COAST_NE,
  COAST_PHASES_V7,
  COAST_SAND_ENABLED_V7,
  COAST_SAND_V7,
  COAST_SE,
  COAST_SW,
  COAST_W,
  coastCellsV7,
  coastLayerPixelsV7,
  coastSandEnabledV7,
  createCoastSandArtV7,
  drawCoastSandV7,
  type CoastEntryV7,
} from "../../src/render/canvas/coast-sand-v7";

/**
 * pulp_wars-2yc.5 (docs/art/COAST_SAND.md): a thin, irregular band of sand
 * on the land side of every coast and a waterline with surf on the water
 * side, in the live look only.
 */

const CELL = 80;

/** "g" Grass, "F" Forest, "M" Mountain, "s" Shallow, "d" Deep, "?" fog. */
function board(rows: readonly string[]): CoastEntryV7[] {
  const subjects: Record<string, string> = {
    g: "TERRAIN:GRASS",
    F: "TERRAIN:FOREST",
    M: "TERRAIN:MOUNTAIN",
    R: "TERRAIN:RIFT_H_MIDDLE",
    s: "TERRAIN:SHALLOW_WATER",
    d: "TERRAIN:DEEP_WATER",
  };
  return rows.flatMap((row, y) =>
    [...row].map((mark, x): CoastEntryV7 =>
      mark === "?"
        ? { kind: "FOG", at: { x, y } }
        : { kind: "TERRAIN", at: { x, y }, artSubject: subjects[mark] ?? "" },
    ),
  );
}

const alphaAt = (pixels: Uint8ClampedArray, x: number, y: number): number =>
  pixels[(y * CELL + x) * 4 + 3] ?? 0;
const colourAt = (
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
): number[] => [...pixels.subarray((y * CELL + x) * 4, (y * CELL + x) * 4 + 4)];

describe("the coast switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(COAST_SAND_ENABLED_V7).toBe(true);
    expect(coastSandEnabledV7("")).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(coastSandEnabledV7(`?art=chibi&coast-sand=${off}`)).toBe(false);
    expect(coastSandEnabledV7("?coast-sand=1")).toBe(true);
    expect(coastSandEnabledV7("?coast-sand=what")).toBe(true);
    expect(coastSandEnabledV7()).toBe(true);
  });
});

describe("the coast cells", () => {
  it("gives land beside water the sand and water beside land the surf", () => {
    const cells = coastCellsV7(board(["ggs", "ggs", "ddd"]));
    // Water east of it and at its south-east corner.
    expect(cells.get("1,0")).toMatchObject({
      layer: "SAND",
      neighbours: COAST_E | COAST_SE,
    });
    // The corner cell: water east, south and at the corner between.
    expect(cells.get("1,1")?.layer).toBe("SAND");
    expect((cells.get("1,1")?.neighbours ?? 0) & COAST_E).toBe(COAST_E);
    // Inland, with water only at a far corner: nothing; next to it, a blob.
    expect(cells.has("0,0")).toBe(false);
    expect(cells.get("2,0")).toMatchObject({
      layer: "SURF",
      neighbours: COAST_W | COAST_SW,
    });
    // Open sea away from land draws nothing.
    const sea = coastCellsV7(board(["gsd", "sdd", "ddd"]));
    expect(sea.has("2,2")).toBe(false);
    expect(sea.has("2,0")).toBe(false);
    for (const cell of cells.values())
      expect(cell.phase).toBeLessThan(COAST_PHASES_V7 ** 2);
  });

  it("counts Forest, Mountains and a Rift as land, deep water as water", () => {
    const cells = coastCellsV7(board(["FMR", "ddd"]));
    for (const at of ["0,0", "1,0", "2,0"])
      expect(cells.get(at)?.layer).toBe("SAND");
    expect(cells.get("1,1")?.layer).toBe("SURF");
  });

  it("draws a corner blob for water that touches only at a corner", () => {
    const cells = coastCellsV7(board(["gs", "gg"]));
    expect(cells.get("0,1")).toMatchObject({
      layer: "SAND",
      neighbours: COAST_NE,
    });
  });

  it("reads explored cells only: fog is neither land nor water", () => {
    expect(coastCellsV7(board(["g?s"])).size).toBe(0);
    expect(coastCellsV7(board(["g?", "??", "s?"])).size).toBe(0);
    // Explored on both sides of a corner: that corner is a coast.
    expect(coastCellsV7(board(["g?", "?s"])).size).toBe(2);
  });

  it("leaves a water cell under sea ice to the ice", () => {
    const entries = board(["gs"]).map((entry) =>
      entry.at.x === 1 ? { ...entry, seaIce: { permanent: false } } : entry,
    );
    const cells = coastCellsV7(entries);
    expect(cells.has("1,0")).toBe(false);
    // The land beside it keeps its sand.
    expect(cells.get("0,0")?.layer).toBe("SAND");
  });
});

describe("the coast layers", () => {
  it("are empty without a neighbour and stay near the edges given", () => {
    for (const kind of ["SAND", "SURF"] as const) {
      expect(coastLayerPixelsV7(kind, 0, 0).some((value) => value > 0)).toBe(
        false,
      );
      for (let phase = 0; phase < COAST_PHASES_V7 ** 2; phase += 1) {
        const pixels = coastLayerPixelsV7(kind, COAST_N, phase);
        let painted = 0;
        for (let y = 0; y < CELL; y += 1)
          for (let x = 0; x < CELL; x += 1) {
            if (alphaAt(pixels, x, y) === 0) continue;
            painted += 1;
            // Nothing beyond 12 px from the shore.
            expect(y).toBeLessThan(12);
          }
        expect(painted).toBeGreaterThan(60);
      }
    }
  });

  it("make a thin band of sand that swells, thins and breaks", () => {
    const depths = new Set<number>();
    let total = 0;
    let columns = 0;
    for (let phase = 0; phase < COAST_PHASES_V7; phase += 1) {
      const pixels = coastLayerPixelsV7("SAND", COAST_N, phase);
      for (let x = 0; x < CELL; x += 1) {
        let depth = 0;
        while (depth < CELL && alphaAt(pixels, x, depth) > 0) depth += 1;
        depths.add(depth);
        total += depth;
        columns += 1;
      }
    }
    const mean = total / columns;
    expect(mean).toBeGreaterThan(3);
    expect(mean).toBeLessThan(6);
    expect(Math.max(...depths)).toBeLessThanOrEqual(9);
    // It breaks somewhere, and it is not one width.
    expect(Math.min(...depths)).toBe(0);
    expect(depths.size).toBeGreaterThan(5);
  });

  it("use the sand's three colours on land and wet sand, surf and foam on water", () => {
    const { sand, wet, lip, surf, foam } = COAST_SAND_V7;
    const land = new Set<string>();
    const water = new Set<string>();
    for (let phase = 0; phase < COAST_PHASES_V7 ** 2; phase += 1) {
      const sandPixels = coastLayerPixelsV7("SAND", COAST_N | COAST_E, phase);
      const surfPixels = coastLayerPixelsV7("SURF", COAST_N | COAST_E, phase);
      for (let y = 0; y < CELL; y += 1)
        for (let x = 0; x < CELL; x += 1) {
          if (alphaAt(sandPixels, x, y) > 0)
            land.add(colourAt(sandPixels, x, y).join());
          if (alphaAt(surfPixels, x, y) > 0)
            water.add(colourAt(surfPixels, x, y).join());
        }
    }
    expect([...land].sort()).toEqual(
      [sand, wet, lip].map((colour) => colour.join()).sort(),
    );
    expect([...water].sort()).toEqual(
      [wet, surf, foam].map((colour) => colour.join()).sort(),
    );
  });

  it("run round a corner: the corner pixel of an outer corner is sand", () => {
    const outer = coastLayerPixelsV7("SAND", COAST_N | COAST_E | COAST_NE, 0);
    expect(alphaAt(outer, CELL - 1, 0)).toBe(255);
    const inner = coastLayerPixelsV7("SAND", COAST_NE, 0);
    expect(alphaAt(inner, CELL - 1, 0)).toBe(255);
    expect(alphaAt(inner, 0, 0)).toBe(0);
    expect(alphaAt(inner, CELL - 1, CELL - 1)).toBe(0);
  });

  it("meet the next cell's band without a step, and are deterministic", () => {
    const depthAt = (pixels: Uint8ClampedArray, x: number): number => {
      let y = 0;
      while (y < CELL && alphaAt(pixels, x, y) > 0) y += 1;
      return y;
    };
    for (let phase = 0; phase < COAST_PHASES_V7; phase += 1) {
      const left = coastLayerPixelsV7("SAND", COAST_N, phase);
      const right = coastLayerPixelsV7(
        "SAND",
        COAST_N,
        (phase + 1) % COAST_PHASES_V7,
      );
      expect(
        Math.abs(depthAt(left, CELL - 1) - depthAt(right, 0)),
      ).toBeLessThanOrEqual(2);
    }
    expect(coastLayerPixelsV7("SURF", COAST_W, 4)).toEqual(
      coastLayerPixelsV7("SURF", COAST_W, 4),
    );
    expect(coastLayerPixelsV7("SAND", COAST_W, 4)).not.toEqual(
      coastLayerPixelsV7("SAND", COAST_W, 5),
    );
  });
});

describe("the coast art and drawing", () => {
  it("builds each layer once and draws a cell's layer over its ground", () => {
    let built = 0;
    const art = createCoastSandArtV7({
      createSurface(pixels) {
        built += 1;
        return { pixels } as unknown as CanvasImageSource;
      },
    });
    const first = art.layer("SAND", COAST_E, 2);
    expect(art.layer("SAND", COAST_E, 2)).toBe(first);
    expect(built).toBe(1);
    expect(art.layer("SURF", COAST_E, 2)).not.toBe(first);

    const entries = board(["gs", "gg"]);
    const cells = coastCellsV7(entries);
    const drawn: CanvasImageSource[] = [];
    const context = {
      save() {},
      restore() {},
      drawImage(image: CanvasImageSource) {
        drawn.push(image);
      },
      globalAlpha: 1,
      imageSmoothingEnabled: false,
    } as unknown as CanvasRenderingContext2D;
    const frame = {
      camera: { zoom: 1, offsetX: 0, offsetY: 0 },
      devicePixelRatio: 1,
      sceneAlpha: 1,
    };
    const [land, water, inland] = [entries[0], entries[1], entries[2]];
    if (land === undefined || water === undefined || inland === undefined)
      throw new Error("no entries");
    drawCoastSandV7(context, frame, art, land, cells);
    drawCoastSandV7(context, frame, art, water, cells);
    expect(drawn).toEqual([
      art.layer("SAND", cells.get("0,0")?.neighbours ?? 0, 0),
      art.layer("SURF", cells.get("1,0")?.neighbours ?? 0, 1),
    ]);
    // The switch off (no art), no cells, or a cell away from the coast.
    drawn.length = 0;
    drawCoastSandV7(context, frame, null, land, cells);
    drawCoastSandV7(context, frame, art, land, null);
    drawCoastSandV7(
      context,
      frame,
      art,
      { ...inland, at: { x: 9, y: 9 } },
      cells,
    );
    expect(drawn).toEqual([]);
  });
});
