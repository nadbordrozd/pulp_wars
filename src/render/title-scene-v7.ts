import { OFFERED_FACTION_IDS_V7, type FactionIdV7 } from "../engine/index";

import { chibiAssetUrlsV7 } from "../assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../assets/chibi-art-manifest";
import { chibiDirectionArtAssetsV7 } from "../assets/chibi-direction-art-manifest";
import {
  navalArtSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
} from "../assets/chibi-art-v7";
import { CHIBI_FOREST_ART_SET_V7 } from "../assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../assets/chibi-mountain-ranges-manifest";
import {
  coastCellsV7,
  type CoastEntryV7,
  type CoastLayerKindV7,
} from "./canvas/coast-sand-v7";

/**
 * The factions of the title scene: the ones the setup screen offers. A
 * hidden faction (the Cultists until `pulp_wars-mch9.20`) has no art of its
 * own yet, so it stays off the front page.
 */
const FACTION_IDS_V7: readonly FactionIdV7[] = OFFERED_FACTION_IDS_V7;

/**
 * The title scene (bead pulp_wars-2yc.4): a small diorama behind the logo,
 * composed from the game's own art. This module is the pure part: for a
 * canvas of a given size (in master pixels) it lays out rows of ground, a
 * mountain range, forests, a city, a coast with a ship, and two ranks of
 * units, the flagship (Juggernaut) and the Fighter of as many factions as
 * the width holds. Nothing names a file: units, the city and the ground
 * are art subjects the board's resolvers draw (so redone art, a new
 * faction or a changed look shows up here), and the mountains and forests
 * are the composed pieces of the manifests, whatever their number.
 *
 * The layout re-flows instead of scaling: a narrow canvas has fewer
 * columns and units and no second column of sea, a short one squeezes its
 * rows together so the far rows peek over the near ones.
 *
 * The main menu stands over the scene (bead pulp_wars-2yc.18): `clearLeft`
 * is the width at the west edge its buttons cover, and the ranks and the
 * city keep east of it, on the land that is left.
 *
 * Bead pulp_wars-eu3r.6: the city stands on open ground (no tree overlaps
 * its cell; the woods come right up to it on both sides), and the bay has
 * the board's shoreline: the sand and surf of
 * src/render/canvas/coast-sand-v7.ts, cut from the same distance field
 * over the scene's grid of ground cells. The grid is flush with the east
 * edge, so the sea's columns are whole and the ship rides clear of the
 * shore; the woods stop at the coast, so no tree stands in the water.
 */
export type TitleSceneItemV7 =
  /** A registered raster, its owning cell's centre at (`cx`, `cy`). */
  | {
      readonly kind: "SUBJECT";
      readonly subject: ArtSubjectV7;
      /** Picks the cosmetic variant, like a board coordinate. */
      readonly at: { readonly x: number; readonly y: number };
      readonly cx: number;
      readonly cy: number;
      readonly faction?: FactionIdV7;
      /** A unit: it stands on a ground shadow and bobs when idle. */
      readonly unit?: { readonly afloat: boolean; readonly phase: number };
    }
  /** A composed piece of a manifest, drawn as it is. */
  | {
      readonly kind: "RASTER";
      readonly url: string;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  /**
   * The board's shoreline over a ground cell (coast-sand-v7): sand on land,
   * the waterline and surf on water. The cell's top-left is (`x`, `y`);
   * only its top `rows` show (a nearer row covers the rest), so the view
   * draws the layer's far band at the bottom of that strip and leaves out
   * its middle, which is empty but for the bands at the sides.
   */
  | {
      readonly kind: "COAST";
      readonly layer: CoastLayerKindV7;
      readonly neighbours: number;
      readonly phase: number;
      readonly x: number;
      readonly y: number;
      readonly rows: number;
    };

export interface TitleSceneCloudV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Master px per second, eastwards; nearer clouds are faster. */
  readonly speed: number;
}

export interface TitleSceneV7 {
  readonly width: number;
  readonly height: number;
  /** In drawing order: ground first, then back to front. */
  readonly items: readonly TitleSceneItemV7[];
  readonly clouds: readonly TitleSceneCloudV7[];
  /** The factions shown, back rank then front rank. */
  readonly flagships: readonly FactionIdV7[];
  readonly fighters: readonly FactionIdV7[];
}

