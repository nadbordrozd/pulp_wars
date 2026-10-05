import {
  BOARD_SIZES_V7,
  allowedBoardSizesV7,
  crowdedBoardV7,
  generatedVillageCountV7,
  isGeneratedMapTypeV7,
  maxSeatCountV7,
  maxSeatsV7,
  type BoardSizeV7,
  type MapTypeV7,
} from "../engine/index";

/**
 * The setup screen's options for many players (bead `pulp_wars-ykw.5`,
 * docs/product/RULESET_7_MAP_SCALE.md section 6.3). Everything here is read
 * from the engine's map-scale queries: no size, seat, or village table is
 * repeated, so a new faction or a changed limit reaches the screen with no
 * edit in this file.
 */

/** The map types the setup offers, in the order of its Map select. */
export const SETUP_MAP_TYPES_V7: readonly MapTypeV7[] = Object.freeze([
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
  "SHOWCASE",
]);

/** The map type a setup falls back to: the screen's default. */
export const SETUP_DEFAULT_MAP_TYPE_V7: MapTypeV7 = "CONTINENTS";

/** The opponent counts on offer: 1 up to one less than the faction count. */
export function setupOpponentCountsV7(): readonly number[] {
  return Array.from({ length: maxSeatCountV7() - 1 }, (_, index) => index + 1);
}

/** The nearest offered opponent count to `value` (1 when it is no number). */
export function clampOpponentCountV7(value: number): number {
  const most = maxSeatCountV7() - 1;
  return Number.isSafeInteger(value) ? Math.min(most, Math.max(1, value)) : 1;
}

export interface SetupSizeOptionV7 {
  readonly size: BoardSizeV7;
  /** The engine classifies this board as crowded for the seat count. */
  readonly crowded: boolean;
  /**
   * The most neutral villages the board holds; null on a map with no
   * generated village (the Showcase).
   */
  readonly villages: number | null;
}

/**
 * The sizes legal for `opponents` opponents on `mapType`, ascending, each
 * with its Crowded mark and village count.
 */
export function setupSizeOptionsV7(
  mapType: MapTypeV7,
  opponents: number,
): readonly SetupSizeOptionV7[] {
  const seats = opponents + 1;
  return allowedBoardSizesV7(mapType, seats).map((size) => ({
    size,
    crowded: isGeneratedMapTypeV7(mapType)
      ? crowdedBoardV7(size, mapType, seats)
      : false,
    villages: isGeneratedMapTypeV7(mapType)
      ? generatedVillageCountV7(size, mapType, seats)
      : null,
  }));
}

export interface SetupMapOptionV7 {
  readonly mapType: MapTypeV7;
  /** Some size of this map type takes the opponent count. */
  readonly enabled: boolean;
  /** The most opponents this map type takes at any size. */
  readonly maxOpponents: number;
}

/** Every map type, with whether it can take `opponents` opponents. */
export function setupMapOptionsV7(
  opponents: number,
): readonly SetupMapOptionV7[] {
  return SETUP_MAP_TYPES_V7.map((mapType) => ({
    mapType,
    enabled: allowedBoardSizesV7(mapType, opponents + 1).length > 0,
    maxOpponents:
      Math.max(...BOARD_SIZES_V7.map((size) => maxSeatsV7(size, mapType))) - 1,
  }));
}

/** The short reason shown on a map type that cannot take the players. */
export function setupMapLimitReasonV7(option: SetupMapOptionV7): string {
  return `up to ${option.maxOpponents} opponents`;
}

export interface SetupChoiceV7 {
  readonly mapType: MapTypeV7;
  readonly opponents: number;
  readonly boardSize: BoardSizeV7;
}

export interface ResolvedSetupChoiceV7 extends SetupChoiceV7 {
  /** The map type had to change: the requested one cannot take the seats. */
  readonly mapMoved: boolean;
  /** The size had to change: the requested one is not legal here. */
  readonly sizeMoved: boolean;
}

/**
 * Makes a choice legal. A map type that cannot take the opponents at any
 * size gives way to the default map (else the first that can); a size that
 * is not legal for the map type and seats gives way to the nearest legal
 * one (the larger of two equally near). A legal choice comes back as it is.
 */
export function resolveSetupChoiceV7(
  requested: SetupChoiceV7,
): ResolvedSetupChoiceV7 {
  const opponents = clampOpponentCountV7(requested.opponents);
  const maps = setupMapOptionsV7(opponents);
  const usable = (mapType: MapTypeV7): boolean =>
    maps.some((option) => option.mapType === mapType && option.enabled);
  const mapType = usable(requested.mapType)
    ? requested.mapType
    : usable(SETUP_DEFAULT_MAP_TYPE_V7)
      ? SETUP_DEFAULT_MAP_TYPE_V7
      : (maps.find((option) => option.enabled)?.mapType ?? requested.mapType);
  const sizes = allowedBoardSizesV7(mapType, opponents + 1);
  const boardSize = sizes.includes(requested.boardSize)
    ? requested.boardSize
    : sizes.reduce<BoardSizeV7>(
        (best, size) =>
          Math.abs(size - requested.boardSize) <=
          Math.abs(best - requested.boardSize)
            ? size
            : best,
        sizes[0] ?? requested.boardSize,
      );
  return {
    mapType,
    opponents,
    boardSize,
    mapMoved: mapType !== requested.mapType,
    sizeMoved: boardSize !== requested.boardSize,
  };
}

/**
 * The village line under Size. Boards with many players keep as many
 * villages as fit (map scale section 5.6), so the count is the most a board
 * holds: "Up to 5 villages". Null where no village is generated.
 */
export function setupVillageLineV7(option: SetupSizeOptionV7): string | null {
  if (option.villages === null) return null;
  return option.villages === 0
    ? "No villages"
    : option.villages === 1
      ? "Up to 1 village"
      : `Up to ${option.villages} villages`;
}

/** The one-word Crowded mark and its tooltip. */
export const CROWDED_LABEL_V7 = "Crowded";
export const CROWDED_HINT_V7 = "Few or no villages. Expect early fighting.";
