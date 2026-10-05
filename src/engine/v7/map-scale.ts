import {
  FACTION_IDS_V7,
  type BoardSizeV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "./types";

/**
 * Map scale (docs/product/RULESET_7_MAP_SCALE.md): the pure arithmetic of
 * board sizes, seats, and settlements. Nothing here draws or reads a board:
 * the map generator, the setup validation, the headless tools, and the setup
 * screen all read the same numbers.
 */

/** The five generated map types (never the Showcase or a mission). */
export type GeneratedMapTypeV7 = Exclude<MapTypeV7, "SHOWCASE" | "MISSION">;
export const GENERATED_MAP_TYPES_V7: readonly GeneratedMapTypeV7[] =
  Object.freeze(["DRY_LAND", "PANGEA", "CONTINENTS", "ARCHIPELAGO", "LAKES"]);
/** The board widths, ascending. */
export const BOARD_SIZES_V7: readonly BoardSizeV7[] = Object.freeze([
  11, 14, 16, 20, 25,
]);
/**
 * Map scale section 5.1: the land tiles per settlement (capitals plus
 * villages) of each generated map type, close to Polytopia's spacing rule
 * measured on Pulp Wars boards.
 */
export const LAND_PER_SETTLEMENT_V7: Readonly<
  Record<GeneratedMapTypeV7, number>
> = Object.freeze({
  DRY_LAND: 15,
  LAKES: 13,
  PANGEA: 12,
  CONTINENTS: 12,
  ARCHIPELAGO: 11,
});
/** Map scale section 5.3: every two settlements are at least this far apart. */
export const SETTLEMENT_SPACING_V7 = 3;
/** Map scale section 5.3: a capital is at least this far from the edge. */
export const CAPITAL_EDGE_MARGIN_V7 = 2;
/** Map scale section 5.3: a village is at least this far from the edge. */
export const VILLAGE_EDGE_MARGIN_V7 = 1;
/** Map scale section 3.1: each player's square is this many land tiles. */
export const LAND_PER_SEAT_V7 = 9;
/** Map scale section 6.2: the auto size gives each seat this many tiles. */
export const AUTO_SIZE_TILES_PER_SEAT_V7 = 56;
/** The Showcase board holds at most this many seats (four strips). */
export const SHOWCASE_MAX_SEATS_V7 = 4;

/** Whether `mapType` is one of the five generated map types. */
export function isGeneratedMapTypeV7(
  mapType: MapTypeV7,
): mapType is GeneratedMapTypeV7 {
  return mapType !== "SHOWCASE" && mapType !== "MISSION";
}

/**
 * Pangea land cells under the coast ring: 72% of the board, capped at 90% of
 * the interior (the board without its edge ring) so that small boards keep
 * some water inside the ring: 72 of 121 cells on 11 x 11, 129 of 196 on
 * 14 x 14, 176 of 256 on 16 x 16, and 72% (288 and 450) on 20 and 25.
 */
export function pangeaLandCountV7(width: number, height: number): number {
  return Math.min(
    Math.floor(width * height * 0.72),
    Math.floor((width - 2) * (height - 2) * 0.9),
  );
}

/** The land cells of the Continents (56%) and Archipelago (40%) masks. */
export function landmassLandCountV7(
  width: number,
  height: number,
  mapType: "CONTINENTS" | "ARCHIPELAGO",
): number {
  return Math.round(width * height * (mapType === "CONTINENTS" ? 0.56 : 0.4));
}

/**
 * The water cells of the Lakes mask: the two fixed lakes of the 11 x 11
 * board (4 x 4 and 3 x 3), otherwise 20% of the board rounded up.
 */
export function lakeWaterCountV7(width: number, height: number): number {
  return width === 11 ? 25 : Math.ceil(width * height * 0.2);
}

/**
 * Map scale section 5.2: the land tiles `L` of a generated map type at a
 * width, fixed by the generator on every seed: the whole board on Dry Land,
 * the coast-ring count on Pangea, 56% on Continents, 40% on Archipelago, and
 * the board minus its lakes on Lakes.
 */
export function landTileCountV7(
  width: number,
  mapType: GeneratedMapTypeV7,
): number {
  const area = width * width;
  return mapType === "DRY_LAND"
    ? area
    : mapType === "PANGEA"
      ? pangeaLandCountV7(width, width)
      : mapType === "LAKES"
        ? area - lakeWaterCountV7(width, width)
        : landmassLandCountV7(width, width, mapType);
}

/**
 * Map scale section 5.1: the settlements `S` (capitals plus villages) of a
 * generated map, `roundHalfUp(L / LPS)`. It depends only on the width and
 * the map type, never on the seat count: the density is constant.
 */
export function settlementCountV7(
  width: number,
  mapType: GeneratedMapTypeV7,
): number {
  const land = landTileCountV7(width, mapType);
  const perSettlement = LAND_PER_SETTLEMENT_V7[mapType];
  return Math.floor((2 * land + perSettlement) / (2 * perSettlement));
}

/**
 * Map scale section 3: the players `P(w, type)` a generated board holds by
 * the user's rule (a 3 x 3 land square per player inside a 1-tile margin):
 * `min(C(w), floor(L / 9))` with `C(w) = floor((w - 2) / 3)^2`, and on an
 * Archipelago also at most `floor((w - 1) / 4)^2` islands (squares at pitch
 * 4 inside a 1-tile water edge). It does not depend on the faction count.
 */
export function seatCapacityV7(
  width: number,
  mapType: GeneratedMapTypeV7,
): number {
  const squares = Math.floor((width - 2) / 3) ** 2;
  const byLand = Math.floor(landTileCountV7(width, mapType) / LAND_PER_SEAT_V7);
  const capacity = Math.min(squares, byLand);
  const byRule =
    mapType === "ARCHIPELAGO"
      ? Math.min(capacity, Math.floor((width - 1) / 4) ** 2)
      : capacity;
  const measured = MEASURED_SEAT_CAPACITY_V7.find(
    (cell) => cell.width === width && cell.mapType === mapType,
  );
  return measured === undefined ? byRule : Math.min(byRule, measured.seats);
}

/**
 * Map scale section 3.4 (amended 2026-10-05 after measurement, provisional
 * until the user rules): the cells whose rule capacity the generator cannot
 * reach, with the most seats that generate on every seed of the validation
 * corpus.
 *
 * - 11 x 11 Lakes holds 2 (the rule says 9). Its two fixed lakes stand on
 *   two opposite corner domains, and any three corner domains include one
 *   of them; with five or more seats the ring needs both, or leaves no room
 *   for 25 Water tiles.
 * - 11 x 11 Continents holds 6 (the rule says 7). Seven capitals stand at
 *   pitch 3 around the ring, and the Water between two landmasses then
 *   takes a tile out of a capital's own square.
 */
export const MEASURED_SEAT_CAPACITY_V7: readonly {
  readonly width: BoardSizeV7;
  readonly mapType: GeneratedMapTypeV7;
  readonly seats: number;
}[] = Object.freeze([
  Object.freeze({ width: 11, mapType: "LAKES", seats: 2 } as const),
  Object.freeze({ width: 11, mapType: "CONTINENTS", seats: 6 } as const),
]);

/**
 * Map scale section 6.1: the most seats any match may have, the number of
 * registered factions (every seat plays a different one).
 */
export function maxSeatCountV7(): number {
  return FACTION_IDS_V7.length;
}

/**
 * Map scale section 3.3: the most seats a setup of this width and map type
 * may have: `min(F, P(w, type))` on a generated map, and 4 on the Showcase
 * (four strips on its fixed 16 x 16 board). A mission fixes its own seats
 * (two to four), so its width and type bound nothing here: 4.
 */
export function maxSeatsV7(width: number, mapType: MapTypeV7): number {
  return isGeneratedMapTypeV7(mapType)
    ? Math.min(maxSeatCountV7(), seatCapacityV7(width, mapType))
    : Math.min(maxSeatCountV7(), SHOWCASE_MAX_SEATS_V7);
}

/**
 * Map scale section 3.3: whether `seats` players (2 or more) may play this
 * width and map type.
 */
export function seatCountAllowedV7(
  width: number,
  mapType: MapTypeV7,
  seats: number,
): boolean {
  return (
    Number.isSafeInteger(seats) &&
    seats >= 2 &&
    seats <= maxSeatsV7(width, mapType) &&
    (mapType !== "SHOWCASE" || width === 16)
  );
}

/**
 * Map scale section 6.3: the board widths `seats` players may play on this
 * map type, ascending. Empty when no width holds them (more seats than
 * factions, or more than four on the Showcase).
 */
export function allowedBoardSizesV7(
  mapType: MapTypeV7,
  seats: number,
): readonly BoardSizeV7[] {
  return BOARD_SIZES_V7.filter((width) =>
    seatCountAllowedV7(width, mapType, seats),
  );
}

/**
 * Map scale section 6.2: the auto size, the smallest allowed width whose
 * board has at least 56 tiles per seat (11 / 14 / 16 for 2 / 3 / 4 seats, 20
 * for 5 to 7, 25 for 8 and 9), else the largest allowed width, or null when
 * no width is allowed.
 */
export function autoBoardSizeV7(
  seats: number,
  mapType: MapTypeV7 = "DRY_LAND",
): BoardSizeV7 | null {
  const allowed = allowedBoardSizesV7(mapType, seats);
  return (
    allowed.find(
      (width) => width * width >= AUTO_SIZE_TILES_PER_SEAT_V7 * seats,
    ) ??
    allowed.at(-1) ??
    null
  );
}

/**
 * Map scale section 5.1: the neutral villages of a generated board,
 * `max(0, S - N)`.
 */
export function generatedVillageCountV7(
  width: number,
  mapType: GeneratedMapTypeV7,
  seats: number,
): number {
  return Math.max(0, settlementCountV7(width, mapType) - seats);
}

/**
 * Map scale section 6.3, "Crowded": a generated board with less than one
 * village per two players (`2 * villages < seats`), a capital brawl with few
 * or no villages. Legal (the user's minimum size rule), never the auto
 * size, and labelled on the setup screen.
 */
export function crowdedBoardV7(
  width: number,
  mapType: GeneratedMapTypeV7,
  seats: number,
): boolean {
  return 2 * generatedVillageCountV7(width, mapType, seats) < seats;
}

/** Map scale section 4.1: the domains per side, `ceil(sqrt(N))`. */
export function domainsPerSideV7(seats: number): number {
  return Math.ceil(Math.sqrt(seats));
}

/**
 * Map scale section 4.1: every two capitals of a generated board are at
 * least `D(w, N) = max(3, floor(w / k(N)))` apart (Chebyshev).
 */
export function capitalSpacingV7(width: number, seats: number): number {
  return Math.max(3, Math.floor(width / domainsPerSideV7(seats)));
}

/**
 * Map scale section 4.2, the central zone: with at most 8 seats no capital
 * stands on a tile whose distance to the nearest board edge is this or
 * more (`floor(w / 3)`). Null with 9 or more seats, which use every domain.
 */
export function centralZoneEdgeDistanceV7(
  width: number,
  seats: number,
): number | null {
  return seats <= 8 ? Math.floor(width / 3) : null;
}

/**
 * Map scale section 4.2: the band `index` of `k` along one axis of a board
 * `width` wide, as its first and last row or column.
 */
export function domainBandV7(
  width: number,
  k: number,
  index: number,
): { readonly from: number; readonly to: number } {
  return {
    from: Math.floor((index * width) / k),
    to: Math.floor(((index + 1) * width) / k) - 1,
  };
}

/**
 * Map scale section 4.3: the capitals each Continents landmass holds, the
 * largest first: 2 seats on two landmasses, 3 to 5 on three, 6 and more on
 * four, split evenly. The land of each landmass is in proportion.
 */
export function continentCapitalSplitV7(seats: number): readonly number[] {
  const masses = seats <= 2 ? 2 : seats <= 5 ? 3 : 4;
  return Array.from(
    { length: masses },
    (_, index) => Math.floor(seats / masses) + (index < seats % masses ? 1 : 0),
  );
}

/**
 * Map scale section 4.3: the least land of a major landmass:
 * `max(6, floor(w^2 / 20))`, and on an Archipelago
 * `max(6, min(floor(w^2 / 20), floor(L / (2N))))`, which is the same value
 * for up to 4 seats and scales down for more islands.
 */
export function majorLandmassMinimumV7(
  width: number,
  mapType: MapTypeV7,
  seats: number,
): number {
  const base = Math.floor((width * width) / 20);
  return Math.max(
    6,
    mapType === "ARCHIPELAGO"
      ? Math.min(
          base,
          Math.floor(landTileCountV7(width, mapType) / (2 * seats)),
        )
      : base,
  );
}

/**
 * The neutral villages of a generated setup (current rules section 2.2, map
 * scale section 5.1): the settlements of its width and map type less one
 * capital per seat, `max(0, S - N)`. The Showcase and a mission have no
 * generated village: 0.
 */
export function villageCountV7(setup: MatchSetupV7): number {
  if (!isGeneratedMapTypeV7(setup.mapType)) return 0;
  return generatedVillageCountV7(setup.width, setup.mapType, setup.aiCount + 1);
}
