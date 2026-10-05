import { FACTION_IDS_V7, type FactionIdV7 } from "../engine/index";
import {
  navalArtSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
} from "../assets/chibi-art-v7";
import { CHIBI_FOREST_ART_SET_V7 } from "../assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../assets/chibi-mountain-ranges-manifest";

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

export function titleSceneV7(size: {
  readonly width: number;
  readonly height: number;
}): TitleSceneV7 {
  const width = Math.max(160, Math.floor(size.width));
  const height = Math.max(120, Math.floor(size.height));
  // Four rows of cells, the nearest at the bottom edge. A short canvas
  // overlaps them; a tall one leaves sky above the mountains.
  const step = clamp(Math.round((height - 210) / 3), 34, 72);
  const front = height - 50;
  const rows = [front - 3 * step, front - 2 * step, front - step, front];
  const [mountainRow, forestRow, backRow, frontRow] = rows as [
    number,
    number,
    number,
    number,
  ];
  const columns = Math.ceil(width / CELL);
  const offset = Math.round((columns * CELL - width) / 2);
  const columnCentre = (column: number): number =>
    column * CELL - offset + HALF;
  // The coast: the sea takes the east, one column on a narrow canvas.
  const seaColumns = width >= 480 ? 2 : 1;
  const firstSea = columns - seaColumns;
  const landWidth = columnCentre(firstSea) - HALF;

  const items: TitleSceneItemV7[] = [];
  const ground = (subject: ArtSubjectV7, column: number, cy: number): void => {
    items.push({
      kind: "SUBJECT",
      subject,
      at: { x: column, y: Math.round(cy / step) },
      cx: columnCentre(column),
      cy,
    });
  };
  // Ground, far to near; one more row under the front rank fills the edge.
  for (const [index, cy] of [...rows, front + step, front + 2 * step].entries())
    for (let column = 0; column < columns; column += 1)
      ground(
        column >= firstSea && index >= 2
          ? column === firstSea
            ? "TERRAIN:SHALLOW_WATER"
            : "TERRAIN:DEEP_WATER"
          : "TERRAIN:GRASS",
        column,
        cy,
      );

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

  // Woods at both ends of the second row, the city between them.
  const woods = CHIBI_FOREST_ART_SET_V7.pieces.filter(
    (piece) => piece.height <= 110,
  );
  const wood = (x: number, index: number): number => {
    const piece = woods[index % Math.max(1, woods.length)];
    if (piece === undefined) return 0;
    items.push({
      kind: "RASTER",
      url: piece.url,
      x,
      y: forestRow + HALF - piece.height,
      width: piece.width,
      height: piece.height,
    });
    return piece.width;
  };
  // Two ranks: the flagships behind, the Fighters in front.
  const flagships = spread(clamp(Math.floor(landWidth / 84), 2, 8), false);
  const fighters = spread(clamp(Math.floor(landWidth / 50), 3, 8), true);
  const FLAGSHIP_MARGIN = 46;
  // The city shows through a gap of the back rank, near the middle.
  const gap = Math.floor((flagships.length - 2) / 2);
  const cityX = Math.round(
    FLAGSHIP_MARGIN +
      ((landWidth - 2 * FLAGSHIP_MARGIN) * (gap + 0.5)) /
        (flagships.length - 1),
  );
  const woodWidth = Math.max(0, cityX - 56);
  for (
    let x = -offset - 8, index = 0;
    x + 60 < woodWidth && index < 6;
    index += 1
  )
    x += wood(x, woods.length - 1 - index) - 6;
  for (
    let x = cityX + 56, index = 0;
    x + 40 < width && index < 6 && woods.length > 0;
    index += 1
  )
    x += wood(x, index + 1) - 6;
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
    const span = landWidth - 2 * margin;
    factions.forEach((faction, index) => {
      items.push({
        kind: "SUBJECT",
        subject: unitArtSubjectV7({ role, form: "LAND", faction }),
        at: { x: 0, y: 0 },
        cx: Math.round(
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
    // Whole on a narrow canvas, whose last column is cut by the edge.
    cx: Math.min(
      columnCentre(firstSea) + (seaColumns > 1 ? HALF : 6),
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
