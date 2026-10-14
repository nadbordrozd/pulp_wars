import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACTION_GRASS_TILE_COUNTS_V7,
  FACTION_GRASS_TILES_V7,
} from "../../src/assets/faction-grass-manifest";
import type { RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import { readRaster, sha256 } from "../../scripts/art/chibi/pipeline";
import {
  FACTION_GRASS_RECORD,
  FIELD_GROUND_IDS,
  factionGrassProblems,
  factionGrassTilePath,
  fieldGroundFieldPath,
  fieldGroundLook,
  fieldGroundRecipe,
  type FactionGrassRecord,
} from "../../scripts/art/faction-grass";
import {
  GROUND_CANDIDATES,
  GROUND_RUN,
  groundPalettePath,
  groundRecipeId,
} from "../../scripts/art/faction-grounds/candidates";
import {
  GROUND_CELL,
  deriveGroundTile,
  groundKindMotifs,
  groundMotifs,
  type GroundTileRecipe,
} from "../../scripts/art/faction-grounds/derive";
import { GROUND_LOOKS } from "../../scripts/art/faction-grounds/looks";

/**
 * The grounds composed from PixelLab fields (bead pulp_wars-2yc.48,
 * docs/art/FACTION_GRASS.md): the Cult peat bog, the Undead burnt ground
 * and the Dwarf mine gravel, and the derivation that makes their tiles.
 */

const ROOT = process.cwd();

/** A field: `rows` of one character per pixel, `.` the base colour. */
function field(rows: readonly string[], palette: Record<string, string>) {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * rows.length * 4);
  for (const [y, row] of rows.entries())
    for (let x = 0; x < width; x += 1) {
      const colour = palette[row[x] ?? "."] ?? "#000000";
      data.set(
        [1, 3, 5]
          .map((at) => Number.parseInt(colour.slice(at, at + 2), 16))
          .concat(255),
        (y * width + x) * 4,
      );
    }
  return { width, height: rows.length, data } satisfies RgbaRaster;
}

const BASE = "#808080";
const DARK = "#202020";
const LIGHT = "#f0f0f0";
const PALETTE = { ".": BASE, "#": DARK, "+": LIGHT };
const FROM = [BASE, DARK, LIGHT];

function blank(size: number): string[] {
  return Array.from({ length: size }, () => ".".repeat(size));
}

function stamp(rows: string[], x: number, y: number, shape: string[]): void {
  for (const [dy, line] of shape.entries()) {
    const row = rows[y + dy] ?? "";
    rows[y + dy] = row.slice(0, x) + line + row.slice(x + line.length);
  }
}

