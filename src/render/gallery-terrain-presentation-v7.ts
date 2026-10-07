import { FACTION_IDS_V7, type FactionIdV7 } from "../engine/index";
import { CHIBI_ART_ASSETS_V7 } from "../assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiVariantV7,
  territoryGroundV7,
  territoryTerrainSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiPointV7,
} from "../assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../assets/chibi-direction-art-manifest";
import { CHIBI_FOREST_ART_SET_V7 } from "../assets/chibi-forest-pieces-manifest";
import {
  CHIBI_MOUNTAIN_ART_SET_V7,
  CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7,
} from "../assets/chibi-mountain-ranges-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../assets/faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "../assets/faction-grass-manifest";
import { factionForestIdV7 } from "./canvas/faction-forests-v7";
import { factionNameV7 } from "./undead-presentation-v7";

/**
 * The Gallery's Terrain tab (bead pulp_wars-2yc.3): the ground of the map
 * side by side, one row per kind of terrain and one column per faction
 * where a faction draws it in a look of its own. This module is the pure
 * part: the rows, the cells, what each swatch is made of and the list of
 * every piece of a kind. Everything is read from the art manifests (the
 * variants of a subject, the composed Forest pieces, the massif set, the
 * faction grass tiles), so new or redone art shows up without a change
 * here. The DOM (src/render/dom/gallery-v7.ts) draws it; the sample patch
 * of a cell's detail is a real board (gallery-terrain-sample-v7.ts).
 */

export type GalleryTerrainRowIdV7 =
  "GRASS" | "FOREST" | "MOUNTAIN" | "WATER" | "ICE" | "RIFT";

export const GALLERY_TERRAIN_ROWS_V7: readonly GalleryTerrainRowIdV7[] = [
  "GRASS",
  "FOREST",
  "MOUNTAIN",
  "WATER",
  "ICE",
  "RIFT",
];

const ROW_NAMES: Readonly<Record<GalleryTerrainRowIdV7, string>> = {
  GRASS: "Grass",
  FOREST: "Forest",
  MOUNTAIN: "Mountain",
  WATER: "Water",
  ICE: "Sea Ice",
  RIFT: "Rift",
};

export function galleryTerrainRowLabelV7(row: GalleryTerrainRowIdV7): string {
  return ROW_NAMES[row];
}

/**
 * How a faction has a kind of terrain: in a look of its OWN, the SAME as
 * the default (the Human column), or not at all (NONE: only the Ice Folk
 * make sea ice).
 *
 * This is the one place a faction's own terrain is declared. When faction
 * forests (or mountains) exist, name the faction here and give it its
 * swatch and pieces below; the table, the filters, the stepping and the
 * sample board follow.
 */
export type GalleryTerrainLookV7 = "OWN" | "SAME" | "NONE";

const GRASS_TILE_FACTIONS: ReadonlySet<string> = new Set(
  FACTION_GRASS_TILES_V7.map((tile) => tile.id),
);

export function galleryTerrainLookV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7,
): GalleryTerrainLookV7 {
  if (row === "ICE") return faction === "ICE_FOLK" ? "OWN" : "NONE";
  if (faction === "ORIGINAL") return "OWN";
  if (row === "GRASS")
    return GRASS_TILE_FACTIONS.has(faction) ||
      faction === "ICE_FOLK" ||
      territoryGroundV7(faction) !== null
      ? "OWN"
      : "SAME";
  if (row === "FOREST")
    return factionForestIdV7(faction) !== null ||
      territoryGroundV7(faction) !== null
      ? "OWN"
      : "SAME";
  return "SAME";
}

/**
 * True when some faction differs on this terrain: the row then has one
 * column per faction, else one cell across the row.
 */
export function galleryTerrainPerFactionV7(
  row: GalleryTerrainRowIdV7,
): boolean {
  return FACTION_IDS_V7.some(
    (faction) =>
      faction !== "ORIGINAL" && galleryTerrainLookV7(row, faction) !== "SAME",
  );
}

// ---------- Swatches ----------

