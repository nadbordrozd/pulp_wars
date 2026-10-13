/**
 * EXPERIMENT: faction grass (bead pulp_wars-2o7.4, docs/art/FACTION_GRASS.md).
 * The ground of each faction's territory. No PixelLab call is made here.
 *
 * There are two kinds of ground. The Dinosaur and Martian grounds are the
 * three accepted Grass masters recoloured, as described below. The Cult,
 * Undead, Dwarf, Candy and Goblin grounds (bead pulp_wars-2yc.48) are
 * composed from the motifs of reviewed PixelLab fields (FIELD_GROUND_IDS
 * below, scripts/art/faction-grounds/derive.ts).
 *
 *   npx tsx scripts/art/faction-grass.ts bake
 *   npx tsx scripts/art/faction-grass.ts check          # also in art:validate
 *   npx tsx scripts/art/faction-grass.ts sheet <out.png>
 *   npx tsx scripts/art/faction-grass.ts stats
 *
 * A tile is made in three steps:
 *
 * 1. **The Grass as the board shows it.** The master is toned as the live
 *    look tones every Grass tile (contrast 65% around the Grass pivot).
 * 2. **Colour swap.** A Grass master has a base colour and three tuft
 *    colours; each becomes the faction's base, light, mid and dark colour.
 *    The tufts, the three variants and the seamless joins stay.
 * 3. **Motifs.** A few small details per tile, placed by a seeded hash and
 *    kept 3 px inside the tile, so every variant joins every other: patches
 *    (mud, lichen, moss), pebbles, ferns, sprinkles, and a share of the
 *    tufts recoloured (dry straw, scrub).
 *
 * The tiles are baked in their final colours: the board draws them as they
 * are, without the terrain tone. `bake` writes them and `faction-grass.json`
 * (the recipes and the hash of every source and output); `check` re-derives
 * every tile and fails when the bytes differ (`factionGrassProblems`).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  FACTION_GRASS_CELL_VARIANTS_V7,
  FACTION_GRASS_VARIANTS_V7,
  GRASS_E,
  GRASS_N,
  GRASS_NE,
  GRASS_S,
  GRASS_SE,
  GRASS_W,
  factionGrassSpillMaskV7,
  type FactionGrassIdV7,
} from "../../src/render/canvas/faction-grass-v7";
import {
  LIVE_DIRECTION_V7,
  terrainPivotV7,
  tonePixelsV7,
} from "../../src/render/canvas/visual-direction-v7";
import { encodePng, pixelSha256, readRaster, sha256 } from "./chibi/pipeline";
import type { RgbaRaster } from "./chibi/owner-mask";
import {
  GROUND_CANDIDATES,
  GROUND_RUN,
  groundRecipeId,
} from "./faction-grounds/candidates";
import {
  deriveGroundTile,
  groundKindMotifs,
  type GroundTileRecipe,
} from "./faction-grounds/derive";
import { GROUND_LOOKS, type GroundLook } from "./faction-grounds/looks";
import { texturedFieldPath } from "./textured-grounds/candidates";
import { texturedGround } from "./textured-grounds/ground";
import { TEXTURED_LOOKS, type TexturedLook } from "./textured-grounds/looks";

const CELL = 80;
const TERRAIN = "public/assets/chibi/terrain";
export const FACTION_GRASS_DIRECTORY = `${TERRAIN}/faction-grass`;
export const FACTION_GRASS_RECORD = "scripts/art/faction-grass.json";

type Rgb = readonly [number, number, number];

function hex(colour: string): Rgb {
  return [1, 3, 5].map((at) =>
    Number.parseInt(colour.slice(at, at + 2), 16),
  ) as unknown as Rgb;
}

/** A Grass master's colours by role: the base and the three tufts. */
const GRASS_ROLES: Readonly<Record<string, "base" | "light" | "mid" | "dark">> =
  {
    "#8ab85c": "base",
    "#a3cc72": "light",
    "#6e9c4a": "mid",
    "#557f3c": "dark",
    "#52793a": "dark",
  };

