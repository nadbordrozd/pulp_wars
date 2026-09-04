import {
  UNKNOWN_RESOURCE_V6,
  effectiveRoleRuleV6,
  type FactionIdV6,
  type PlayerViewV6,
} from "../../engine/index";
import {
  chocolateWallCoverageV6,
  cityCoverageV6,
  improvementCoverageV6,
  resourceCoverageV6,
  terrainCoverageV6,
  unitCoverageV6,
  type AssetCoverageV6,
} from "../canvas/asset-coverage-v6";
import {
  cosmeticVariantV6,
  type BoardSelectionV6,
} from "../canvas/render-plan-v6";

export interface SelectionIdentityPresentationV6 {
  readonly kind: BoardSelectionV6["kind"] | "NONE";
  readonly title: string;
  readonly detail: string | null;
  readonly accessibleLabel: string;
  readonly artwork: AssetCoverageV6 | null;
}

export interface SelectionIdentityArtworkFrameV6 {
  readonly mode: "SOURCE_CANVAS" | "VISIBLE_ALPHA";
  readonly source: {
    readonly width: number;
    readonly height: number;
  };
  readonly visibleBounds: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } | null;
}

export interface SelectionIdentityArtworkLayoutV6 {
  readonly image: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly visible: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } | null;
}

export interface SelectionIdentityArtworkViewportV6 {
  readonly width: number;
  readonly height: number;
  readonly visibleInset: number;
}

export const SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6 = {
  width: 112,
  height: 130,
  visibleInset: 4,
} as const satisfies SelectionIdentityArtworkViewportV6;

/**
 * UI-only alpha metadata for accepted low-profile sprites whose world source
 * canvas deliberately reserves a large transparent upper region. Keeping it
 * here prevents the map's ground anchors from leaking into dock layout.
 */
const SELECTION_VISIBLE_ALPHA_BOUNDS_V6: Readonly<
  Record<
    string,
    {
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    }
  >
> = {
  "terrain-square-original-animal": {
    left: 68,
    top: 220,
    right: 188,
    bottom: 324,
  },
  "terrain-square-candy-animal": {
    left: 68,
    top: 213,
    right: 188,
    bottom: 324,
  },
  "terrain-square-fertile-ground": {
    left: 59,
    top: 250,
    right: 196,
    bottom: 324,
  },
};

export function selectionIdentityArtworkFrameV6(
  artwork: AssetCoverageV6 | null,
): SelectionIdentityArtworkFrameV6 | null {
  if (artwork?.status !== "ACCEPTED") return null;
  return {
    mode:
      SELECTION_VISIBLE_ALPHA_BOUNDS_V6[artwork.assetId] === undefined
        ? "SOURCE_CANVAS"
        : "VISIBLE_ALPHA",
    source: {
      width: artwork.geometry.width,
      height: artwork.geometry.height,
    },
    visibleBounds: SELECTION_VISIBLE_ALPHA_BOUNDS_V6[artwork.assetId] ?? null,
  };
}

/**
 * Mirrors centered `object-fit: contain` for ordinary art. Opted-in low art
 * instead contains and centers its accepted visible-alpha rectangle, clipping
 * transparent source padding only.
 */
export function selectionIdentityArtworkLayoutV6(
  frame: SelectionIdentityArtworkFrameV6,
  viewport: SelectionIdentityArtworkViewportV6 = SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6,
): SelectionIdentityArtworkLayoutV6 {
  const bounds = frame.visibleBounds;
  const targetWidth =
    bounds === null
      ? viewport.width
      : viewport.width - viewport.visibleInset * 2;
  const targetHeight =
    bounds === null
      ? viewport.height
      : viewport.height - viewport.visibleInset * 2;
  const measuredWidth =
    bounds === null ? frame.source.width : bounds.right - bounds.left;
  const measuredHeight =
    bounds === null ? frame.source.height : bounds.bottom - bounds.top;
  const scale = Math.min(
    targetWidth / measuredWidth,
    targetHeight / measuredHeight,
  );
  const measuredCenterX =
    bounds === null ? frame.source.width / 2 : (bounds.left + bounds.right) / 2;
  const measuredCenterY =
    bounds === null
      ? frame.source.height / 2
      : (bounds.top + bounds.bottom) / 2;
  const image = {
    left: viewport.width / 2 - measuredCenterX * scale,
    top: viewport.height / 2 - measuredCenterY * scale,
    width: frame.source.width * scale,
    height: frame.source.height * scale,
  };
  return {
    image,
    visible:
      bounds === null
        ? null
        : {
            left: image.left + bounds.left * scale,
            top: image.top + bounds.top * scale,
            right: image.left + bounds.right * scale,
            bottom: image.top + bounds.bottom * scale,
          },
  };
}

