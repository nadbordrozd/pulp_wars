import {
  compareCommandsV6,
  previewEconomicV6,
  queryPlayerCommandsV6,
  type CardinalDirectionV6,
  type CommandKindV6,
  type CommandV6,
  type CoordV6,
  type EconomicImprovementId,
  type EconomicPreviewResultV6,
  type FactionIdV6,
  type OppositePairAxisV6,
  type PlayerViewV6,
  type ResourceId,
  type TerrainIdV6,
  type UnitId,
  type UnitRoleId,
} from "../../engine/index";
import {
  compareGroundAnchors,
  diamondEdgeIndex,
  sameCoord,
  territoryBoundarySegments,
  type DiamondEdge,
} from "./geometry";
import { cityPopulationPresentationV6 } from "../city-population-presentation-v6";

export const BOARD_RENDER_PLAN_VERSION_V6 = 6 as const;

export type BoardSelectionV6 =
  | { readonly kind: "TILE"; readonly at: CoordV6 }
  | { readonly kind: "UNIT"; readonly unitId: number }
  | { readonly kind: "CITY"; readonly cityId: number }
  | { readonly kind: "WALL"; readonly wallId: number };

export type BoardTargetModeV6 =
  | { readonly kind: "KAMIKAZE_ROLL"; readonly unitId: number }
  | { readonly kind: "BUILD_CHOCOLATE_WALL"; readonly unitId: number };

export type EconomicCommandKindV6 = Extract<
  CommandKindV6,
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_QUARRY"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_STONEWORKS"
  | "BUILD_WORKSHOP"
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP"
>;

export type EconomicCommandV6 = Extract<
  CommandV6,
  { readonly kind: EconomicCommandKindV6 }
>;

export interface EconomicPreviewSelectionV6 {
  readonly command: EconomicCommandV6;
  readonly result: EconomicPreviewResultV6;
}

export interface BoardRenderInteractionV6 {
  readonly selection: BoardSelectionV6 | null;
  readonly activeTarget: CoordV6 | null;
  readonly targetMode: BoardTargetModeV6 | null;
  readonly economicPreview: EconomicPreviewSelectionV6 | null;
  readonly readyUnitIds: readonly UnitId[];
}

export const EMPTY_BOARD_RENDER_INTERACTION_V6: BoardRenderInteractionV6 =
  Object.freeze({
    selection: null,
    activeTarget: null,
    targetMode: null,
    economicPreview: null,
    readyUnitIds: Object.freeze([]),
  });

export type MapCommandTargetFamilyV6 =
  | "MOVE"
  | "ATTACK"
  | "ROLL"
  | "HEAL"
  | "WALL"
  | "SELF_ABILITY"
  | "ECONOMIC"
  | "TRAIN"
  | "CHOICE";

export interface MapCommandTargetV6 {
  readonly family: MapCommandTargetFamilyV6;
  readonly at: CoordV6;
  readonly id: number;
  readonly ownerId: number | null;
  readonly command: CommandV6;
}