/** One layer of a swatch, bottom first. */
export type GalleryTerrainLayerV7 =
  /** A registered terrain raster; `at` picks its cosmetic variant. */
  | {
      readonly kind: "SUBJECT";
      readonly subject: ArtSubjectV7;
      readonly at: ChibiPointV7;
    }
  /** A manifest raster drawn as it is (a composed piece, a grass tile). */
  | {
      readonly kind: "RASTER";
      readonly url: string;
      readonly width: number;
      readonly height: number;
    }
  /** The Ice Folk Snow over the layers below. */
  | { readonly kind: "SNOW"; readonly variant: number }
  /** A sea ice sheet cut to a floe, snow-dusted when `permanent`. */
  | {
      readonly kind: "SEA_ICE";
      readonly sheet: ArtSubjectV7;
      readonly permanent: boolean;
    };

/**
 * A picture of terrain. `TILE` is one board cell with the art's overflow
 * (the Gallery's tile box); `PIECE` is a composed piece at its own size.
 */
export interface GalleryTerrainSwatchV7 {
  readonly id: string;
  readonly box:
    | { readonly kind: "TILE" }
    | {
        readonly kind: "PIECE";
        readonly width: number;
        readonly height: number;
      };
  readonly layers: readonly GalleryTerrainLayerV7[];
}

const DEFAULT_REGISTRY = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
const DIRECTION_REGISTRY = chibiDirectionArtRegistryV7();

/**
 * The rasters the live look draws for a terrain subject: a faction's own
 * ground comes from the direction's registry, shared terrain from the
 * default one (createDirectedChibiArtV7's rule for terrain).
 */
export function galleryTerrainVariantsV7(
  subject: ArtSubjectV7,
): readonly ChibiArtAssetV7[] {
  const own =
    subject.split(":").length > 2 ? DIRECTION_REGISTRY.variants(subject) : [];
  return own.length > 0 ? own : DEFAULT_REGISTRY.variants(subject);
}

/** A cell coordinate at which the board draws each variant of a subject. */
function variantPoints(
  subject: ArtSubjectV7,
): readonly { readonly asset: ChibiArtAssetV7; readonly at: ChibiPointV7 }[] {
  const variants = galleryTerrainVariantsV7(subject);
  return variants.flatMap((asset) => {
    for (let x = 0; x < 64; x += 1)
      if (chibiVariantV7(variants, { x, y: 0 })?.id === asset.id)
        return [{ asset, at: { x, y: 0 } }];
    return [];
  });
}

const tile = (
  id: string,
  layers: readonly GalleryTerrainLayerV7[],
): GalleryTerrainSwatchV7 => ({ id, box: { kind: "TILE" }, layers });

const subjectLayer = (
  subject: ArtSubjectV7,
  at: ChibiPointV7 = { x: 0, y: 0 },
): GalleryTerrainLayerV7 => ({ kind: "SUBJECT", subject, at });

/** One tile per variant of a subject, over `under` when given. */
function subjectTiles(
  subject: ArtSubjectV7,
  under: readonly GalleryTerrainLayerV7[] = [],
): GalleryTerrainSwatchV7[] {
  return variantPoints(subject).map(({ asset, at }) =>
    tile(asset.id, [...under, subjectLayer(subject, at)]),
  );
}

const RIFT_SUBJECTS: readonly ArtSubjectV7[] = [
  "TERRAIN:RIFT_H_WEST",
  "TERRAIN:RIFT_H_MIDDLE",
  "TERRAIN:RIFT_H_EAST",
  "TERRAIN:RIFT_V_NORTH",
  "TERRAIN:RIFT_V_MIDDLE",
  "TERRAIN:RIFT_V_SOUTH",
];

const SEA_ICE: readonly {
  readonly water: ArtSubjectV7;
  readonly sheet: ArtSubjectV7;
}[] = [
  { water: "TERRAIN:SHALLOW_WATER", sheet: "TERRAIN:ICE_SHALLOW" },
  { water: "TERRAIN:DEEP_WATER", sheet: "TERRAIN:ICE_DEEP" },
];

/**
 * Every piece of a terrain as a faction has it, the cell's own picture
 * first: the variants of its tile, then the composed pieces the board
 * builds areas from. `faction` null is the cell every faction shares.
 */