/**
 * Resolves the selected dock identity exclusively from the observation-safe
 * player view and the same accepted coverage registry used by the map.
 */
export function selectionIdentityPresentationV6(
  view: PlayerViewV6,
  selection: BoardSelectionV6 | null,
): SelectionIdentityPresentationV6 {
  if (selection === null) {
    return {
      kind: "NONE",
      title: "Choose an action",
      detail: null,
      accessibleLabel:
        "No map selection. Choose a unit, city, or tile to see its actions.",
      artwork: null,
    };
  }

  if (selection.kind === "UNIT") {
    const unit = view.units.find(
      (candidate) => candidate.id === selection.unitId,
    );
    if (unit === undefined) return unavailableIdentity("UNIT", "Unit");
    const faction = factionForOwnerV6(view, unit.ownerId);
    if (faction === null) return unavailableIdentity("UNIT", "Unit");
    const label = effectiveRoleRuleV6(faction, unit.role).label;
    return {
      kind: "UNIT",
      title: label,
      detail: null,
      accessibleLabel: `${label}, selected. Statistics follow.`,
      artwork: unitCoverageV6(faction, unit.role),
    };
  }

  if (selection.kind === "CITY") {
    const city = view.cities.find(
      (candidate) => candidate.id === selection.cityId,
    );
    if (city === undefined) return unavailableIdentity("CITY", "City");
    const faction = factionForOwnerV6(view, city.ownerId);
    if (faction === null) return unavailableIdentity("CITY", "City");
    const title = `${titleCase(faction)} ${city.isCapital ? "Capital" : "City"}`;
    const detail = `Level ${city.level} · ${city.population}/${city.level + 1} population`;
    return {
      kind: "CITY",
      title,
      detail,
      accessibleLabel: `${title}, ${detail}, selected.`,
      artwork: cityCoverageV6(faction, city.level),
    };
  }

  if (selection.kind === "WALL") {
    const wall = view.chocolateWalls.find(
      (candidate) => candidate.id === selection.wallId,
    );
    if (wall === undefined)
      return unavailableIdentity("WALL", "Chocolate Wall");
    const detail = `${wall.hp} HP`;
    return {
      kind: "WALL",
      title: "Chocolate Wall",
      detail,
      accessibleLabel: `Chocolate Wall, ${detail}, selected.`,
      artwork: chocolateWallCoverageV6(),
    };
  }

  const tile = view.board.tiles.find(
    (candidate) =>
      candidate.at.x === selection.at.x && candidate.at.y === selection.at.y,
  );
  if (tile === undefined) return unavailableIdentity("TILE", "Tile");
  if (!tile.explored) {
    return {
      kind: "TILE",
      title: "Unexplored Tile",
      detail: null,
      accessibleLabel: "Unexplored tile selected.",
      artwork: null,
    };
  }

  const faction = factionForOwnerV6(view, tile.territoryOwnerId) ?? "ORIGINAL";
  if (tile.improvement !== null) {
    const title = titleCase(tile.improvement);
    return tileIdentity(title, improvementCoverageV6(tile.improvement));
  }
  if (tile.resource !== null && tile.resource !== UNKNOWN_RESOURCE_V6) {
    const title = titleCase(tile.resource);
    return tileIdentity(title, resourceCoverageV6(tile.resource, faction));
  }
  const title = titleCase(tile.terrain);
  const variantKind = tile.terrain === "GRASS" ? "TERRAIN" : "TERRAIN_BODY";
  return tileIdentity(
    title,
    terrainCoverageV6(
      tile.terrain,
      faction,
      cosmeticVariantV6(tile.at, variantKind),
    ),
  );
}

function tileIdentity(
  title: string,
  artwork: AssetCoverageV6,
): SelectionIdentityPresentationV6 {
  return {
    kind: "TILE",
    title,
    detail: null,
    accessibleLabel: `${title} selected.`,
    artwork,
  };
}

function unavailableIdentity(
  kind: Exclude<SelectionIdentityPresentationV6["kind"], "NONE">,
  subject: string,
): SelectionIdentityPresentationV6 {
  return {
    kind,
    title: `${subject} unavailable`,
    detail: null,
    accessibleLabel: `${subject} selection is no longer available.`,
    artwork: null,
  };
}

function factionForOwnerV6(
  view: PlayerViewV6,
  ownerId: number | null,
): FactionIdV6 | null {
  if (ownerId === null) return null;
  return (
    view.players.find((candidate) => candidate.id === ownerId)?.faction ?? null
  );
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