interface RenderEntryDetailsV6 {
  readonly FOG: { readonly diplomaticBlock: "ALLIED_TERRITORY" | null };
  readonly TERRAIN: { readonly terrain: TerrainIdV6 };
  readonly OWNERSHIP: { readonly faction: FactionIdV6 };
  readonly ROAD: null;
  readonly RESOURCE: { readonly resource: ResourceId };
  readonly UNKNOWN_RESOURCE: null;
  readonly IMPROVEMENT: {
    readonly improvement: EconomicImprovementId;
  };
  readonly CONTACT_SHADOW: null;
  readonly TERRAIN_BODY: {
    readonly terrain: Exclude<TerrainIdV6, "GRASS">;
  };
  readonly SITE: { readonly site: "CAPITAL" | "VILLAGE" | "CITY" };
  readonly CHOCOLATE_WALL: {
    readonly faction: FactionIdV6;
    readonly hp: number;
  };
  readonly CITY_BACK: {
    readonly faction: FactionIdV6;
    readonly isCapital: boolean;
  };
  readonly UNIT: {
    readonly faction: FactionIdV6;
    readonly role: UnitRoleId;
    readonly readiness: "PULSE" | "OPAQUE";
  };
  readonly CITY_FRONT: {
    readonly faction: FactionIdV6;
    readonly isCapital: boolean;
  };
  readonly SELECTION: { readonly selectionKind: BoardSelectionV6["kind"] };
  readonly CITY_TERRITORY_BOUNDARY: { readonly edge: DiamondEdge };
  readonly MOVE_TARGET: { readonly command: CommandV6 };
  readonly ATTACK_TARGET: { readonly command: CommandV6 };
  readonly ROLL_TARGET: { readonly command: CommandV6 };
  readonly ROLL_PATH: {
    readonly direction: CardinalDirectionV6;
    readonly ordinal: number;
  };
  readonly HEAL_TARGET: { readonly command: CommandV6 };
  readonly WALL_TARGET: { readonly command: CommandV6 };
  readonly ABILITY_TARGET: { readonly command: CommandV6 };
  readonly ECONOMIC_TARGET: { readonly command: CommandV6 };
  readonly TRAIN_TARGET: { readonly command: CommandV6 };
  readonly CHOICE_TARGET: { readonly command: CommandV6 };
  readonly MOVE_PATH: { readonly ordinal: number };
  readonly ECONOMIC_VALUE: {
    readonly command: EconomicCommandV6;
    readonly ownerCityId: number;
    readonly cost: number;
    readonly resultingContribution: number;
    readonly populationDeltaByCity: readonly {
      readonly cityId: number;
      readonly delta: number;
    }[];
    readonly coinIncomeDeltaByCity: readonly {
      readonly cityId: number;
      readonly delta: number;
    }[];
    readonly capitalRoadConnected: boolean;
  };
  readonly ECONOMIC_CONTRIBUTOR: {
    readonly command: EconomicCommandV6;
    readonly ordinal: number;
    readonly sourceCityId: number | null;
  };
  readonly ECONOMIC_PAIR_AXIS: {
    readonly command: EconomicCommandV6;
    readonly axis: OppositePairAxisV6;
  };
  readonly UNIT_STATUS: {
    readonly role: UnitRoleId;
    readonly faction: FactionIdV6;
    readonly hp: number;
    readonly maxHp: number;
    readonly state: "NEEDS_ACTION" | "HANDLED";
    readonly veteran: boolean;
  };
  readonly CHOCOLATE_WALL_STATUS: { readonly hp: number };
  readonly CITY_STATUS: {
    readonly faction: FactionIdV6;
    readonly level: number;
    readonly populationLayer: ReturnType<typeof cityPopulationPresentationV6>;
    readonly isCapital: boolean;
  };
}

export type RenderEntryKindV6 = keyof RenderEntryDetailsV6;

interface RenderPlanEntryBaseV6 {
  readonly key: string;
  readonly at: CoordV6;
  readonly id: number;
  readonly ownerId: number | null;
  readonly variant: number;
  readonly layer: number;
}

export type RenderPlanEntryV6 = {
  readonly [Kind in RenderEntryKindV6]: RenderPlanEntryBaseV6 & {
    readonly kind: Kind;
    readonly details: RenderEntryDetailsV6[Kind];
  };
}[RenderEntryKindV6];

export interface EconomicPreviewPlanV6 {
  readonly command: EconomicCommandV6;
  readonly result: Extract<EconomicPreviewResultV6, { readonly ok: true }>;
}

export interface BoardRenderPlanV6 {
  readonly planVersion: typeof BOARD_RENDER_PLAN_VERSION_V6;
  readonly entries: readonly RenderPlanEntryV6[];
  readonly legalCommands: readonly CommandV6[];
  readonly commandTargets: readonly MapCommandTargetV6[];
  readonly economicPreview: EconomicPreviewPlanV6 | null;
}

