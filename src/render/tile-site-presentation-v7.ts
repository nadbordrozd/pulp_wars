import type { CoordV7, PlayerViewV7 } from "../engine/index";
import type { ArtSubjectV7 } from "../assets/chibi-art-v7";
import { villageStoryNameV7 } from "./city-names-presentation-v7";

/**
 * What stands on a tile that the tile dock names instead of its terrain
 * (bead `pulp_wars-2yc.89`): a neutral village and a treasure chest are
 * drawn on the board as pieces of their own, but they are no city and no
 * improvement, so the tile dock used to read "GRASS" for them. The dock
 * now shows the piece's art and name, and one short line saying what a
 * unit does with it. This module imports the engine's view types only.
 */
export interface TileSiteDockV7 {
  readonly kind: "VILLAGE" | "TREASURE";
  /** The dock's title: "Village" (or a mission's story name), "Treasure". */
  readonly name: string;
  /** "Village" under a story name, as a city has "City"; else null. */
  readonly kindLabel: string | null;
  /** The one short line of the main view. */
  readonly line: string;
  readonly subject: ArtSubjectV7;
  /** The legacy art key (the fallback picture). */
  readonly assetId: string;
}

export const VILLAGE_CAPTURE_LINE_V7 =
  "Move a unit here, then Capture it to make it your city.";
export const TREASURE_LINE_V7 =
  "Move a unit here to open it for Coins or a free unit.";

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/**
 * The village or treasure chest on an explored tile without an
 * improvement; null for any other tile (a captured village is a city and
 * has the city's dock).
 */
export function tileSiteDockV7(
  view: Pick<PlayerViewV7, "board" | "cities" | "treasureChests" | "setup">,
  at: CoordV7,
): TileSiteDockV7 | null {
  const tile = view.board.tiles.find((candidate) => same(candidate.at, at));
  if (tile === undefined || !tile.explored || tile.improvement !== null)
    return null;
  if (
    tile.site === "VILLAGE" &&
    !view.cities.some((city) => same(city.at, at))
  ) {
    const story = villageStoryNameV7(view, at);
    return {
      kind: "VILLAGE",
      name: story ?? "Village",
      kindLabel: story === null ? null : "Village",
      line: VILLAGE_CAPTURE_LINE_V7,
      subject: "SITE:VILLAGE",
      assetId: "building-village",
    };
  }
  if (view.treasureChests.some((chest) => same(chest, at)))
    return {
      kind: "TREASURE",
      name: "Treasure",
      kindLabel: null,
      line: TREASURE_LINE_V7,
      subject: "TREASURE",
      assetId: "building-treasure-chest",
    };
  return null;
}
