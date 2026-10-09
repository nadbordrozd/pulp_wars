import {
  previewBreakOffV7,
  previewKaboomV7,
  previewStompV7,
  previewSwallowV7,
  previewTossV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import { blastPreviewPresentationV7 } from "../goblin-presentation-v7";
import {
  BREAK_OFF_PICK_FIRST_V7,
  BREAK_OFF_TILE_LABEL_V7,
  STOMP_LABEL_V7,
  TOSS_PASSENGER_BADGE_V7,
  TOSS_PICK_TILE_V7,
  giantHitLabelV7,
  swallowTargetLabelV7,
  swallowTargetNameV7,
  tossTileLabelV7,
  tossTileNameV7,
} from "../giant-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The giants' part of the board plan (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10, docs/ui/BOARD_TARGETING.md
 * section 3.2): the four signature commands aimed on the board, one button
 * each in the dock. Swallow picks its victim (an Attack mark), Goblin Toss
 * its Goblin (a Help ring) and then the landing tile (a Place mark, the
 * focused tile showing the Goblin's Kaboom from there), Thunder Stomp shows
 * its 3 x 3 with each enemy's damage (any marked enemy, or the panel's one
 * confirmation, stomps), and Break Off picks one tile for each Gingerbread
 * Man (Place marks). Every target is an offered command; every number a
 * public preview.
 */
export type GiantPickV7 =
  | { readonly kind: "SWALLOW"; readonly unitId: UnitId }
  | {
      readonly kind: "TOSS";
      readonly unitId: UnitId;
      /** The Goblin to throw; null while it is being chosen. */
      readonly passengerUnitId: UnitId | null;
    }
  | { readonly kind: "STOMP"; readonly unitId: UnitId }
  | {
      readonly kind: "BREAK_OFF";
      readonly unitId: UnitId;
      /** The first Gingerbread Man's tile; null while it is being chosen. */
      readonly first: CoordV7 | null;
    };

/** Whether `kind` is one of the four aimed giant commands. */
export function isGiantPickCommandV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "SWALLOW" ||
    kind === "TOSS" ||
    kind === "STOMP" ||
    kind === "BREAK_OFF"
  );
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The offered Toss commands of the Troll, by Goblin. */
function tossCommandsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly Extract<CommandV7, { kind: "TOSS" }>[] {
  return commands.filter(
    (command): command is Extract<CommandV7, { kind: "TOSS" }> =>
      command.kind === "TOSS" && command.unitId === unitId,
  );
}

/** The Goblins the Troll may throw (each once, in command order). */
export function tossPassengersV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly UnitId[] {
  return [
    ...new Set(
      tossCommandsV7(commands, unitId).map(
        (command) => command.passengerUnitId,
      ),
    ),
  ];
}

/** The offered Break Off commands of the Giant. */
function breakOffCommandsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly Extract<CommandV7, { kind: "BREAK_OFF" }>[] {
  return commands.filter(
    (command): command is Extract<CommandV7, { kind: "BREAK_OFF" }> =>
      command.kind === "BREAK_OFF" && command.unitId === unitId,
  );
}

/**
 * The tiles that pair with the first Gingerbread Man's tile, each with the
 * offered command that places both.
 */
export function breakOffSecondTilesV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
  first: CoordV7,
): readonly {
  readonly at: CoordV7;
  readonly command: Extract<CommandV7, { kind: "BREAK_OFF" }>;
}[] {
  return breakOffCommandsV7(commands, unitId).flatMap((command) => {
    const [left, right] = command.tiles;
    if (same(left, first)) return [{ at: right, command }];
    if (same(right, first)) return [{ at: left, command }];
    return [];
  });
}

/**
 * The view as it would be once the Goblin `passengerUnitId` lands on `to`
 * (moved this turn), for the Kaboom preview of a landing tile.
 */