const LAYER_V6: Readonly<Record<RenderEntryKindV6, number>> = {
  FOG: 0,
  TERRAIN: 1,
  OWNERSHIP: 2,
  ROAD: 3,
  RESOURCE: 4,
  UNKNOWN_RESOURCE: 4,
  CONTACT_SHADOW: 5,
  TERRAIN_BODY: 5,
  IMPROVEMENT: 5,
  SITE: 5,
  CHOCOLATE_WALL: 5,
  CITY_BACK: 5,
  UNIT: 5,
  CITY_FRONT: 5,
  SELECTION: 6,
  CITY_TERRITORY_BOUNDARY: 6,
  MOVE_TARGET: 7,
  ATTACK_TARGET: 7,
  ROLL_TARGET: 7,
  ROLL_PATH: 7,
  HEAL_TARGET: 7,
  WALL_TARGET: 7,
  ABILITY_TARGET: 7,
  ECONOMIC_TARGET: 7,
  TRAIN_TARGET: 7,
  CHOICE_TARGET: 7,
  MOVE_PATH: 7,
  ECONOMIC_VALUE: 7,
  ECONOMIC_CONTRIBUTOR: 7,
  ECONOMIC_PAIR_AXIS: 7,
  UNIT_STATUS: 8,
  CHOCOLATE_WALL_STATUS: 8,
  CITY_STATUS: 8,
};

const BODY_TIE_V6: Readonly<Partial<Record<RenderEntryKindV6, number>>> = {
  CONTACT_SHADOW: 0,
  TERRAIN_BODY: 10,
  RESOURCE: 15,
  IMPROVEMENT: 20,
  SITE: 25,
  CHOCOLATE_WALL: 30,
  CITY_BACK: 35,
  UNIT: 40,
  CITY_FRONT: 50,
};

const SELF_ABILITY_KINDS = new Set<CommandKindV6>([
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "WAIT",
  "CANDIFY",
]);

const ECONOMIC_COMMAND_KINDS = new Set<CommandKindV6>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
]);

/**
 * Produces the versioned ruleset-6 Canvas plan from observation-safe values.
 * The signature deliberately excludes GameStateV6 and the implementation never
 * reconstructs hidden board or entity facts.
 */
