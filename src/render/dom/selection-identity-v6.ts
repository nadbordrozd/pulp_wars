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
    const detail = `${unit.hp}/${unit.maxHp} HP`;
    return {
      kind: "UNIT",
      title: label,
      detail,
      accessibleLabel: `${label}, ${detail}, selected.`,
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