function thrownViewV7(
  view: PlayerViewV7,
  passengerUnitId: UnitId,
  to: CoordV7,
): PlayerViewV7 {
  return {
    ...view,
    units: view.units.map((unit) =>
      unit.id === passengerUnitId
        ? { ...unit, at: to, activation: { ...unit.activation, moved: true } }
        : unit,
    ),
  };
}

/**
 * The map targets of an active giant pick. `cursor` is the board's focused
 * tile: only that landing tile of a Toss reads its exact preview (one query
 * a focus, not one per tile).
 */
export function giantPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: GiantPickV7,
  cursor: CoordV7 | null,
): MapCommandTargetV7[] {
  const unitById = (id: number) => view.units.find((unit) => unit.id === id);
  if (pick.kind === "SWALLOW")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "SWALLOW" || command.unitId !== pick.unitId)
        return [];
      const preview = previewSwallowV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const target = unitById(command.targetUnitId);
      if (preview === null || target === undefined) return [];
      return [
        {
          at: target.at,
          command,
          family: "SWALLOW",
          previewLabel: swallowTargetLabelV7(preview),
          semanticLabel: swallowTargetNameV7(view, preview),
        },
      ];
    });
  if (pick.kind === "TOSS") {
    const tosses = tossCommandsV7(commands, pick.unitId);
    if (pick.passengerUnitId === null)
      return tossPassengersV7(commands, pick.unitId).flatMap(
        (id): MapCommandTargetV7[] => {
          const goblin = unitById(id);
          const command = tosses.find((entry) => entry.passengerUnitId === id);
          if (goblin === undefined || command === undefined) return [];
          return [
            {
              at: goblin.at,
              command,
              family: "TOSS_PASSENGER",
              previewLabel: TOSS_PASSENGER_BADGE_V7,
              semanticLabel: `Throw this ${unitRoleRuleV7(view, goblin).label} (${goblin.hp} HP). Then ${TOSS_PICK_TILE_V7.toLowerCase()}`,
            },
          ];
        },
      );
    return tosses
      .filter((command) => command.passengerUnitId === pick.passengerUnitId)
      .map((command): MapCommandTargetV7 => {
        const focused = cursor !== null && same(cursor, command.at);
        const preview = focused
          ? previewTossV7(
              view,
              pick.unitId,
              command.passengerUnitId,
              command.at,
            )
          : null;
        const label = preview === null ? null : tossTileLabelV7(preview);
        return {
          at: command.at,
          command,
          family: "TOSS",
          ...(label === null ? {} : { previewLabel: label }),
          semanticLabel:
            preview === null
              ? "Throw the Goblin here"
              : tossTileNameV7(preview),
        };
      });
  }
  if (pick.kind === "STOMP") {
    const command = commands.find(
      (candidate) =>
        candidate.kind === "STOMP" && candidate.unitId === pick.unitId,
    );
    const preview =
      command === undefined ? null : previewStompV7(view, pick.unitId);
    if (command === undefined || preview === null) return [];
    return preview.results.flatMap((entry): MapCommandTargetV7[] => {
      const target = unitById(entry.unitId);
      if (target === undefined) return [];
      return [
        {
          at: target.at,
          command,
          family: "STOMP",
          previewLabel: giantHitLabelV7(entry),
          semanticLabel: `${STOMP_LABEL_V7}: ${giantHitLabelV7(entry)} to this ${unitRoleRuleV7(view, target).label}${entry.dies ? ", lethal" : ""}, with every other marked enemy. Choose any marked enemy to stomp`,
        },
      ];
    });
  }
  // Break Off: the first tile, then the second (the command places both).
  if (pick.first === null) {
    const preview = previewBreakOffV7(view, pick.unitId);
    const all = breakOffCommandsV7(commands, pick.unitId);
    if (preview === null) return [];
    return preview.tiles.flatMap((at): MapCommandTargetV7[] => {
      const command = all.find(
        (candidate) =>
          same(candidate.tiles[0], at) || same(candidate.tiles[1], at),
      );
      return command === undefined
        ? []
        : [
            {
              at,
              command,
              family: "BREAK_OFF_FIRST",
              // No label per tile: the dock's prompt says what is placed.
              semanticLabel: `${BREAK_OFF_PICK_FIRST_V7}: here`,
            },
          ];
    });
  }
  return breakOffSecondTilesV7(commands, pick.unitId, pick.first).map(
    ({ at, command }): MapCommandTargetV7 => ({
      at,
      command,
      family: "BREAK_OFF",
      semanticLabel: `The second ${BREAK_OFF_TILE_LABEL_V7} here: choose to break off`,
    }),
  );
}