export function buildRenderPlanV6(
  view: PlayerViewV6,
  interaction: BoardRenderInteractionV6 = EMPTY_BOARD_RENDER_INTERACTION_V6,
): BoardRenderPlanV6 {
  const entries: RenderPlanEntryV6[] = [];
  const legalCommands = queryPlayerCommandsV6(view);
  const readyUnitIds = new Set(interaction.readyUnitIds);
  const commandTargets = legalCommands
    .map((command) => commandTargetV6(view, command))
    .filter((target): target is MapCommandTargetV6 => target !== null)
    .sort(compareCommandTargetsV6);

  for (const tile of view.board.tiles) {
    const tileId = coordinateIdV6(tile.at, view.board.width);
    if (!tile.explored) {
      entries.push(
        entryV6("FOG", tile.at, tileId, null, {
          diplomaticBlock: tile.diplomaticBlock ?? null,
        }),
      );
      continue;
    }

    const ownerId = tile.territoryOwnerId;
    const faction = factionForOwnerV6(view, ownerId);
    entries.push(
      entryV6("TERRAIN", tile.at, tileId, ownerId, {
        terrain: tile.terrain,
      }),
    );
    if (ownerId !== null && faction !== null) {
      entries.push(entryV6("OWNERSHIP", tile.at, tileId, ownerId, { faction }));
    }
    if (tile.road)
      entries.push(entryV6("ROAD", tile.at, tileId, ownerId, null));
    if (tile.resource === "UNKNOWN_RESOURCE") {
      entries.push(entryV6("UNKNOWN_RESOURCE", tile.at, tileId, ownerId, null));
    } else if (tile.resource !== null) {
      entries.push(
        entryV6("RESOURCE", tile.at, tileId, ownerId, {
          resource: tile.resource,
        }),
      );
    }
    if (tile.terrain !== "GRASS") {
      entries.push(
        entryV6("TERRAIN_BODY", tile.at, tileId, ownerId, {
          terrain: tile.terrain,
        }),
      );
    }
    if (tile.improvement !== null) {
      entries.push(
        entryV6("IMPROVEMENT", tile.at, tileId, ownerId, {
          improvement: tile.improvement,
        }),
      );
    }
    if (tile.site !== null) {
      entries.push(
        entryV6("SITE", tile.at, tileId, ownerId, { site: tile.site }),
      );
    }

    const wall = view.chocolateWalls.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    if (wall !== undefined) {
      const wallFaction = factionForOwnerV6(view, wall.ownerId);
      if (wallFaction !== null) {
        entries.push(
          entryV6("CHOCOLATE_WALL", tile.at, wall.id, wall.ownerId, {
            faction: wallFaction,
            hp: wall.hp,
          }),
          entryV6("CHOCOLATE_WALL_STATUS", tile.at, wall.id, wall.ownerId, {
            hp: wall.hp,
          }),
        );
      }
    }

    const city = view.cities.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    if (city !== undefined) {
      const cityFaction = factionForOwnerV6(view, city.ownerId);
      if (cityFaction !== null) {
        const details = {
          faction: cityFaction,
          isCapital: city.isCapital,
        } as const;
        entries.push(
          entryV6("CITY_BACK", tile.at, city.id, city.ownerId, details),
          entryV6("CITY_FRONT", tile.at, city.id, city.ownerId, details),
          entryV6("CITY_STATUS", tile.at, city.id, city.ownerId, {
            faction: cityFaction,
            level: city.level,
            populationLayer: cityPopulationPresentationV6(city),
            isCapital: city.isCapital,
          }),
        );
      }
    }

    const unit = view.units.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    if (unit !== undefined) {
      const unitFaction = factionForOwnerV6(view, unit.ownerId);
      if (unitFaction !== null) {
        entries.push(
          entryV6("CONTACT_SHADOW", tile.at, unit.id, unit.ownerId, null),
          entryV6("UNIT", tile.at, unit.id, unit.ownerId, {
            faction: unitFaction,
            role: unit.role,
            readiness:
              unit.ownerId === view.viewer.id && readyUnitIds.has(unit.id)
                ? "PULSE"
                : "OPAQUE",
          }),
          entryV6("UNIT_STATUS", tile.at, unit.id, unit.ownerId, {
            role: unit.role,
            faction: unitFaction,
            hp: unit.hp,
            maxHp: unit.maxHp,
            state: unit.activation.handled ? "HANDLED" : "NEEDS_ACTION",
            veteran: unit.veteran,
          }),
        );
      }
    }
  }

  addSelectionEntriesV6(entries, view, interaction.selection);
  addTargetEntriesV6(entries, view, interaction, commandTargets);
  const economicPreview = addEconomicPreviewEntriesV6(
    entries,
    view,
    interaction.economicPreview,
  );
  entries.sort(compareEntriesV6);

  return {
    planVersion: BOARD_RENDER_PLAN_VERSION_V6,
    entries,
    legalCommands,
    commandTargets,
    economicPreview,
  };
}

export function compareEntriesV6(
  left: RenderPlanEntryV6,
  right: RenderPlanEntryV6,
): number {
  const layer = left.layer - right.layer;
  if (layer !== 0) return layer;
  if (left.layer === LAYER_V6.TERRAIN_BODY) {
    const ground = compareGroundAnchors(
      {
        at: left.at,
        tie: BODY_TIE_V6[left.kind] ?? 0,
        id: left.id,
      },
      {
        at: right.at,
        tie: BODY_TIE_V6[right.kind] ?? 0,
        id: right.id,
      },
    );
    if (ground !== 0) return ground;
  }
  return (
    left.at.x + left.at.y - (right.at.x + right.at.y) ||
    left.at.x - left.at.y - (right.at.x - right.at.y) ||
    left.kind.localeCompare(right.kind) ||
    left.id - right.id ||
    left.key.localeCompare(right.key)
  );
}