type Motif =
  | {
      /** An irregular patch over the base colour; tufts stay on top. */
      readonly kind: "patch";
      readonly count: readonly [number, number];
      readonly radius: readonly [number, number];
      readonly fill: string;
      /** Its lower rim, one pixel. */
      readonly rim?: string;
      /** Pixels inside it in a second colour, of 100. */
      readonly speck?: { readonly colour: string; readonly share: number };
    }
  | {
      /** A small stone: a light top over a dark foot. */
      readonly kind: "pebble";
      readonly count: readonly [number, number];
      readonly top: string;
      readonly foot: string;
    }
  | {
      /** One or two pixels of one of the colours. */
      readonly kind: "fleck";
      readonly count: readonly [number, number];
      readonly colours: readonly string[];
    }
  | {
      /** A stamp from STAMPS, in two colours. */
      readonly kind: "stamp";
      readonly stamp: keyof typeof STAMPS;
      readonly count: readonly [number, number];
      readonly dark: string;
      readonly light: string;
    }
  | {
      /** This share of the tufts (of 100) takes these colours. */
      readonly kind: "tufts";
      readonly share: number;
      /**
       * Only tufts that keep 3 px from every edge (bead pulp_wars-2yc.14):
       * a tuft at an edge keeps the ground's own colours, so the edge
       * band of the tile is the colour swap alone.
       */
      readonly inside?: true;
      readonly light: string;
      readonly mid: string;
      readonly dark: string;
    };

/** `#` is the dark colour, `+` the light one. */
const STAMPS = {
  fern: ["...#...", ".#.#.#.", "+#.#.#+", ".+###+.", "..+#+..", "...#..."],
  fernSmall: ["#.#.#", "+###+", ".+#+.", "..#.."],
  sprout: [".+.", "+#+", ".#."],
  /** A stray bone (bead pulp_wars-2yc.14): `+` the bone, `#` its shade. */
  bone: ["+.....+", "+++++++", "#.....#"],
  boneSmall: ["+...+", "+++++", "#...#"],
  /**
   * A ring of small toadstools (bead pulp_wars-mch9.22): `+` a cap, `#`
   * its stalk.
   */
  toadstoolRing: [
    "...+.+...",
    "...#.#...",
    "+.......+",
    "#.......#",
    "...+.+...",
    "...#.#...",
  ],
  /** A faint chalk arc, one colour (`+`). */
  chalkArc: ["..+++++..", ".+.....+.", "+.......+"],
} as const;

export type FactionGrassMotif = Motif;

/** What a tile is derived from: four colours and the motifs. */
export type GrassRecipeColours = Pick<
  FactionGrassRecipe,
  "base" | "light" | "mid" | "dark" | "motifs"
>;

export interface FactionGrassRecipe {
  readonly id: Exclude<FactionGrassIdV7, FieldGroundId | WorldGroundId>;
  readonly label: string;
  /**
   * The seed of the motif placement. It was a recipe's place in this list
   * (1-based) until bead pulp_wars-2yc.48 took the Dwarf, Cult, Candy and
   * Goblin recipes out of it; written down, so the tiles left did not move.
   */
  readonly seed: number;
  readonly base: string;
  readonly light: string;
  readonly mid: string;
  readonly dark: string;
  readonly motifs: readonly Motif[];
}

/**
 * The recipes. Every colour is the colour on the board. The default Grass
 * is `#8ab85c` with tufts `#9bc56a`, `#78a650`, `#679347`.
 */
export const FACTION_GRASS_RECIPES: readonly FactionGrassRecipe[] = [
  {
    id: "DINOSAUR",
    seed: 2,
    label: "Jungle floor: lush, darker, bluer green with ferns",
    base: "#5f9f58",
    light: "#77b56b",
    mid: "#4a8549",
    dark: "#3c703f",
    motifs: [
      {
        kind: "stamp",
        stamp: "fern",
        count: [2, 3],
        dark: "#357040",
        light: "#86c474",
      },
      {
        kind: "stamp",
        stamp: "fernSmall",
        count: [2, 3],
        dark: "#3a7743",
        light: "#86c474",
      },
      {
        kind: "patch",
        count: [1, 2],
        radius: [5, 7],
        fill: "#569652",
      },
    ],
  },
];

// ------------------------------------------------- grounds from fields

/** The grounds whose tiles are composed from PixelLab fields. */
export const FIELD_GROUND_IDS = [
  "CULT",
  "UNDEAD",
  // Bead pulp_wars-2yc.48, second round: the user's picks of the samples.
  "CANDY",
  "GOBLIN",
] as const;
export type FieldGroundId = (typeof FIELD_GROUND_IDS)[number];