export function galleryTerrainPiecesV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7 | null,
): readonly GalleryTerrainSwatchV7[] {
  const ground = territoryGroundV7(faction);
  if (row === "GRASS") {
    if (faction === "ICE_FOLK")
      return [0, 1, 2, 3].map((variant) =>
        tile(`snow-${variant}`, [
          subjectLayer("TERRAIN:GRASS"),
          { kind: "SNOW", variant },
        ]),
      );
    const baked = FACTION_GRASS_TILES_V7.filter(
      (entry) => entry.id === faction && entry.toned !== true,
    );
    if (baked.length > 0)
      return baked.map((entry) =>
        tile(`${entry.id}-${entry.variant}`, [
          { kind: "RASTER", url: entry.url, width: 80, height: 80 },
        ]),
      );
    return subjectTiles(territoryTerrainSubjectV7("TERRAIN:GRASS", ground));
  }
  const forest = row === "FOREST" ? factionForestIdV7(faction) : null;
  if (forest !== null) {
    // A faction's forest (pulp_wars-2yc.2): a single piece on the
    // faction's ground first, then every piece and seam clump of its set.
    const set = FACTION_FOREST_ART_SETS_V7[forest];
    const grass = FACTION_GRASS_TILES_V7.find(
      (entry) => entry.id === forest && entry.toned !== true,
    );
    const single = set.pieces.find((piece) => piece.shape === "1x1");
    const rasterLayer = (piece: {
      readonly url: string;
      readonly width: number;
      readonly height: number;
    }): GalleryTerrainLayerV7 => ({
      kind: "RASTER",
      url: piece.url,
      width: piece.width,
      height: piece.height,
    });
    return [
      ...(single === undefined
        ? []
        : [
            tile(`${forest}-forest`, [
              grass === undefined
                ? subjectLayer(
                    territoryTerrainSubjectV7("TERRAIN:GRASS", ground),
                  )
                : { kind: "RASTER", url: grass.url, width: 80, height: 80 },
              // The tundra forest stands on the Ice Folk Snow.
              ...(forest === "ICE_FOLK"
                ? [{ kind: "SNOW", variant: 0 } as const]
                : []),
              rasterLayer(single),
            ]),
          ]),
      ...[...set.pieces, ...set.clumps].map(
        (piece): GalleryTerrainSwatchV7 => ({
          id: piece.id,
          box: { kind: "PIECE", width: piece.width, height: piece.height },
          layers: [rasterLayer(piece)],
        }),
      ),
    ];
  }
  if (row === "FOREST") {
    const own = subjectTiles(
      territoryTerrainSubjectV7("TERRAIN:FOREST", ground),
    );
    // The composed pieces are the shared Forest's; a faction forest set
    // would be listed here for its faction.
    if (ground !== null) return own;
    return [
      ...own,
      ...[
        ...CHIBI_FOREST_ART_SET_V7.pieces,
        ...CHIBI_FOREST_ART_SET_V7.clumps,
      ].map((piece): GalleryTerrainSwatchV7 => ({
        id: piece.id,
        box: { kind: "PIECE", width: piece.width, height: piece.height },
        layers: [
          {
            kind: "RASTER",
            url: piece.url,
            width: piece.width,
            height: piece.height,
          },
        ],
      })),
    ];
  }
  if (row === "MOUNTAIN") {
    // The cell's own picture: a single low mountain of the massif set on
    // Grass, as the board draws it (pulp_wars-2yc.1), then every piece.
    const single = CHIBI_MOUNTAIN_ART_SET_V7.pieces.find(
      (piece) => piece.columns === 1 && !piece.tall,
    );
    return [
      ...(single === undefined
        ? subjectTiles("TERRAIN:MOUNTAIN")
        : [
            tile("mountain", [
              subjectLayer("TERRAIN:GRASS"),
              {
                kind: "RASTER",
                url: single.url,
                width: single.width,
                height: single.height,
              },
            ]),
          ]),
      ...CHIBI_MOUNTAIN_ART_SET_V7.pieces.map(
        (piece): GalleryTerrainSwatchV7 => ({
          id: piece.id,
          box: { kind: "PIECE", width: piece.width, height: piece.height },
          layers: [
            {
              kind: "RASTER",
              url: piece.url,
              width: piece.width,
              height: piece.height,
            },
          ],
        }),
      ),
      // The mined mountains of the massif set, as whole masters.
      ...CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7.map(
        (asset): GalleryTerrainSwatchV7 => ({
          id: asset.id,
          box: { kind: "PIECE", width: asset.width, height: asset.height },
          layers: [
            {
              kind: "RASTER",
              url: asset.url,
              width: asset.width,
              height: asset.height,
            },
          ],
        }),
      ),
    ];
  }
  if (row === "WATER")
    return [
      ...subjectTiles("TERRAIN:SHALLOW_WATER"),
      ...subjectTiles("TERRAIN:DEEP_WATER"),
      // Every Fish the board draws, on the Shallow Water it lives on
      // (bead pulp_wars-2yc.16); a tile picks one by its coordinates.
      ...subjectTiles("RESOURCE:FISH", [subjectLayer("TERRAIN:SHALLOW_WATER")]),
    ];
  if (row === "ICE")
    return SEA_ICE.flatMap(({ water, sheet }) =>
      [true, false].map((permanent) =>
        tile(`${sheet}-${permanent ? "permanent" : "melting"}`, [
          subjectLayer(water),
          { kind: "SEA_ICE", sheet, permanent },
        ]),
      ),
    );
  return RIFT_SUBJECTS.flatMap((subject) =>
    subjectTiles(subject, [subjectLayer("TERRAIN:GRASS")]),
  );
}