const CELL = 80;
const HALF = CELL / 2;
/**
 * Half the width of the open ground round the city: no forest piece
 * overlaps its cell, and a strip of grass shows beside its walls (which
 * reach 45 px either side of its centre).
 */
export const CITY_CLEARING_V7 = 56;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** `count` factions spread over the frozen order, from `start`. */
function spread(count: number, reversed: boolean): FactionIdV7[] {
  const all = reversed ? [...FACTION_IDS_V7].reverse() : FACTION_IDS_V7;
  return Array.from(
    { length: count },
    (_, index) =>
      all[Math.floor((index * all.length) / count)] ?? ("ORIGINAL" as const),
  );
}

/**
 * The rows of a canvas `height` master px tall: four rows of cells, the
 * nearest at the bottom edge. A short canvas overlaps them; a tall one
 * leaves sky above the mountains.
 */
function sceneRows(height: number): {
  readonly step: number;
  readonly rows: readonly [number, number, number, number];
} {
  const step = clamp(Math.round((height - 210) / 3), 34, 72);
  const front = height - 50;
  return {
    step,
    rows: [front - 3 * step, front - 2 * step, front - step, front],
  };
}

/**
 * Where the scene's ground starts (master px from the top) on a canvas of
 * this height: the top of the farthest row of grass, under the range. The
 * loading screen's plain backdrop puts its horizon here (bead
 * pulp_wars-502h), so the scene drawn over it later does not move it.
 */
export function titleSceneHorizonV7(height: number): number {
  return sceneRows(Math.max(120, Math.floor(height))).rows[0] - HALF;
}