// ------------------------------------------------------ textured grounds

/**
 * The grounds that are one large texture the board samples by a cell's
 * place on the map (docs/art/TEXTURED_GROUNDS.md): quilted from PixelLab
 * fields by scripts/art/textured-grounds/ground.ts. The user, 2026-10-13:
 * "the textured terrain is great. use it."
 */
export const WORLD_GROUND_IDS = ["MARTIAN", "DWARF"] as const;
export type WorldGroundId = (typeof WORLD_GROUND_IDS)[number];

/** The look of each: the one of TEXTURED_LOOKS marked `chosen`. */
export function worldGroundLook(id: WorldGroundId): TexturedLook {
  const chosen = TEXTURED_LOOKS.filter(
    (look) => look.faction === id && look.chosen === true,
  );
  const look = chosen[0];
  if (look === undefined || chosen.length !== 1 || look.mode !== "WORLD")
    throw new Error(`${id}: exactly one WORLD look must be chosen`);
  return look;
}

/** The texture of a textured ground: `columns` x `rows` board cells. */
export function worldGroundPath(id: WorldGroundId): string {
  return `${FACTION_GRASS_DIRECTORY}/world/chibi-${id.toLowerCase()}-ground.png`;
}

/** The look of each, the one of GROUND_LOOKS with the status CHOSEN. */
export function fieldGroundLook(id: FieldGroundId): GroundLook {
  const chosen = GROUND_LOOKS.filter(
    (look) => look.faction === id && look.status === "CHOSEN",
  );
  const look = chosen[0];
  if (look === undefined || chosen.length !== 1)
    throw new Error(`${id}: exactly one ground look must be CHOSEN`);
  return look;
}

function fieldPalette(recipeId: string): readonly string[] {
  for (const candidate of GROUND_CANDIDATES)
    for (const recipe of candidate.recipes)
      if (groundRecipeId(candidate, recipe) === recipeId)
        return recipe.palette ?? candidate.palette;
  throw new Error(`no ground recipe ${recipeId}`);
}

/** A look's whole derivation recipe, the fields' palettes filled in. */
export function fieldGroundRecipe(look: GroundLook): GroundTileRecipe {
  return {
    ...look.recipe,
    fields: look.recipe.fields.map((source, index) => ({
      ...source,
      from: source.from ?? fieldPalette(look.fields[index] ?? ""),
    })),
  };
}

export function fieldGroundFieldPath(recipeId: string): string {
  return `${GROUND_RUN}/raw/${recipeId}.png`;
}