const pixel = (raster: RgbaRaster, x: number, y: number): string =>
  `#${[0, 1, 2]
    .map((channel) =>
      (raster.data[(y * raster.width + x) * 4 + channel] ?? 0)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

describe("the motifs of a ground field", () => {
  const rows = blank(40);
  // A ring, a stone lit at the top, a speck, and a blob at the field's edge.
  stamp(rows, 5, 5, ["###", "#.#", "###"]);
  stamp(rows, 20, 10, ["++", "##"]);
  stamp(rows, 30, 30, ["#"]);
  stamp(rows, 0, 20, ["##", "##"]);
  const raster = field(rows, PALETTE);

  it("are its features that do not touch its edge, in scan order", () => {
    const motifs = groundMotifs(raster, { from: FROM, to: FROM });
    expect(
      motifs.map((motif) => [motif.left, motif.top, motif.area, motif.colours]),
    ).toEqual([
      [5, 5, 8, [1]],
      [20, 10, 4, [1, 2]],
      [30, 30, 1, [1]],
    ]);
  });

  it("are sorted into kinds by size and colour", () => {
    const recipe: GroundTileRecipe = {
      fields: [{ from: FROM, to: FROM }],
      variants: 1,
      seed: 1,
      kinds: [
        { id: "ring", area: [6, 20], lacks: [2], count: [1, 1] },
        { id: "stone", area: [2, 20], has: [2], count: [1, 1] },
        { id: "speck", area: [1, 1], count: [1, 1] },
      ],
    };
    expect(
      groundKindMotifs([raster], recipe).map((list) => list.length),
    ).toEqual([1, 1, 1]);
  });

  it("takes the colour most of the field has for the ground", () => {
    // The palette's first colour is not the field's ground here.
    const motifs = groundMotifs(raster, {
      from: [DARK, BASE, LIGHT],
      to: [DARK, BASE, LIGHT],
    });
    expect(motifs).toHaveLength(3);
  });
});

describe("a ground tile", () => {
  const rows = blank(40);
  stamp(rows, 5, 5, ["###", "#.#", "###"]);
  stamp(rows, 20, 10, ["++", "##"]);
  const raster = field(rows, PALETTE);
  const recipe: GroundTileRecipe = {
    fields: [{ from: FROM, to: ["#336633", "#111111", "#eeeeee"] }],
    variants: 2,
    seed: 7,
    kinds: [
      {
        id: "ring",
        area: [6, 20],
        lacks: [2],
        count: [3, 3],
        hollow: "#555555",
      },
      { id: "stone", area: [2, 20], has: [2], count: [4, 4], flip: true },
    ],
  };

  it("is the flat ground colour with its motifs on it, the same every time", () => {
    const first = deriveGroundTile([raster], recipe, 0);
    const again = deriveGroundTile([raster], recipe, 0);
    const other = deriveGroundTile([raster], recipe, 1);
    expect(first.raster.width).toBe(GROUND_CELL);
    expect(first.raster.height).toBe(GROUND_CELL);
    expect(first.raster.data).toEqual(again.raster.data);
    expect(first.raster.data).not.toEqual(other.raster.data);
    expect(first.stats.placed).toEqual({ ring: 3, stone: 4 });
    const colours = new Set<string>();
    for (let y = 0; y < GROUND_CELL; y += 1)
      for (let x = 0; x < GROUND_CELL; x += 1)
        colours.add(pixel(first.raster, x, y));
    // The ground, the ring and what it encloses, the stone's two colours.
    expect([...colours].sort()).toEqual([
      "#111111",
      "#336633",
      "#555555",
      "#eeeeee",
    ]);
    // 3 rings of 8 + 1 enclosed pixel, 4 stones of 4 pixels.
    expect(first.stats.detail).toBeCloseTo(((27 + 16) / 6400) * 100, 1);
  });

  it("keeps every motif off its edges, so any tile joins any other", () => {
    for (const variant of [0, 1]) {
      const { raster: tile } = deriveGroundTile([raster], recipe, variant);
      for (let at = 0; at < GROUND_CELL; at += 1)
        for (const [x, y] of [
          [at, 0],
          [at, 1],
          [at, GROUND_CELL - 1],
          [at, GROUND_CELL - 2],
          [0, at],
          [1, at],
          [GROUND_CELL - 1, at],
          [GROUND_CELL - 2, at],
        ] as const)
          expect(pixel(tile, x, y)).toBe("#336633");
    }
  });

  it("turns a flipped kind upside down: the stone's light side is its lower one", () => {
    const { raster: tile } = deriveGroundTile([raster], recipe, 0);
    let stones = 0;
    for (let y = 0; y < GROUND_CELL - 1; y += 1)
      for (let x = 0; x < GROUND_CELL; x += 1) {
        // The field's stone is light over dark; flipped it is dark over light.
        expect(
          pixel(tile, x, y) === "#eeeeee" &&
            pixel(tile, x, y + 1) === "#111111",
        ).toBe(false);
        if (
          pixel(tile, x, y) === "#111111" &&
          pixel(tile, x, y + 1) === "#eeeeee"
        )
          stones += 1;
      }
    expect(stones).toBe(8);
  });

  it("cuts a blob in code and lets a later kind lie inside it", () => {
    const blobs: GroundTileRecipe = {
      fields: [{ from: FROM, to: ["#336633", "#111111", "#eeeeee"] }],
      variants: 1,
      seed: 3,
      kinds: [
        {
          id: "pool",
          area: [0, 0],
          count: [1, 1],
          blob: { radius: [10, 10], fill: "#224466" },
        },
        { id: "glint", area: [2, 20], has: [2], count: [1, 1], inside: "pool" },
      ],
    };
    const { raster: tile, stats } = deriveGroundTile([raster], blobs, 0);
    expect(stats.placed).toEqual({ pool: 1, glint: 1 });
    // The pool alone is the same pool: the glint lies on its pixels only.
    const [pool] = blobs.kinds;
    if (pool === undefined) throw new Error("no pool");
    const { raster: alone } = deriveGroundTile(
      [raster],
      { ...blobs, kinds: [pool] },
      0,
    );
    let glint = 0;
    for (let y = 0; y < GROUND_CELL; y += 1)
      for (let x = 0; x < GROUND_CELL; x += 1) {
        if (pixel(tile, x, y) === pixel(alone, x, y)) continue;
        expect(pixel(alone, x, y)).toBe("#224466");
        glint += 1;
      }
    expect(glint).toBe(4);
  });
});

describe("the grounds made from PixelLab fields", () => {
  it("are the Cult's and Candy's, one chosen look each", () => {
    // The Dwarf gravel, the Undead wildfire and the Goblin savannah tiles
    // were three more until those grounds became textures
    // (docs/art/TEXTURED_GROUNDS.md); their looks stay as samples.
    expect([...FIELD_GROUND_IDS]).toEqual(["CULT", "CANDY"]);
    for (const id of FIELD_GROUND_IDS) {
      const look = fieldGroundLook(id);
      expect(look.faction).toBe(id);
      expect(fieldGroundRecipe(look).variants).toBe(
        FACTION_GRASS_TILE_COUNTS_V7[id],
      );
    }
    // The Martians have samples only: none is wired.
    for (const look of GROUND_LOOKS)
      if (look.status === "CHOSEN")
        expect(FIELD_GROUND_IDS).toContain(look.faction);
    expect(
      GROUND_LOOKS.filter((look) => look.lead === true).map(
        (look) => look.faction,
      ),
    ).toEqual(["MARTIAN"]);
  });

  it("are what their looks derive from the recorded fields, pixel for pixel", async () => {
    expect(await factionGrassProblems(ROOT)).toEqual([]);
    const record = JSON.parse(
      await readFile(path.join(ROOT, FACTION_GRASS_RECORD), "utf8"),
    ) as FactionGrassRecord;
    expect(record.grounds.map((ground) => ground.id)).toEqual([
      ...FIELD_GROUND_IDS,
    ]);
    // No recoloured ground is left: the Dinosaur jungle floor, the last,
    // is a texture (docs/art/TEXTURED_GROUNDS.md).
    expect(record.recipes).toEqual([]);
    for (const ground of record.grounds) {
      for (const source of ground.fields) {
        expect(source.path).toBe(fieldGroundFieldPath(source.recipe));
        expect(sha256(await readFile(path.join(ROOT, source.path)))).toBe(
          source.sha256,
        );
      }
      expect(ground.tiles.map((tile) => tile.path)).toEqual(
        ground.tiles.map((_, variant) =>
          factionGrassTilePath(ground.id, variant),
        ),
      );
      // The runtime manifest lists exactly these files.
      expect(
        FACTION_GRASS_TILES_V7.filter((tile) => tile.id === ground.id).map(
          (tile) => tile.url.replace(/^.*assets\//, "public/assets/"),
        ),
      ).toEqual(ground.tiles.map((tile) => tile.path));
    }
  });

  it("are calm, opaque 80 x 80 tiles whose every edge pixel is the ground colour", async () => {
    for (const id of FIELD_GROUND_IDS) {
      const look = fieldGroundLook(id);
      const recipe = fieldGroundRecipe(look);
      const ground = recipe.ground ?? "";
      const tiles: RgbaRaster[] = [];
      for (let variant = 0; variant < recipe.variants; variant += 1)
        tiles.push(
          await readRaster(path.join(ROOT, factionGrassTilePath(id, variant))),
        );
      const edges = new Set<string>();
      for (const tile of tiles) {
        expect([tile.width, tile.height], id).toEqual([80, 80]);
        let detail = 0;
        for (let y = 0; y < 80; y += 1)
          for (let x = 0; x < 80; x += 1) {
            expect(tile.data[(y * 80 + x) * 4 + 3]).toBe(255);
            if (x < 2 || y < 2 || x >= 78 || y >= 78)
              edges.add(pixel(tile, x, y));
            else if (pixel(tile, x, y) !== pixel(tile, 0, 0)) detail += 1;
          }
        // Ground, not a picture: at most a tenth of a tile is motif.
        expect(detail / 6400, id).toBeLessThan(0.1);
      }
      // One colour on every edge of every tile: any variant joins any other.
      expect(edges.size, id).toBe(1);
      if (ground !== "") expect([...edges][0]).toBe(ground);
      // No two tiles of a ground are the same picture.
      expect(
        new Set(tiles.map((tile) => Buffer.from(tile.data).toString("base64")))
          .size,
      ).toBe(tiles.length);
    }
  });
});

describe("the exploration run of the ground fields", () => {
  it("has the forced palette, the subject and the recipe of every candidate", async () => {
    const batch = JSON.parse(
      await readFile(path.join(ROOT, GROUND_RUN, "batch.json"), "utf8"),
    ) as {
      recipes: {
        id: string;
        endpoint: string;
        colorImage: { path: string; sha256: string };
      }[];
    };
    const ids = GROUND_CANDIDATES.flatMap((candidate) =>
      candidate.recipes.map((recipe) => groundRecipeId(candidate, recipe)),
    );
    expect(batch.recipes.map((recipe) => recipe.id)).toEqual(ids);
    for (const candidate of GROUND_CANDIDATES)
      for (const recipe of candidate.recipes) {
        const entry = batch.recipes.find(
          (item) => item.id === groundRecipeId(candidate, recipe),
        );
        expect(entry?.endpoint).toBe("create-image-pixflux");
        expect(entry?.colorImage.path).toBe(
          groundPalettePath(candidate, recipe),
        );
        expect(
          sha256(await readFile(path.join(ROOT, entry?.colorImage.path ?? ""))),
        ).toBe(entry?.colorImage.sha256);
      }
  });

  it("holds the field of every look, generated by PixelLab", async () => {
    const records = JSON.parse(
      await readFile(path.join(ROOT, GROUND_RUN, "records.json"), "utf8"),
    ) as {
      recipes: Record<
        string,
        {
          rawSheet?: string;
          rawSheetSha256?: string;
          review?: { verdict: string };
        }
      >;
    };
    for (const look of GROUND_LOOKS)
      for (const id of look.fields) {
        const record = records.recipes[id];
        expect(record?.rawSheet, id).toBe(fieldGroundFieldPath(id));
        expect(
          sha256(await readFile(path.join(ROOT, fieldGroundFieldPath(id)))),
        ).toBe(record?.rawSheetSha256);
        // A field a look is made from was not rejected.
        expect(record?.review?.verdict, id).not.toBe("REJECTED");
      }
  });
});