export function titleSceneV7(size: {
  readonly width: number;
  readonly height: number;
  /** Master pixels at the west edge to keep free of units (the menu). */
  readonly clearLeft?: number;
}): TitleSceneV7 {
  const width = Math.max(160, Math.floor(size.width));
  const height = Math.max(120, Math.floor(size.height));
  const { step, rows } = sceneRows(height);
  const [mountainRow, forestRow, backRow, frontRow] = rows;
  const columns = Math.ceil(width / CELL);
  // The grid is flush with the east edge, so the sea's columns are whole
  // and the ship rides in water at any width; the edge cuts the west one.
  const offset = columns * CELL - width;
  const columnCentre = (column: number): number =>
    column * CELL - offset + HALF;
  const wanted = Math.max(0, Math.floor(size.clearLeft ?? 0));
  // The coast: the sea takes the east, one column on a narrow canvas or
  // where the menu leaves the ranks little land.
  const seaColumns =
    width >= 480 && (wanted === 0 || width - 2 * CELL - wanted >= 280) ? 2 : 1;
  const firstSea = columns - seaColumns;
  const landWidth = columnCentre(firstSea) - HALF;
  // The ranks stand between the menu and the coast; a menu that would
  // leave them no room (a narrow canvas) is ignored: it sits in the sky.
  const west = landWidth - wanted >= 120 ? wanted : 0;
  const rankWidth = landWidth - west;

  const items: TitleSceneItemV7[] = [];
  // Ground, far to near; one more row under the front rank fills the edge.
  const groundRows = [...rows, frontRow + step, frontRow + 2 * step];
  const groundSubject = (column: number, row: number): ArtSubjectV7 =>
    column >= firstSea && row >= 2
      ? column === firstSea
        ? "TERRAIN:SHALLOW_WATER"
        : "TERRAIN:DEEP_WATER"
      : "TERRAIN:GRASS";
  // The shoreline of that grid, as the board cuts it (row index as y).
  const coast = coastCellsV7(
    groundRows.flatMap((_, row) =>
      Array.from({ length: columns }, (_, column): CoastEntryV7 => ({
        kind: "TERRAIN",
        at: { x: column, y: row },
        artSubject: groundSubject(column, row),
      })),
    ),
  );
  for (const [row, cy] of groundRows.entries()) {
    for (let column = 0; column < columns; column += 1)
      items.push({
        kind: "SUBJECT",
        subject: groundSubject(column, row),
        at: { x: column, y: Math.round(cy / step) },
        cx: columnCentre(column),
        cy,
      });
    // Over the row's ground, under the next row (which covers its foot).
    for (let column = 0; column < columns; column += 1) {
      const cell = coast.get(`${column},${row}`);
      if (cell === undefined) continue;
      items.push({
        kind: "COAST",
        layer: cell.layer,
        neighbours: cell.neighbours,
        phase: cell.phase,
        x: columnCentre(column) - HALF,
        y: cy - HALF,
        rows: row < groundRows.length - 1 ? Math.min(step, CELL) : CELL,
      });
    }
  }

  // The range on the horizon: tall massif pieces side by side.
  const tall = CHIBI_MOUNTAIN_ART_SET_V7.pieces.filter((piece) => piece.tall);
  const range = tall.length > 0 ? tall : CHIBI_MOUNTAIN_ART_SET_V7.pieces;
  for (let x = -offset, index = 0; x < width && range.length > 0; index += 1) {
    const piece = range[(index * 5 + 2) % range.length];
    if (piece === undefined) break;
    items.push({
      kind: "RASTER",
      url: piece.url,
      x,
      y: mountainRow + HALF - piece.height,
      width: piece.width,
      height: piece.height,
    });
    x += piece.width;
  }

  // Woods along the second row, the city in a clearing between them.
  const woods = CHIBI_FOREST_ART_SET_V7.pieces.filter(
    (piece) => piece.height <= 110,
  );
  const narrowest = Math.min(...woods.map((piece) => piece.width));
  const placeWood = (x: number, piece: (typeof woods)[number]): void => {
    items.push({
      kind: "RASTER",
      url: piece.url,
      x,
      y: forestRow + HALF - piece.height,
      width: piece.width,
      height: piece.height,
    });
  };
  /**
   * The piece next in turn, or the narrowest where it does not fit in
   * `room` (none when not even that fits).
   */
  const pick = (order: readonly number[], index: number, room: number) => {
    const next = woods[order[index % order.length] ?? 0];
    if (next !== undefined && next.width <= room) return next;
    return narrowest <= room
      ? woods.find((each) => each.width === narrowest)
      : undefined;
  };
  /** Woods westwards from `to`, until past the canvas's west edge. */
  const woodsWestOf = (to: number, order: readonly number[]): void => {
    for (let end = to, index = 0; end > -offset && index < 16; index += 1) {
      const piece = pick(order, index, Infinity);
      if (piece === undefined) break;
      placeWood(end - piece.width, piece);
      end -= piece.width - 6;
    }
  };
  /** Woods eastwards from `from` to `to`, each piece whole inside. */
  const woodsEastOf = (
    from: number,
    to: number,
    order: readonly number[],
  ): void => {
    let x = from;
    for (let index = 0; index < 16; index += 1) {
      const piece = pick(order, index, to - x);
      if (piece === undefined) break;
      placeWood(x, piece);
      x += piece.width - 6;
    }
    // Room left before the shore for no piece: one clump (a single group
    // of the same trees, its foot on the pieces' tree line).
    const clump = [...CHIBI_FOREST_ART_SET_V7.clumps]
      .sort((one, other) => other.width - one.width)
      .find((each) => each.width <= to - x);
    if (clump !== undefined)
      items.push({
        kind: "RASTER",
        url: clump.url,
        x,
        y: forestRow + HALF - 3 - clump.height,
        width: clump.width,
        height: clump.height,
      });
  };
  // Two ranks: the flagships behind, the Fighters in front.
  // Beside the menu a short rank may be one flagship and two Fighters.
  const flagships = spread(
    clamp(Math.floor(rankWidth / 84), west > 0 ? 1 : 2, 8),
    false,
  );
  const fighters = spread(
    clamp(Math.floor(rankWidth / 50), west > 0 ? 2 : 3, 8),
    true,
  );
  const FLAGSHIP_MARGIN = 46;
  // The city shows through a gap of the back rank, near the middle.
  const gap = Math.floor((flagships.length - 2) / 2);
  const cityX = Math.round(
    flagships.length < 2
      ? // Its walls east of the menu, however short the strip.
        west + Math.max(rankWidth * 0.22, 32)
      : west +
          FLAGSHIP_MARGIN +
          ((rankWidth - 2 * FLAGSHIP_MARGIN) * (gap + 0.5)) /
            (flagships.length - 1),
  );
  // The city stands on open ground: no tree overlaps its cell; the woods
  // come right up to it on both sides, and stop at the coast, whose sand
  // and surf they would stand in.
  const turns = woods.map((_, index) => index);
  woodsWestOf(cityX - CITY_CLEARING_V7, [...turns].reverse());
  woodsEastOf(cityX + CITY_CLEARING_V7, landWidth, [...turns.slice(1), 0]);
  items.push({
    kind: "SUBJECT",
    subject: "CITY:3",
    at: { x: 0, y: 0 },
    cx: cityX,
    cy: forestRow + 4,
    faction: "ORIGINAL",
  });

  const rank = (
    factions: readonly FactionIdV7[],
    role: "JUGGERNAUT" | "FIGHTER",
    cy: number,
    margin: number,
  ): void => {
    const span = rankWidth - 2 * margin;
    factions.forEach((faction, index) => {
      items.push({
        kind: "SUBJECT",
        subject: unitArtSubjectV7({ role, form: "LAND", faction }),
        at: { x: 0, y: 0 },
        cx: Math.round(
          west +
            margin +
            (factions.length === 1
              ? span / 2
              : (span * index) / (factions.length - 1)),
        ),
        cy,
        faction,
        unit: { afloat: false, phase: (index * 0.37 + (cy % 7) * 0.11) % 1 },
      });
    });
  };
  rank(flagships, "JUGGERNAUT", backRow - 6, FLAGSHIP_MARGIN);
  // A ship rides the sea between the ranks.
  items.push({
    kind: "SUBJECT",
    subject: navalArtSubjectV7("ORIGINAL", "UNIT", "BATTLESHIP"),
    at: { x: 0, y: 0 },
    // Clear of the shore, its bowsprit inside the east edge.
    cx: Math.min(
      columnCentre(firstSea) + (seaColumns > 1 ? HALF : 0),
      width - 42,
    ),
    cy: backRow + Math.round(step / 2) - 8,
    faction: "ORIGINAL",
    unit: { afloat: true, phase: 0.5 },
  });
  rank(fighters, "FIGHTER", frontRow - 4, 30);

  // Clouds in the sky above the range, the nearer ones lower and faster.
  const sky = Math.max(24, mountainRow - 70);
  const clouds: TitleSceneCloudV7[] = Array.from(
    { length: clamp(Math.round(width / 150), 2, 6) },
    (_, index) => ({
      x: Math.round(((index * 0.618 + 0.13) % 1) * width),
      y: Math.round(6 + ((index * 0.41) % 1) * (sky - 6)),
      width: 40 + ((index * 23) % 36),
      height: 15 + ((index * 5) % 6),
      speed: 2 + (index % 3) * 1.5,
    }),
  );
  return { width, height, items, clouds, flagships, fighters };
}