function hash(a: number, b: number, c: number, d: number): number {
  let h =
    Math.imul(a | 0, 0x9e3779b1) ^
    Math.imul(b | 0, 0x85ebca6b) ^
    Math.imul(c | 0, 0xc2b2ae35) ^
    Math.imul(d | 0, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** The Grass master as the live look draws it. */
export function tonedGrass(master: RgbaRaster): Uint8ClampedArray {
  return tonePixelsV7(
    new Uint8ClampedArray(master.data),
    master.width,
    master.height,
    { ...LIVE_DIRECTION_V7.terrain, scale: 100 },
    1,
    terrainPivotV7("TERRAIN:GRASS"),
  );
}

/** One faction tile from one Grass master (`variant` is 0-based). */
export function deriveFactionGrassTile(
  master: RgbaRaster,
  recipe: GrassRecipeColours,
  variant: number,
  seedOf: number,
): RgbaRaster {
  if (master.width !== CELL || master.height !== CELL)
    throw new Error("a Grass master is 80 x 80");
  type Role = "base" | "light" | "mid" | "dark";
  const roles: Role[] = [];
  for (let offset = 0; offset < master.data.length; offset += 4) {
    const colour = `#${[0, 1, 2]
      .map((c) => (master.data[offset + c] ?? 0).toString(16).padStart(2, "0"))
      .join("")}`;
    const role = GRASS_ROLES[colour];
    if (role === undefined)
      throw new Error(`grass colour ${colour} has no role`);
    roles.push(role);
  }
  const data = new Uint8Array(CELL * CELL * 4);
  const put = (x: number, y: number, colour: string): void => {
    const [r, g, b] = hex(colour);
    const offset = (y * CELL + x) * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  };
  for (let index = 0; index < roles.length; index += 1)
    put(index % CELL, Math.floor(index / CELL), recipe[roles[index] ?? "base"]);

  // Free ground: base pixels no motif has taken yet.
  const taken = new Uint8Array(CELL * CELL);
  const isBase = (x: number, y: number): boolean =>
    x >= 3 &&
    y >= 3 &&
    x < CELL - 3 &&
    y < CELL - 3 &&
    roles[y * CELL + x] === "base" &&
    taken[y * CELL + x] === 0;
  let roll = 0;
  const next = (): number => {
    roll += 1;
    return hash(seedOf, variant, roll, 0x2f);
  };
  const between = (range: readonly [number, number]): number =>
    range[0] + (next() % (range[1] - range[0] + 1));
  /** A spot whose `width` x `height` box is free ground, or null. */
  const freeBox = (
    width: number,
    height: number,
  ): { x: number; y: number } | null => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = 4 + (next() % (CELL - 8 - width));
      const y = 4 + (next() % (CELL - 8 - height));
      let free = true;
      for (let dy = -1; dy <= height && free; dy += 1)
        for (let dx = -1; dx <= width && free; dx += 1)
          if (!isBase(x + dx, y + dy)) free = false;
      if (free) return { x, y };
    }
    return null;
  };

  // Tufts: connected groups of tuft pixels (8-neighbour).
  const tuftOf = new Int32Array(CELL * CELL).fill(-1);
  let tufts = 0;
  for (let start = 0; start < roles.length; start += 1) {
    if (roles[start] === "base" || tuftOf[start] !== -1) continue;
    const stack = [start];
    tuftOf[start] = tufts;
    while (stack.length > 0) {
      const at = stack.pop() as number;
      const ax = at % CELL;
      const ay = Math.floor(at / CELL);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = ax + dx;
          const ny = ay + dy;
          if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL) continue;
          const to = ny * CELL + nx;
          if (roles[to] === "base" || tuftOf[to] !== -1) continue;
          tuftOf[to] = tufts;
          stack.push(to);
        }
    }
    tufts += 1;
  }

  for (const motif of recipe.motifs) {
    if (motif.kind === "tufts") {
      const atEdge = new Set<number>();
      if (motif.inside === true)
        for (let index = 0; index < roles.length; index += 1) {
          const x = index % CELL;
          const y = Math.floor(index / CELL);
          if (x < 3 || y < 3 || x >= CELL - 3 || y >= CELL - 3)
            atEdge.add(tuftOf[index] ?? -1);
        }
      for (let index = 0; index < roles.length; index += 1) {
        const tuft = tuftOf[index] ?? -1;
        const role = roles[index];
        if (tuft < 0 || role === undefined || role === "base") continue;
        if (atEdge.has(tuft)) continue;
        if (hash(seedOf, variant, tuft, 0x71) % 100 >= motif.share) continue;
        put(index % CELL, Math.floor(index / CELL), motif[role]);
      }
      continue;
    }
    const count = between(motif.count);
    for (let made = 0; made < count; made += 1) {
      if (motif.kind === "patch") {
        const rx = between(motif.radius);
        const ry = Math.max(3, Math.round(rx * (0.55 + (next() % 30) / 100)));
        const cx = 4 + rx + (next() % (CELL - 8 - 2 * rx));
        const cy = 4 + ry + (next() % (CELL - 8 - 2 * ry));
        const p1 = (next() % 628) / 100;
        const p2 = (next() % 628) / 100;
        const inside = (x: number, y: number): boolean => {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const angle = Math.atan2(dy, dx);
          return (
            Math.hypot(dx, dy) <
            1 +
              0.22 * Math.sin(3 * angle + p1) +
              0.14 * Math.sin(5 * angle + p2)
          );
        };
        for (let y = cy - ry - 3; y <= cy + ry + 3; y += 1)
          for (let x = cx - rx - 3; x <= cx + rx + 3; x += 1) {
            if (!inside(x, y) || !isBase(x, y)) continue;
            const speck =
              motif.speck !== undefined &&
              hash(seedOf, x, y, 0x33 + variant) % 100 < motif.speck.share;
            put(
              x,
              y,
              motif.rim !== undefined && !inside(x, y + 1)
                ? motif.rim
                : speck && motif.speck !== undefined
                  ? motif.speck.colour
                  : motif.fill,
            );
            taken[y * CELL + x] = 1;
          }
      } else if (motif.kind === "pebble") {
        const width = 3 + (next() % 2);
        const spot = freeBox(width, 2);
        if (spot === null) continue;
        for (let dx = 0; dx < width; dx += 1) {
          put(spot.x + dx, spot.y + 1, motif.foot);
          taken[(spot.y + 1) * CELL + spot.x + dx] = 1;
          // The top row is one pixel shorter at one end: a rounded stone.
          if (dx === (made % 2 === 0 ? 0 : width - 1)) continue;
          put(spot.x + dx, spot.y, motif.top);
          taken[spot.y * CELL + spot.x + dx] = 1;
        }
      } else if (motif.kind === "fleck") {
        const wide = next() % 2 === 0;
        const spot = freeBox(wide ? 2 : 1, wide ? 1 : 2);
        if (spot === null) continue;
        const colour =
          motif.colours[next() % motif.colours.length] ?? motif.colours[0];
        if (colour === undefined) continue;
        for (let step = 0; step < 2; step += 1) {
          const x = spot.x + (wide ? step : 0);
          const y = spot.y + (wide ? 0 : step);
          put(x, y, colour);
          taken[y * CELL + x] = 1;
        }
      } else {
        const rows = STAMPS[motif.stamp];
        const width = rows[0].length;
        const spot = freeBox(width, rows.length);
        if (spot === null) continue;
        for (const [dy, row] of rows.entries())
          for (let dx = 0; dx < width; dx += 1) {
            const mark = row[dx];
            if (mark === "." || mark === undefined) continue;
            put(
              spot.x + dx,
              spot.y + dy,
              mark === "#" ? motif.dark : motif.light,
            );
            taken[(spot.y + dy) * CELL + spot.x + dx] = 1;
          }
      }
    }
  }
  return { width: CELL, height: CELL, data };
}