/** Every raster URL a swatch names directly (for the preload inventory). */
export function galleryTerrainRasterUrlsV7(
  swatch: GalleryTerrainSwatchV7,
): string[] {
  return swatch.layers.flatMap((layer) =>
    layer.kind === "RASTER"
      ? [layer.url]
      : layer.kind === "SUBJECT"
        ? galleryTerrainVariantsV7(layer.subject).map((asset) => asset.url)
        : layer.kind === "SEA_ICE"
          ? galleryTerrainVariantsV7(layer.sheet).map((asset) => asset.url)
          : [],
  );
}

// ---------- Cells ----------

export type GalleryTerrainCellV7 =
  | {
      readonly kind: "OWN";
      readonly row: GalleryTerrainRowIdV7;
      /** Null for the cell every faction shares. */
      readonly faction: FactionIdV7 | null;
      readonly name: string;
      readonly swatch: GalleryTerrainSwatchV7;
    }
  | {
      /** SAME: drawn like the default. NONE: the faction has none. */
      readonly kind: "SAME" | "NONE";
      readonly row: GalleryTerrainRowIdV7;
      readonly faction: FactionIdV7;
    };

/** The name of a terrain as a faction has it ("Snow" for the Ice Folk). */
export function galleryTerrainNameV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7 | null,
): string {
  return row === "GRASS" && faction === "ICE_FOLK" ? "Snow" : ROW_NAMES[row];
}

export const GALLERY_TERRAIN_SAME_TEXT_V7 = "Same as default";
export const GALLERY_TERRAIN_NONE_TEXT_V7 = "None";

export function galleryTerrainCellV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7 | null,
): GalleryTerrainCellV7 {
  const look = faction === null ? "OWN" : galleryTerrainLookV7(row, faction);
  if (look !== "OWN" && faction !== null) return { kind: look, row, faction };
  const swatch = galleryTerrainPiecesV7(row, faction)[0] ?? tile(row, []);
  return {
    kind: "OWN",
    row,
    faction,
    name: galleryTerrainNameV7(row, faction),
    swatch,
  };
}

export interface GalleryTerrainDetailsV7 {
  readonly name: string;
  /** The faction, or null for terrain every faction shares. */
  readonly factionName: string | null;
  readonly kicker: string;
  readonly pieces: readonly GalleryTerrainSwatchV7[];
}

export function galleryTerrainDetailsV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7 | null,
): GalleryTerrainDetailsV7 {
  return {
    name: galleryTerrainNameV7(row, faction),
    factionName: faction === null ? null : factionNameV7(faction),
    kicker: faction === null ? "Every faction" : "Terrain",
    pieces: galleryTerrainPiecesV7(row, faction),
  };
}
