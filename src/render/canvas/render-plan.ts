import {
  queryPlayerCombatPreview,
  queryPlayerCommands,
  type Command,
  type CombatPreview,
  type Coord,
  type PlayerView,
} from "../../engine/index";
import type { BoardSelection } from "./board-host";
import {
  compareGroundAnchors,
  diamondEdgeIndex,
  sameCoord,
  territoryBoundarySegments,
} from "./geometry";

export type RenderEntryKind =
  | "GROUND"
  | "OWNERSHIP"
  | "ORE"
  | "FRUIT"
  | "ANIMAL"
  | "MINE"
  | "LUMBER_MILL"
  | "CONTACT_SHADOW"
  | "MOUNTAIN"
  | "FOREST"
  | "VILLAGE"
  | "CITY_BACK"
  | "UNIT"
  | "CITY_FRONT"
  | "SELECTION"
  | "CITY_TERRITORY_BOUNDARY"
  | "MOVE_TARGET"
  | "ATTACK_TARGET"
  | "MINE_TARGET"
  | "PATH"
  | "UNIT_STATUS"
  | "CITY_STATUS"
  | "FOG";

export interface RenderPlanEntry {
  readonly kind: RenderEntryKind;
  readonly at: Coord;
  readonly id: number;
  readonly ownerId: number | null;
  readonly variant: number;
}

export interface AttackTargetPreview {
  readonly at: Coord;
  readonly preview: CombatPreview;
}

export interface BoardRenderPlan {
  readonly entries: readonly RenderPlanEntry[];
  readonly legalCommands: readonly Command[];
  readonly attackPreviews: readonly AttackTargetPreview[];
}

const LAYER: Readonly<Record<RenderEntryKind, number>> = {
  // Hidden tiles contribute only fog entries. Drawing fog before even the
  // revealed ground keeps every known layer in the foreground without
  // exposing any hidden plan contents.
  FOG: 0,
  GROUND: 1,
  OWNERSHIP: 2,
  ORE: 3,
  FRUIT: 3,
  ANIMAL: 5,
  MINE: 5,
  LUMBER_MILL: 5,
  CONTACT_SHADOW: 4,
  MOUNTAIN: 5,
  FOREST: 5,
  VILLAGE: 5,
  CITY_BACK: 5,
  UNIT: 5,
  CITY_FRONT: 5,
  SELECTION: 6,
  CITY_TERRITORY_BOUNDARY: 6,
  MOVE_TARGET: 6,
  ATTACK_TARGET: 6,
  MINE_TARGET: 6,
  PATH: 6,
  UNIT_STATUS: 7,
  CITY_STATUS: 7,
};

const BODY_TIE: Readonly<Partial<Record<RenderEntryKind, number>>> = {
  CONTACT_SHADOW: 0,
  LUMBER_MILL: 5,
  FOREST: 10,
  MOUNTAIN: 10,
  ANIMAL: 15,
  MINE: 15,
  VILLAGE: 20,
  CITY_BACK: 30,
  UNIT: 40,
  CITY_FRONT: 50,
};