export function factionGrassTilePath(
  id: FactionGrassIdV7,
  variant: number,
): string {
  return `${FACTION_GRASS_DIRECTORY}/chibi-${id.toLowerCase()}-grass-${variant + 1}.png`;
}

interface TileRecord {
  readonly path: string;
  readonly sha256: string;
  readonly pixelSha256: string;
}

export interface FactionGrassRecord {
  readonly schemaVersion: 3;
  /** The textured grounds (bead pulp_wars-2yc.48, third round). */
  readonly worlds: readonly {
    readonly id: WorldGroundId;
    readonly look: string;
    readonly label: string;
    /** The raw fields of the exploration run, as generated. */
    readonly fields: readonly {
      readonly recipe: string;
      readonly path: string;
      readonly sha256: string;
    }[];
    readonly columns: number;
    readonly rows: number;
    readonly texture: TileRecord;
    /**
     * The texture's first cell as a tile of its own: what the Gallery, the
     * tile dock and the forest bake show of the ground.
     */
    readonly swatch: TileRecord;
  }[];
  readonly bead: string;
  /** The grounds composed from PixelLab fields (bead pulp_wars-2yc.48). */
  readonly grounds: readonly {
    readonly id: FieldGroundId;
    readonly look: string;
    readonly label: string;
    readonly bead: string;
    /** The raw fields of the exploration run, as generated. */
    readonly fields: readonly {
      readonly recipe: string;
      readonly path: string;
      readonly sha256: string;
    }[];
    readonly recipe: GroundTileRecipe;
    readonly tiles: readonly TileRecord[];
  }[];
  readonly sources: readonly {
    readonly path: string;
    readonly sha256: string;
  }[];
  readonly recipes: readonly (FactionGrassRecipe & {
    readonly tiles: readonly {
      readonly path: string;
      readonly sha256: string;
      readonly pixelSha256: string;
    }[];
  })[];
}