/** Every composed piece the scene can draw (for the preload inventory). */
export function titleSceneRasterUrlsV7(): string[] {
  return [
    ...CHIBI_MOUNTAIN_ART_SET_V7.pieces,
    ...CHIBI_FOREST_ART_SET_V7.pieces,
    ...CHIBI_FOREST_ART_SET_V7.clumps,
  ].map((piece) => piece.url);
}

/** Every art subject the scene can ask for, at any size. */
export function titleSceneSubjectsV7(): ArtSubjectV7[] {
  return [
    "TERRAIN:GRASS",
    "TERRAIN:SHALLOW_WATER",
    "TERRAIN:DEEP_WATER",
    "CITY:3",
    navalArtSubjectV7("ORIGINAL", "UNIT", "BATTLESHIP"),
    ...FACTION_IDS_V7.flatMap((faction) =>
      (["JUGGERNAUT", "FIGHTER"] as const).map((role) =>
        unitArtSubjectV7({ role, form: "LAND", faction }),
      ),
    ),
  ];
}

/**
 * Every file the scene can draw, at any size (bead pulp_wars-502h): the
 * composed pieces and every file (master, densities, mask, layers) of each
 * registered raster of a subject it asks for, in the default registry and
 * the direction's. The loading screen shows the scene, so the game's start
 * preloads these first (src/app/v7-preload-boot.ts): about a tenth of the
 * look, after which the scene is drawn whole while the rest loads.
 */
export function titleSceneAssetUrlsV7(): string[] {
  const subjects = new Set<string>(titleSceneSubjectsV7());
  return [
    ...new Set([
      ...[...CHIBI_ART_ASSETS_V7, ...chibiDirectionArtAssetsV7()]
        .filter((asset) => subjects.has(asset.subject))
        .flatMap(chibiAssetUrlsV7),
      ...titleSceneRasterUrlsV7(),
    ]),
  ];
}