export function buildRenderPlan(
  view: PlayerView,
  selected: BoardSelection | null,
  activeTarget: Coord | null = null,
): BoardRenderPlan {
  const entries: RenderPlanEntry[] = [];
  const attackPreviews: AttackTargetPreview[] = [];
  const legalCommands = queryPlayerCommands(view).map(({ command }) => command);
  for (const tile of view.board.tiles) {
    if (!tile.explored) {
      entries.push(entry("FOG", tile.at, coordinateId(tile.at), null));
      continue;
    }
    entries.push(entry("GROUND", tile.at, coordinateId(tile.at), null));
    const city = view.cities.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    const unit = view.units.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    const ownerId =
      city?.ownerId ??
      view.cities.find((candidate) => candidate.id === tile.territoryCityId)
        ?.ownerId ??
      null;
    if (ownerId !== null)
      entries.push(entry("OWNERSHIP", tile.at, coordinateId(tile.at), ownerId));
    if (tile.resource === "ORE" && tile.improvement === null)
      entries.push(entry("ORE", tile.at, coordinateId(tile.at), ownerId));
    if (tile.resource === "FRUIT")
      entries.push(entry("FRUIT", tile.at, coordinateId(tile.at), ownerId));
    if (tile.resource === "ANIMAL" && tile.improvement === null)
      entries.push(entry("ANIMAL", tile.at, coordinateId(tile.at), ownerId));
    if (tile.improvement === "MINE")
      entries.push(entry("MINE", tile.at, coordinateId(tile.at), ownerId));
    if (tile.improvement === "LUMBER_MILL")
      entries.push(
        entry("LUMBER_MILL", tile.at, coordinateId(tile.at), ownerId),
      );
    if (tile.terrain === "MOUNTAIN")
      entries.push(entry("MOUNTAIN", tile.at, coordinateId(tile.at), ownerId));
    if (tile.terrain === "FOREST")
      entries.push(entry("FOREST", tile.at, coordinateId(tile.at), ownerId));
    if (tile.site === "VILLAGE" && city === undefined)
      entries.push(entry("VILLAGE", tile.at, coordinateId(tile.at), null));
    if (city !== undefined) {
      entries.push(entry("CITY_BACK", tile.at, city.id, city.ownerId));
      entries.push(entry("CITY_FRONT", tile.at, city.id, city.ownerId));
    }
    if (unit !== undefined) {
      entries.push(entry("CONTACT_SHADOW", tile.at, unit.id, unit.ownerId));
      entries.push(entry("UNIT", tile.at, unit.id, unit.ownerId));
      entries.push(entry("UNIT_STATUS", tile.at, unit.id, unit.ownerId));
    }
    if (city !== undefined)
      entries.push(entry("CITY_STATUS", tile.at, city.id, city.ownerId));
  }

  if (selected !== null) {
    const at = selectionCoord(view, selected);
    if (at !== null)
      entries.push(entry("SELECTION", at, selectionId(selected), null));
  }
  if (selected?.kind === "CITY") {
    const city = view.cities.find(
      (candidate) => candidate.id === selected.cityId,
    );
    if (city !== undefined) {
      const observableTerritory = view.board.tiles
        .filter((tile) => tile.explored && tile.territoryCityId === city.id)
        .map((tile) => tile.at);
      for (const segment of territoryBoundarySegments(observableTerritory)) {
        entries.push({
          kind: "CITY_TERRITORY_BOUNDARY",
          at: segment.at,
          id: coordinateId(segment.at),
          ownerId: city.ownerId,
          variant: diamondEdgeIndex(segment.edge),
        });
      }
    }
  }
  const selectedUnitId = selected?.kind === "UNIT" ? selected.unitId : null;
  if (selectedUnitId !== null) {
    for (const command of legalCommands) {
      if (!("unitId" in command) || command.unitId !== selectedUnitId) continue;
      if (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") {
        const destination = command.path.at(-1);
        if (destination !== undefined) {
          entries.push(
            entry("MOVE_TARGET", destination, command.path.length, null),
          );
          if (activeTarget !== null && sameCoord(destination, activeTarget))
            for (const at of command.path)
              entries.push(entry("PATH", at, coordinateId(at), null));
        }
      } else if (command.kind === "ATTACK") {
        const target = view.units.find((unit) => unit.id === command.targetId);
        const preview = queryPlayerCombatPreview(
          view,
          command.unitId,
          command.targetId,
        );
        if (target !== undefined && preview !== null) {
          entries.push(
            entry("ATTACK_TARGET", target.at, target.id, target.ownerId),
          );
          attackPreviews.push({ at: target.at, preview });
        }
      }
    }
  }
  if (selected?.kind === "TILE") {
    const mine = legalCommands.find(
      (command) =>
        command.kind === "BUILD_MINE" && sameCoord(command.at, selected.at),
    );
    if (mine !== undefined)
      entries.push(
        entry("MINE_TARGET", selected.at, coordinateId(selected.at), null),
      );
  }
  entries.sort(compareEntries);
  return {
    entries,
    legalCommands,
    attackPreviews,
  };
}

export function compareEntries(
  left: RenderPlanEntry,
  right: RenderPlanEntry,
): number {
  const layer = LAYER[left.kind] - LAYER[right.kind];
  if (layer !== 0) return layer;
  if (LAYER[left.kind] === 5 || LAYER[left.kind] === 4) {
    return compareGroundAnchors(
      { at: left.at, tie: BODY_TIE[left.kind] ?? 0, id: left.id },
      { at: right.at, tie: BODY_TIE[right.kind] ?? 0, id: right.id },
    );
  }
  return (
    left.at.x + left.at.y - (right.at.x + right.at.y) ||
    left.at.x - left.at.y - (right.at.x - right.at.y) ||
    left.kind.localeCompare(right.kind) ||
    left.id - right.id
  );
}

export function selectionCoord(
  view: PlayerView,
  selection: BoardSelection,
): Coord | null {
  if (selection.kind === "TILE") return selection.at;
  if (selection.kind === "UNIT")
    return view.units.find((unit) => unit.id === selection.unitId)?.at ?? null;
  return view.cities.find((city) => city.id === selection.cityId)?.at ?? null;
}

function entry(
  kind: RenderEntryKind,
  at: Coord,
  id: number,
  ownerId: number | null,
): RenderPlanEntry {
  return { kind, at, id, ownerId, variant: cosmeticVariant(at, kind) };
}

function cosmeticVariant(at: Coord, kind: RenderEntryKind): number {
  let value = Math.imul(at.x + 1, 0x45d9f3b) ^ Math.imul(at.y + 1, 0x119de1f3);
  for (let index = 0; index < kind.length; index += 1)
    value = Math.imul(value ^ kind.charCodeAt(index), 0x01000193);
  return (value >>> 0) % 4;
}

function coordinateId(at: Coord): number {
  return at.y * 1024 + at.x;
}

function selectionId(selection: BoardSelection): number {
  return selection.kind === "UNIT"
    ? selection.unitId
    : selection.kind === "CITY"
      ? selection.cityId
      : coordinateId(selection.at);
}