/** Every tile as the Grass masters and the recipes derive it today. */
export async function deriveFactionGrass(root: string): Promise<{
  readonly record: FactionGrassRecord;
  readonly files: ReadonlyMap<string, Buffer>;
}> {
  const sources: { path: string; sha256: string }[] = [];
  const masters: RgbaRaster[] = [];
  for (let variant = 0; variant < FACTION_GRASS_VARIANTS_V7; variant += 1) {
    const file = `${TERRAIN}/chibi-grass-${variant + 1}.png`;
    const bytes = await readFile(path.join(root, file));
    sources.push({ path: file, sha256: sha256(bytes) });
    masters.push(await readRaster(bytes));
  }
  const files = new Map<string, Buffer>();
  const recipes: FactionGrassRecord["recipes"][number][] = [];
  for (const recipe of FACTION_GRASS_RECIPES) {
    const tiles = [];
    for (const [variant, master] of masters.entries()) {
      const raster = deriveFactionGrassTile(
        master,
        recipe,
        variant,
        recipe.seed,
      );
      const bytes = await encodePng(raster);
      const file = factionGrassTilePath(recipe.id, variant);
      files.set(file, bytes);
      tiles.push({
        path: file,
        sha256: sha256(bytes),
        pixelSha256: pixelSha256(raster),
      });
    }
    recipes.push({ ...recipe, tiles });
  }
  const grounds: FactionGrassRecord["grounds"][number][] = [];
  for (const id of FIELD_GROUND_IDS) {
    const look = fieldGroundLook(id);
    const recipe = fieldGroundRecipe(look);
    const fields: FactionGrassRecord["grounds"][number]["fields"][number][] =
      [];
    const rasters: RgbaRaster[] = [];
    for (const recipeId of look.fields) {
      const file = fieldGroundFieldPath(recipeId);
      const bytes = await readFile(path.join(root, file));
      fields.push({ recipe: recipeId, path: file, sha256: sha256(bytes) });
      rasters.push(await readRaster(bytes));
    }
    const motifs = groundKindMotifs(rasters, recipe);
    const tiles: TileRecord[] = [];
    for (let variant = 0; variant < recipe.variants; variant += 1) {
      const { raster } = deriveGroundTile(rasters, recipe, variant, motifs);
      const bytes = await encodePng(raster);
      const file = factionGrassTilePath(id, variant);
      files.set(file, bytes);
      tiles.push({
        path: file,
        sha256: sha256(bytes),
        pixelSha256: pixelSha256(raster),
      });
    }
    grounds.push({
      id,
      look: look.id,
      label: look.label,
      bead: "pulp_wars-2yc.48",
      fields,
      recipe,
      tiles,
    });
  }
  const worlds: FactionGrassRecord["worlds"][number][] = [];
  for (const id of WORLD_GROUND_IDS) {
    const look = worldGroundLook(id);
    const fields: FactionGrassRecord["worlds"][number]["fields"][number][] = [];
    for (const recipeId of new Set(
      [...look.fields, ...(look.things?.fields ?? [])].map((field) => field.id),
    )) {
      const file = texturedFieldPath(recipeId);
      fields.push({
        recipe: recipeId,
        path: file,
        sha256: sha256(await readFile(path.join(root, file))),
      });
    }
    const { world } = await texturedGround(root, look);
    if (world === undefined) throw new Error(`${id}: no texture`);
    const swatch: RgbaRaster = {
      width: CELL,
      height: CELL,
      data: new Uint8Array(CELL * CELL * 4),
    };
    for (let y = 0; y < CELL; y += 1)
      swatch.data.set(
        world.data.subarray(y * world.width * 4, (y * world.width + CELL) * 4),
        y * CELL * 4,
      );
    const record = async (
      file: string,
      raster: RgbaRaster,
    ): Promise<TileRecord> => {
      const bytes = await encodePng(raster);
      files.set(file, bytes);
      return {
        path: file,
        sha256: sha256(bytes),
        pixelSha256: pixelSha256(raster),
      };
    };
    worlds.push({
      id,
      look: look.id,
      label: look.label,
      fields,
      columns: world.width / CELL,
      rows: world.height / CELL,
      texture: await record(worldGroundPath(id), world),
      swatch: await record(factionGrassTilePath(id, 0), swatch),
    });
  }
  return {
    record: {
      schemaVersion: 3,
      bead: "pulp_wars-2o7.4",
      sources,
      recipes,
      grounds,
      worlds,
    },
    files,
  };
}