export function selectionCoordV6(
  view: PlayerViewV6,
  selection: BoardSelectionV6,
): CoordV6 | null {
  if (selection.kind === "TILE") return selection.at;
  if (selection.kind === "UNIT") {
    const unit = view.units.find(
      (candidate) => candidate.id === selection.unitId,
    );
    return unit !== undefined && isExploredV6(view, unit.at) ? unit.at : null;
  }
  if (selection.kind === "CITY") {
    const city = view.cities.find(
      (candidate) => candidate.id === selection.cityId,
    );
    return city !== undefined && isExploredV6(view, city.at) ? city.at : null;
  }
  const wall = view.chocolateWalls.find(
    (candidate) => candidate.id === selection.wallId,
  );
  return wall !== undefined && isExploredV6(view, wall.at) ? wall.at : null;
}

function addSelectionEntriesV6(
  entries: RenderPlanEntryV6[],
  view: PlayerViewV6,
  selection: BoardSelectionV6 | null,
): void {
  if (selection === null) return;
  const at = selectionCoordV6(view, selection);
  if (at === null) return;
  entries.push(
    entryV6("SELECTION", at, selectionIdV6(selection, view.board.width), null, {
      selectionKind: selection.kind,
    }),
  );
  if (selection.kind !== "CITY") return;
  const city = view.cities.find(
    (candidate) => candidate.id === selection.cityId,
  );
  if (city === undefined) return;
  const observableTerritory = view.board.tiles
    .filter(
      (tile) => tile.explored && tile.territoryCityId === selection.cityId,
    )
    .map((tile) => tile.at);
  for (const segment of territoryBoundarySegments(observableTerritory)) {
    entries.push(
      entryV6(
        "CITY_TERRITORY_BOUNDARY",
        segment.at,
        coordinateIdV6(segment.at, view.board.width),
        city.ownerId,
        { edge: segment.edge },
        diamondEdgeIndex(segment.edge),
      ),
    );
  }
}

function addTargetEntriesV6(
  entries: RenderPlanEntryV6[],
  view: PlayerViewV6,
  interaction: BoardRenderInteractionV6,
  commandTargets: readonly MapCommandTargetV6[],
): void {
  for (const target of commandTargets) {
    if (!targetMatchesSelectionV6(target, interaction.selection)) continue;
    // Economy commands already name the selected tile. They remain exact
    // public command metadata, but never become Canvas targets: the semantic
    // context button dispatches them directly without a map confirmation.
    if (target.family === "ECONOMIC") continue;
    if (
      target.family === "ROLL" &&
      (interaction.targetMode?.kind !== "KAMIKAZE_ROLL" ||
        !("unitId" in target.command) ||
        interaction.targetMode.unitId !== target.command.unitId)
    ) {
      continue;
    }
    if (
      target.family === "WALL" &&
      (interaction.targetMode?.kind !== "BUILD_CHOCOLATE_WALL" ||
        !("unitId" in target.command) ||
        interaction.targetMode.unitId !== target.command.unitId)
    ) {
      continue;
    }
    addCommandTargetEntryV6(entries, target);

    if (
      target.family === "MOVE" &&
      target.command.kind === "MOVE" &&
      interaction.activeTarget !== null &&
      sameCoord(target.at, interaction.activeTarget)
    ) {
      target.command.path.forEach((at, ordinal) => {
        entries.push(
          entryV6("MOVE_PATH", at, coordinateIdV6(at, view.board.width), null, {
            ordinal,
          }),
        );
      });
    }
    if (
      target.family === "ROLL" &&
      target.command.kind === "KAMIKAZE_ROLL" &&
      interaction.activeTarget !== null &&
      sameCoord(target.at, interaction.activeTarget)
    ) {
      const delta = cardinalDeltaV6(target.command.direction);
      let ordinal = 0;
      for (
        let at = target.at;
        onBoardV6(view, at);
        at = { x: at.x + delta.x, y: at.y + delta.y }
      ) {
        entries.push(
          entryV6("ROLL_PATH", at, coordinateIdV6(at, view.board.width), null, {
            direction: target.command.direction,
            ordinal,
          }),
        );
        ordinal += 1;
      }
    }
  }
}

