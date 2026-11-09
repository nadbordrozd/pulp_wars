import {
  previewColdSnapV7,
  previewCrackIceV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_WEST_V7,
} from "../../assets/sea-ice-v7";
import {
  CRACK_ICE_PICK_V7,
  crackIceOutcomeTextV7,
  crackIceTargetLabelV7,
  freezeRingLabelV7,
  freezesRingV7,
} from "../frozen-sea-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The frozen sea on the board plan (bead pulp_wars-5ti.7, second part;
 * docs/ui/BOARD_TARGETING.md section 3.5): the ice of each water cell (its
 * depth, its edges against open water, its snow or cracks), the Crack Ice
 * picking mode, the ring of the Ice Witch's Cold Snap (the one Freeze
 * effect, `pulp_wars-xv0t`, 7r133: water to ice, open land to Snow; the
 * line roles' `FREEZE` is gone; the skate trail went with `pulp_wars-ecnj`,
 * 7r135). Everything is read from the
 * public view, the offered commands and the public previews.
 */

/** TERRAIN only: the sea ice over a water cell. */
export interface SeaIceCellV7 {
  readonly depth: "SHALLOW" | "DEEP";
  /** SEA_ICE_EDGE_* bits: the sides where the ice meets open water. */
  readonly openWater: number;
  /** The edge's stable variant (0 or 1). */
  readonly variant: number;
  // (`permanent`, thick ice dusted with snow, and `stage`, its cracks,
  // went with Glacier: the naval branch rebuilt, `pulp_wars-tzk6`, 7r137.)
}

/**
 * Another faction's Crack Ice being aimed (the frozen sea redesign, bead
 * pulp_wars-5ti.27; a line role's `FREEZE` was aimed the same way until
 * `pulp_wars-xv0t`): its tiles are the only map targets.
 */
export interface FreezePickV7 {
  readonly kind: "CRACK_ICE";
  readonly unitId: UnitId;
}

/** What the plan shows of the Witch's ring: quiet at rest, or prominent. */
export type FreezeRingWeightV7 = "QUIET" | "PROMINENT";

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The sea ice of every explored water cell that has an entry. */
export function seaIceCellsV7(
  view: PlayerViewV7,
): ReadonlyMap<string, SeaIceCellV7> {
  const cells = new Map<string, SeaIceCellV7>();
  if (view.ice.length === 0) return cells;
  const ice = new Set(view.ice.map((entry) => key(entry.at)));
  const terrain = new Map<string, string>();
  for (const tile of view.board.tiles)
    if (tile.explored) terrain.set(key(tile.at), tile.terrain);
  for (const entry of view.ice) {
    const under = terrain.get(key(entry.at));
    if (under !== "SHALLOW_WATER" && under !== "DEEP_WATER") continue;
    let openWater = 0;
    for (const [bit, dx, dy] of [
      [SEA_ICE_EDGE_NORTH_V7, 0, -1],
      [SEA_ICE_EDGE_EAST_V7, 1, 0],
      [SEA_ICE_EDGE_SOUTH_V7, 0, 1],
      [SEA_ICE_EDGE_WEST_V7, -1, 0],
    ] as const) {
      const neighbour = { x: entry.at.x + dx, y: entry.at.y + dy };
      const beside = terrain.get(key(neighbour));
      // Open water: an explored water cell without ice. The shore, more
      // ice, the board's edge and the unknown leave the sheet whole.
      if (
        (beside === "SHALLOW_WATER" || beside === "DEEP_WATER") &&
        !ice.has(key(neighbour))
      )
        openWater |= bit;
    }
    cells.set(key(entry.at), {
      depth: under === "SHALLOW_WATER" ? "SHALLOW" : "DEEP",
      openWater,
      variant: (entry.at.x * 7 + entry.at.y * 13) & 1,
    });
  }
  return cells;
}

/**
 * The map targets of an armed Crack Ice (the frozen sea redesign,
 * RULESET_7_ICE_REDESIGN.md section 4.1): one per offered `CRACK_ICE` of
 * the unit, on its ice tile, labelled with the exact outcome of
 * `previewCrackIceV7`. It harms the owner's work, so it wears the Attack
 * mark.
 */
export function crackIcePickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: FreezePickV7,
): MapCommandTargetV7[] {
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "CRACK_ICE" || command.unitId !== pick.unitId)
      return [];
    const preview = previewCrackIceV7(view, command.unitId, command.at);
    if (preview === null) return [];
    return [
      {
        at: command.at,
        command,
        family: "CRACK_ICE",
        previewLabel: crackIceTargetLabelV7(),
        semanticLabel: `${crackIceOutcomeTextV7()} ${CRACK_ICE_PICK_V7}.`,
      },
    ];
  });
}

/** The outer edges of a set of cells, for an area's dashed outline. */
function areaEdges(
  cells: ReadonlySet<string>,
  at: CoordV7,
): ("NORTH" | "EAST" | "SOUTH" | "WEST")[] {
  return (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
    (edge) =>
      !cells.has(
        key({
          x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
          y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
        }),
      ),
  );
}

function addFrozenPreviewEntries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  ships: ReadonlySet<number>,
): void {
  for (const id of ships) {
    const ship = view.units.find((unit) => unit.id === id);
    if (ship === undefined) continue;
    entries.push({
      key: `ability-target:FROZEN:${id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: ship.at,
      abilityStyle: "FROZEN",
      label: "Frozen",
    });
  }
}

/**
 * The Ice Witch's Cold Snap (`pulp_wars-s55m.1`: one tap casts it; the one
 * Freeze effect, `pulp_wars-xv0t`, 7r133: it freezes every tile around
 * her): while she is selected and her Cold Snap is on offer, the tiles it
 * would freeze (water to ice, open land to Snow) are marked quiet; while
 * its button is hovered or focused the ring is prominent, with the
 * outcome's label ("Ice 2 · Snow 3") on her tile and "Frozen" on every unit
 * it Freezes. They are not targets.
 */
export function addFreezeRingEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: number,
  weight: FreezeRingWeightV7,
): void {
  const witch = view.units.find((candidate) => candidate.id === unitId);
  if (
    witch === undefined ||
    witch.ownerId !== view.viewer.id ||
    !freezesRingV7(view, witch) ||
    !commands.some(
      (candidate) =>
        candidate.kind === "COLD_SNAP" && candidate.unitId === unitId,
    )
  )
    return;
  const preview = previewColdSnapV7(view, witch.id);
  if (preview === null) return;
  const ring = [...preview.tiles, ...preview.snow];
  const area = new Set(ring.map(key));
  for (const at of ring)
    entries.push({
      key: `ability-area:FREEZE:${key(at)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at,
      abilityStyle: weight === "PROMINENT" ? "FREEZE_FOCUS" : "FREEZE",
      targetEdges: areaEdges(area, at),
    });
  if (weight !== "PROMINENT") return;
  if (ring.length > 0)
    entries.push({
      key: `ability-target:FREEZE_RING:${unitId}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: witch.at,
      abilityStyle: "FREEZE_FOCUS",
      label: freezeRingLabelV7(preview.tiles.length, preview.snow.length),
    });
  addFrozenPreviewEntries(
    entries,
    view,
    new Set(preview.targets.map((target) => target.unitId)),
  );
}