/** Problems of the checked-in faction grass tiles; empty means valid. */
export async function factionGrassProblems(root: string): Promise<string[]> {
  const problems: string[] = [];
  let derived;
  try {
    derived = await deriveFactionGrass(root);
  } catch (error) {
    return [
      `faction grass: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  let recorded: string;
  try {
    recorded = await readFile(path.join(root, FACTION_GRASS_RECORD), "utf8");
  } catch {
    return [`faction grass: ${FACTION_GRASS_RECORD} is missing`];
  }
  if (JSON.stringify(JSON.parse(recorded)) !== JSON.stringify(derived.record))
    problems.push(
      `faction grass: ${FACTION_GRASS_RECORD} is not what the Grass masters and the recipes derive (run the bake)`,
    );
  for (const [file, bytes] of derived.files) {
    let checkedIn: Buffer;
    try {
      checkedIn = await readFile(path.join(root, file));
    } catch {
      problems.push(`faction grass: ${file} is missing`);
      continue;
    }
    if (
      pixelSha256(await readRaster(checkedIn)) !==
      pixelSha256(await readRaster(bytes))
    )
      problems.push(`faction grass: ${file} is not what its recipe derives`);
  }
  return problems;
}

// ------------------------------------------------------------ review sheet

interface Ground {
  readonly label: string;
  readonly tiles: readonly Uint8ClampedArray[];
}

async function grounds(root: string): Promise<Ground[]> {
  const read = async (file: string): Promise<RgbaRaster> =>
    readRaster(await readFile(path.join(root, file)));
  const list: Ground[] = [];
  const three = [0, 1, 2];
  list.push({
    label: "DEFAULT",
    tiles: await Promise.all(
      three.map(async (v) =>
        tonedGrass(await read(`${TERRAIN}/chibi-grass-${v + 1}.png`)),
      ),
    ),
  });
  for (const recipe of FACTION_GRASS_RECIPES)
    list.push({
      label: recipe.id,
      tiles: await Promise.all(
        three.map(
          async (v) =>
            new Uint8ClampedArray(
              (await read(factionGrassTilePath(recipe.id, v))).data,
            ),
        ),
      ),
    });
  for (const id of FIELD_GROUND_IDS)
    list.push({
      label: id,
      tiles: await Promise.all(
        Array.from(
          { length: fieldGroundLook(id).recipe.variants },
          async (_, v) =>
            new Uint8ClampedArray(
              (await read(factionGrassTilePath(id, v))).data,
            ),
        ),
      ),
    });
  // A textured ground as its cells (for `stats`; a sheet lays them by the
  // tiles' hash, which is not how the board lays a texture).
  for (const id of WORLD_GROUND_IDS) {
    const world = await read(worldGroundPath(id));
    const tiles: Uint8ClampedArray[] = [];
    for (let cy = 0; cy < world.height / CELL; cy += 1)
      for (let cx = 0; cx < world.width / CELL; cx += 1) {
        const tile = new Uint8ClampedArray(CELL * CELL * 4);
        for (let y = 0; y < CELL; y += 1) {
          const from = ((cy * CELL + y) * world.width + cx * CELL) * 4;
          tile.set(world.data.subarray(from, from + CELL * 4), y * CELL * 4);
        }
        tiles.push(tile);
      }
    list.push({ label: id, tiles });
  }
  return list;
}

/**
 * A sheet: one row per ground, a 4 x 3 field of its tiles with a strip of
 * default Grass on its east and south sides, the border drawn with the
 * board's own spill masks.
 */
async function sheet(root: string, out: string): Promise<void> {
  const all = await grounds(root);
  const fallback = all[0];
  if (fallback === undefined) return;
  const columns = 5;
  const rows = 4;
  const gap = 12;
  const width = columns * CELL;
  const height = all.length * (rows * CELL + gap) - gap;
  const data = new Uint8Array(width * height * 4);
  const variantOf = (x: number, y: number): number =>
    hash(x, y, 3, 0x51) % FACTION_GRASS_CELL_VARIANTS_V7;
  for (const [index, ground] of all.entries()) {
    const top = index * (rows * CELL + gap);
    const own = (x: number, y: number): boolean =>
      index > 0 && x < columns - 1 && y < rows - 1;
    for (let cy = 0; cy < rows; cy += 1)
      for (let cx = 0; cx < columns; cx += 1) {
        const variant = variantOf(cx, cy + index * 7);
        const under = own(cx, cy) ? ground : fallback;
        const base = under.tiles[variant % under.tiles.length];
        if (base === undefined) continue;
        let neighbours = 0;
        if (!own(cx, cy)) {
          if (own(cx, cy - 1)) neighbours |= GRASS_N;
          if (own(cx - 1, cy)) neighbours |= GRASS_W;
          if (own(cx + 1, cy)) neighbours |= GRASS_E;
          if (own(cx, cy + 1)) neighbours |= GRASS_S;
          if (own(cx - 1, cy - 1)) neighbours |= 128;
          if (own(cx + 1, cy - 1)) neighbours |= GRASS_NE;
          if (own(cx + 1, cy + 1)) neighbours |= GRASS_SE;
        }
        const mask = factionGrassSpillMaskV7(
          neighbours,
          (cx % 3) + 3 * (cy % 3),
        );
        const over = ground.tiles[variant % ground.tiles.length];
        for (let y = 0; y < CELL; y += 1)
          for (let x = 0; x < CELL; x += 1) {
            const from = (y * CELL + x) * 4;
            const source =
              (mask[y * CELL + x] ?? 0) > 0 && over !== undefined ? over : base;
            const to = ((top + cy * CELL + y) * width + cx * CELL + x) * 4;
            data[to] = source[from] ?? 0;
            data[to + 1] = source[from + 1] ?? 0;
            data[to + 2] = source[from + 2] ?? 0;
            data[to + 3] = 255;
          }
      }
  }
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, await encodePng({ width, height, data }));
  const { default: sharp } = await import("sharp");
  const enlarged = out.replace(/\.png$/, "-x3.png");
  await sharp(out)
    .resize(width * 3, height * 3, { kernel: "nearest" })
    .toFile(enlarged);
  console.log(`wrote ${out} and ${enlarged}`);
  console.log(`rows, top to bottom: ${all.map((g) => g.label).join(", ")}`);
}

async function stats(root: string): Promise<void> {
  for (const ground of await grounds(root)) {
    let sum = 0;
    let sumSquares = 0;
    let saturation = 0;
    let count = 0;
    let offBase = 0;
    for (const tile of ground.tiles) {
      const tally = new Map<number, number>();
      for (let offset = 0; offset < tile.length; offset += 4) {
        const r = tile[offset] ?? 0;
        const g = tile[offset + 1] ?? 0;
        const b = tile[offset + 2] ?? 0;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const max = Math.max(r, g, b);
        sum += luma;
        sumSquares += luma * luma;
        saturation += max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
        count += 1;
        const packed = (r << 16) | (g << 8) | b;
        tally.set(packed, (tally.get(packed) ?? 0) + 1);
      }
      offBase += CELL * CELL - Math.max(...tally.values());
    }
    const mean = sum / count;
    const spread = Math.sqrt(sumSquares / count - mean * mean);
    console.log(
      `${ground.label.padEnd(9)} luma ${((mean / 255) * 100).toFixed(1)}%  saturation ${((saturation / count) * 100).toFixed(1)}%  luma spread ${((spread / 255) * 100).toFixed(1)}%  detail ${((offBase / count) * 100).toFixed(1)}% of pixels`,
    );
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const [command = "check", ...rest] = process.argv.slice(2);
  if (command === "bake") {
    const { record, files } = await deriveFactionGrass(root);
    await mkdir(path.join(root, FACTION_GRASS_DIRECTORY, "world"), {
      recursive: true,
    });
    for (const [file, bytes] of files) {
      await writeFile(path.join(root, file), bytes);
      console.log(`wrote ${file}`);
    }
    await writeFile(
      path.join(root, FACTION_GRASS_RECORD),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log(`wrote ${FACTION_GRASS_RECORD}`);
    return;
  }
  if (command === "sheet" && rest[0] !== undefined)
    return sheet(root, path.resolve(rest[0]));
  if (command === "stats") return stats(root);
  if (command !== "check")
    throw new Error(
      "usage: faction-grass.ts bake | check | sheet <out.png> | stats",
    );
  const problems = await factionGrassProblems(root);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  console.log("The faction grass tiles are what their recipes derive.");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "failed");
    process.exitCode = 1;
  });