function addCommandTargetEntryV6(
  entries: RenderPlanEntryV6[],
  target: MapCommandTargetV6,
): void {
  const common = [
    target.at,
    target.id,
    target.ownerId,
    { command: target.command },
  ] as const;
  switch (target.family) {
    case "MOVE":
      entries.push(entryV6("MOVE_TARGET", ...common));
      return;
    case "ATTACK":
      entries.push(entryV6("ATTACK_TARGET", ...common));
      return;
    case "ROLL":
      entries.push(entryV6("ROLL_TARGET", ...common));
      return;
    case "HEAL":
      entries.push(entryV6("HEAL_TARGET", ...common));
      return;
    case "WALL":
      entries.push(entryV6("WALL_TARGET", ...common));
      return;
    case "SELF_ABILITY":
      entries.push(entryV6("ABILITY_TARGET", ...common));
      return;
    case "ECONOMIC":
      entries.push(entryV6("ECONOMIC_TARGET", ...common));
      return;
    case "TRAIN":
      entries.push(entryV6("TRAIN_TARGET", ...common));
      return;
    case "CHOICE":
      entries.push(entryV6("CHOICE_TARGET", ...common));
  }
}

function addEconomicPreviewEntriesV6(
  entries: RenderPlanEntryV6[],
  view: PlayerViewV6,
  selection: EconomicPreviewSelectionV6 | null,
): EconomicPreviewPlanV6 | null {
  if (selection === null || !selection.result.ok) return null;
  const verified = previewEconomicV6(view, selection.command);
  if (
    !verified.ok ||
    JSON.stringify(verified) !== JSON.stringify(selection.result)
  ) {
    return null;
  }
  const preview = verified.preview;
  entries.push(
    entryV6(
      "ECONOMIC_VALUE",
      preview.at,
      coordinateIdV6(preview.at, view.board.width),
      view.viewer.id,
      {
        command: selection.command,
        ownerCityId: preview.ownerCityId,
        cost: preview.cost,
        resultingContribution: preview.resultingContribution,
        populationDeltaByCity: preview.populationDeltaByCity,
        coinIncomeDeltaByCity: preview.coinIncomeDeltaByCity,
        capitalRoadConnected: preview.capitalRoadConnected,
      },
    ),
  );
  [...preview.contributingTiles]
    .sort(compareCoordsV6)
    .forEach((at, ordinal) => {
      const tile = tileAtV6(view, at);
      if (tile?.explored !== true) return;
      entries.push(
        entryV6(
          "ECONOMIC_CONTRIBUTOR",
          at,
          coordinateIdV6(at, view.board.width),
          tile.territoryOwnerId,
          {
            command: selection.command,
            ordinal,
            sourceCityId: tile.territoryCityId,
          },
        ),
      );
    });
  for (const axis of preview.oppositePairAxes) {
    entries.push(
      entryV6(
        "ECONOMIC_PAIR_AXIS",
        preview.at,
        coordinateIdV6(preview.at, view.board.width),
        view.viewer.id,
        { command: selection.command, axis },
        preview.oppositePairAxes.indexOf(axis),
      ),
    );
  }
  return { command: selection.command, result: verified };
}