/**
 * Preview entries of an active giant pick that are not targets: the
 * Stomp's 3 x 3 (the area, and "Smash" on a Field Defense no marked enemy
 * stands on), the Kaboom the Goblin could set off from the focused landing
 * tile, and the first Gingerbread Man's chosen tile.
 */
export function addGiantPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: GiantPickV7,
  targets: readonly MapCommandTargetV7[],
  cursor: CoordV7 | null,
): void {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return;
  const explored = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => key(tile.at)),
  );
  const areaEntries = (cells: readonly CoordV7[], style: "BLAST"): void => {
    const area = new Set(cells.map(key));
    for (const at of cells)
      entries.push({
        key: `ability-area:${style}:${key(at)}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: style,
        targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
          (edge) =>
            !area.has(
              key({
                x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
                y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
              }),
            ),
        ),
      });
  };
  if (pick.kind === "STOMP") {
    if (
      !commands.some(
        (command) => command.kind === "STOMP" && command.unitId === actor.id,
      )
    )
      return;
    const cells: CoordV7[] = [];
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const at = { x: actor.at.x + dx, y: actor.at.y + dy };
        if ((dx !== 0 || dy !== 0) && explored.has(key(at))) cells.push(at);
      }
    areaEntries(cells, "BLAST");
    const preview = previewStompV7(view, actor.id);
    const hit = new Set(targets.map((target) => key(target.at)));
    for (const at of preview?.fieldDefenses ?? [])
      if (!hit.has(key(at)))
        entries.push({
          key: `ability-target:STOMP_SMASH:${key(at)}`,
          kind: "ABILITY_TARGET",
          layer: 7.5,
          at,
          abilityStyle: "BLAST",
          label: "Smash",
          lethal: false,
        });
    return;
  }
  if (pick.kind === "TOSS" && pick.passengerUnitId !== null) {
    // The Goblin's Kaboom from the focused landing tile, while it may
    // still act there (the engine's exact public preview of the thrown
    // view).
    const landing =
      cursor === null
        ? undefined
        : targets.find(
            (target) => target.family === "TOSS" && same(target.at, cursor),
          );
    if (landing === undefined || landing.command.kind !== "TOSS") return;
    const toss = previewTossV7(
      view,
      actor.id,
      pick.passengerUnitId,
      landing.at,
    );
    if (toss === null || !toss.passengerMayAct) return;
    const thrown = thrownViewV7(view, pick.passengerUnitId, landing.at);
    const kaboom = previewKaboomV7(thrown, pick.passengerUnitId);
    if (kaboom === null) return;
    const blast = blastPreviewPresentationV7(
      thrown,
      kaboom,
      pick.passengerUnitId,
    );
    areaEntries(blast.area, "BLAST");
    for (const cell of blast.cells)
      entries.push({
        key: `ability-target:BLAST:${key(cell.at)}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: cell.at,
        abilityStyle: cell.friendly ? "BLAST_FRIENDLY" : "BLAST",
        label: cell.label,
        lethal: cell.lethal,
      });
    return;
  }
  if (pick.kind === "BREAK_OFF" && pick.first !== null)
    entries.push({
      key: `ability-target:BREAK_OFF_FIRST:${key(pick.first)}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: pick.first,
      abilityStyle: "NEST",
      label: BREAK_OFF_TILE_LABEL_V7,
      lethal: false,
    });
}