function commandTargetV6(
  view: PlayerViewV6,
  command: CommandV6,
): MapCommandTargetV6 | null {
  if (command.kind === "MOVE") {
    const at = command.path.at(-1);
    return at === undefined
      ? null
      : mapTargetV6(
          view,
          "MOVE",
          at,
          coordinateIdV6(at, view.board.width),
          null,
          command,
        );
  }
  if (command.kind === "ATTACK") {
    const target = command.target;
    const entity =
      target.kind === "UNIT"
        ? view.units.find((unit) => unit.id === target.unitId)
        : view.chocolateWalls.find((wall) => wall.id === target.wallId);
    return entity === undefined || !isExploredV6(view, entity.at)
      ? null
      : mapTargetV6(
          view,
          "ATTACK",
          entity.at,
          entity.id,
          entity.ownerId,
          command,
        );
  }
  if (command.kind === "KAMIKAZE_ROLL") {
    const unit = visibleUnitV6(view, command.unitId);
    if (unit === null) return null;
    const delta = cardinalDeltaV6(command.direction);
    const at = { x: unit.at.x + delta.x, y: unit.at.y + delta.y };
    return mapTargetV6(
      view,
      "ROLL",
      at,
      coordinateIdV6(at, view.board.width),
      null,
      command,
    );
  }
  if (command.kind === "HEAL_ADJACENT") {
    const unit = visibleUnitV6(view, command.targetUnitId);
    return unit === null
      ? null
      : mapTargetV6(view, "HEAL", unit.at, unit.id, unit.ownerId, command);
  }
  if (command.kind === "BUILD_CHOCOLATE_WALL") {
    return isExploredV6(view, command.at)
      ? mapTargetV6(
          view,
          "WALL",
          command.at,
          coordinateIdV6(command.at, view.board.width),
          null,
          command,
        )
      : null;
  }
  if (SELF_ABILITY_KINDS.has(command.kind) && "unitId" in command) {
    const unit = visibleUnitV6(view, command.unitId);
    return unit === null
      ? null
      : mapTargetV6(
          view,
          "SELF_ABILITY",
          unit.at,
          unit.id,
          unit.ownerId,
          command,
        );
  }
  if (ECONOMIC_COMMAND_KINDS.has(command.kind) && "at" in command) {
    return isExploredV6(view, command.at)
      ? mapTargetV6(
          view,
          "ECONOMIC",
          command.at,
          coordinateIdV6(command.at, view.board.width),
          view.viewer.id,
          command,
        )
      : null;
  }
  if (command.kind === "TRAIN") {
    const city = visibleCityV6(view, command.cityId);
    return city === null
      ? null
      : mapTargetV6(view, "TRAIN", city.at, city.id, city.ownerId, command);
  }
  if (command.kind === "CHOOSE_CANDIFY_CITY") {
    const city = visibleCityV6(view, command.cityId);
    return city === null
      ? null
      : mapTargetV6(view, "CHOICE", city.at, city.id, city.ownerId, command);
  }
  if (command.kind === "CHOOSE_CITY_REWARD") {
    const city = visibleCityV6(view, command.cityId);
    return city === null
      ? null
      : mapTargetV6(view, "CHOICE", city.at, city.id, city.ownerId, command);
  }
  return null;
}

function mapTargetV6(
  _view: PlayerViewV6,
  family: MapCommandTargetFamilyV6,
  at: CoordV6,
  id: number,
  ownerId: number | null,
  command: CommandV6,
): MapCommandTargetV6 {
  return { family, at, id, ownerId, command };
}

function compareCommandTargetsV6(
  left: MapCommandTargetV6,
  right: MapCommandTargetV6,
): number {
  return (
    compareCommandsV6(left.command, right.command) ||
    compareCoordsV6(left.at, right.at) ||
    left.family.localeCompare(right.family) ||
    left.id - right.id
  );
}

function targetMatchesSelectionV6(
  target: MapCommandTargetV6,
  selection: BoardSelectionV6 | null,
): boolean {
  if (selection === null) return false;
  if (selection.kind === "UNIT") {
    return (
      "unitId" in target.command && target.command.unitId === selection.unitId
    );
  }
  if (selection.kind === "TILE") {
    return target.family === "ECONOMIC" && sameCoord(target.at, selection.at);
  }
  if (selection.kind === "CITY") {
    return (
      ("cityId" in target.command &&
        target.command.cityId === selection.cityId) ||
      (target.family === "CHOICE" && target.id === selection.cityId)
    );
  }
  return false;
}

function entryV6<Kind extends RenderEntryKindV6>(
  kind: Kind,
  at: CoordV6,
  id: number,
  ownerId: number | null,
  details: RenderEntryDetailsV6[Kind],
  variant = cosmeticVariantV6(at, kind),
): Extract<RenderPlanEntryV6, { readonly kind: Kind }> {
  return {
    key: `${kind}:${at.y},${at.x}:${id}:${variant}:${stableDetailsKeyV6(details)}`,
    kind,
    at,
    id,
    ownerId,
    variant,
    layer: semanticLayerV6(kind, details),
    details,
  } as Extract<RenderPlanEntryV6, { readonly kind: Kind }>;
}

/**
 * Game is the one resource whose visual contract is frontage on a tall terrain
 * body. It therefore shares ground-anchor depth sorting with Forest, while all
 * other resources remain in the low-object layer.
 */
function semanticLayerV6<Kind extends RenderEntryKindV6>(
  kind: Kind,
  details: RenderEntryDetailsV6[Kind],
): number {
  if (
    kind === "RESOURCE" &&
    (details as RenderEntryDetailsV6["RESOURCE"]).resource === "GAME"
  ) {
    return LAYER_V6.TERRAIN_BODY;
  }
  return LAYER_V6[kind];
}

function stableDetailsKeyV6(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

function cosmeticVariantV6(at: CoordV6, kind: RenderEntryKindV6): number {
  let value = Math.imul(at.x + 1, 0x45d9f3b) ^ Math.imul(at.y + 1, 0x119de1f3);
  for (let index = 0; index < kind.length; index += 1) {
    value = Math.imul(value ^ kind.charCodeAt(index), 0x01000193);
  }
  return (value >>> 0) % 4;
}

function coordinateIdV6(at: CoordV6, width: number): number {
  return at.y * width + at.x;
}

function selectionIdV6(selection: BoardSelectionV6, width: number): number {
  return selection.kind === "UNIT"
    ? selection.unitId
    : selection.kind === "CITY"
      ? selection.cityId
      : selection.kind === "WALL"
        ? selection.wallId
        : coordinateIdV6(selection.at, width);
}

function factionForOwnerV6(
  view: PlayerViewV6,
  ownerId: number | null,
): FactionIdV6 | null {
  return ownerId === null
    ? null
    : (view.players.find((player) => player.id === ownerId)?.faction ?? null);
}

function visibleUnitV6(
  view: PlayerViewV6,
  id: number,
): PlayerViewV6["units"][number] | null {
  const unit = view.units.find((candidate) => candidate.id === id);
  return unit !== undefined && isExploredV6(view, unit.at) ? unit : null;
}

function visibleCityV6(
  view: PlayerViewV6,
  id: number,
): PlayerViewV6["cities"][number] | null {
  const city = view.cities.find((candidate) => candidate.id === id);
  return city !== undefined && isExploredV6(view, city.at) ? city : null;
}

function isExploredV6(view: PlayerViewV6, at: CoordV6): boolean {
  return tileAtV6(view, at)?.explored === true;
}

function tileAtV6(
  view: PlayerViewV6,
  at: CoordV6,
): PlayerViewV6["board"]["tiles"][number] | undefined {
  if (!onBoardV6(view, at)) return undefined;
  return view.board.tiles[at.y * view.board.width + at.x];
}

function onBoardV6(view: PlayerViewV6, at: CoordV6): boolean {
  return (
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height
  );
}

function cardinalDeltaV6(direction: CardinalDirectionV6): CoordV6 {
  switch (direction) {
    case "NORTH":
      return { x: 0, y: -1 };
    case "EAST":
      return { x: 1, y: 0 };
    case "SOUTH":
      return { x: 0, y: 1 };
    case "WEST":
      return { x: -1, y: 0 };
  }
}

function compareCoordsV6(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}
