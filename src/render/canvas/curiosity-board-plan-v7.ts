import {
  MOON_GUN_RANGE_V7,
  TESLA_ZAP_RANGE_V7,
  cooperativeAlliesV7,
  isNeutralOwnerV7,
  moonGunAtV7,
  previewZapV7,
  queryThreatenedTilesV7,
  teslaTowerAtV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  CURIOSITY_LABELS_V7,
  FIRE_MOON_GUN_LABEL_V7,
  FIRE_MOON_GUN_PICK_V7,
  ZAP_CHAIN_NOTE_V7,
  ZAP_LABEL_V7,
  ZAP_OWN_RISK_WARNING_V7,
  ZAP_PICK_V7,
  monsterPreviewsV7,
  hostileBreedV7,
  neutralUnitLabelV7,
  neutralBreedOfUnitV7,
  zapTargetLabelV7,
} from "../curiosity-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";
import type { TileEdge } from "./geometry";

/**
 * Map curiosities round 3 on the board (bead pulp_wars-737.20,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1,
 * docs/ui/BOARD_TARGETING.md section 3.10): the aimed Zap of a unit on the
 * Tesla Tower (every legal target marked with the Attack mark and its exact
 * damage, "Zap −4" or "Zap −4 · KO") and the aimed shot of a unit on the
 * Moon Gun (every legal landing tile marked with the Move mark; a tile in a
 * visible enemy's reach says so, and one on a neutral unit's provoke tiles
 * carries the provoked marker), and the range of a selected Tower or Gun
 * outlined. Every target is an offered command; every number the engine's
 * public preview.
 */

/** A Zap or a Moon Gun shot being aimed on the board. */
export interface CuriosityPickV7 {
  readonly kind: "ZAP" | "FIRE_MOON_GUN";
  readonly unitId: UnitId;
}

/**
 * What the cursor and screen readers say of a landing tile a visible enemy
 * can reach. On the board such a tile carries the threat marker (the
 * provoked corner badge) and no label box: a row of labels next to an
 * enemy hid the landings themselves (review, bead pulp_wars-737.20).
 */
export const MOON_GUN_DANGER_LABEL_V7 = "In enemy reach";

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const TILE_EDGES: readonly TileEdge[] = ["NORTH", "EAST", "SOUTH", "WEST"];

function hostile(view: PlayerViewV7, owner: number): boolean {
  return (
    owner !== view.viewer.id &&
    !cooperativeAlliesV7(view.setup, view.humanPlayerId, owner, view.viewer.id)
  );
}

/** The name of a target: "the Goblins' Fighter", "the Giant Spider". */
function targetName(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  if (isNeutralOwnerV7(unit.ownerId))
    return `the ${neutralUnitLabelV7(neutralBreedOfUnitV7(view, unit))}`;
  return `this ${unitRoleRuleV7(view, unit).label}`;
}

/** The map targets of an aimed Zap or Moon Gun shot. */
export function curiosityPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: CuriosityPickV7,
): MapCommandTargetV7[] {
  if (pick.kind === "ZAP") {
    const preview = previewZapV7(view, pick.unitId);
    if (preview === null) return [];
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "ZAP" || command.unitId !== pick.unitId) return [];
      const hit = preview.targets.find(
        (entry) => entry.targetUnitId === command.targetUnitId,
      );
      const target = view.units.find(
        (unit) => unit.id === command.targetUnitId,
      );
      if (hit === undefined || target === undefined) return [];
      // The chain lightning (`pulp_wars-737.22`): the jumps are random, so
      // the target carries their damage as a note, the units the first jump
      // may hit are shaded lightly, and a warning says when a jump can
      // reach the viewer's side.
      const next = hit.chain.next.flatMap((unitId) => {
        const unit = view.units.find((candidate) => candidate.id === unitId);
        return unit === undefined
          ? []
          : [{ at: unit.at, own: !hostile(view, unit.ownerId) }];
      });
      return [
        {
          at: target.at,
          command,
          family: "ZAP",
          previewLabel: zapTargetLabelV7(hit),
          ...(next.length === 0
            ? {}
            : { previewFocusNote: ZAP_CHAIN_NOTE_V7, zapChain: next }),
          ...(hit.chain.mayHitOwn
            ? { previewWarnings: [ZAP_OWN_RISK_WARNING_V7] }
            : {}),
          previewSkullBefore: hit.kills ? ["KO"] : [],
          hpLoss: [
            {
              unitId: target.id,
              at: target.at,
              damage: hit.damage,
              lethal: hit.kills,
              role: "TARGET",
              hp: target.hp,
              maxHp: target.maxHp,
            },
          ],
          semanticLabel: `${ZAP_LABEL_V7}: ${targetName(view, target)} takes ${hit.damage} damage${hit.shieldDamage > 0 ? ` and its Shield ${hit.shieldDamage}` : ""}${hit.kills ? " and is knocked out" : ""}. It cannot strike back.${next.length === 0 ? " Nothing stands next to it, so the lightning stops there." : ` The lightning then jumps to a random neighbour (${next.length} next to it) for ${hit.chain.damages.join(", then ")}.`}${hit.chain.mayHitOwn ? ` ${ZAP_OWN_RISK_WARNING_V7}.` : ""} ${ZAP_PICK_V7}.`,
        },
      ];
    });
  }
  const threatened = new Set<string>();
  for (const unit of view.units)
    if (unit.hp > 0 && hostile(view, unit.ownerId))
      for (const at of queryThreatenedTilesV7(view, unit.id))
        threatened.add(key(at));
  const provoked = new Set<string>();
  for (const preview of monsterPreviewsV7(view))
    if (hostileBreedV7(preview.breed))
      for (const at of preview.provokeTiles) provoked.add(key(at));
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "FIRE_MOON_GUN" || command.unitId !== pick.unitId)
      return [];
    const danger = threatened.has(key(command.at));
    return [
      {
        at: command.at,
        command,
        family: "MOON_GUN",
        ...(danger || provoked.has(key(command.at))
          ? { provokes: true as const }
          : {}),
        semanticLabel: `${FIRE_MOON_GUN_LABEL_V7}: land here${danger ? ` (${MOON_GUN_DANGER_LABEL_V7.toLowerCase()})` : ""}${provoked.has(key(command.at)) ? ", where a neutral monster will attack it" : ""}. The unit lands spent. ${FIRE_MOON_GUN_PICK_V7}.`,
      },
    ];
  });
}

/**
 * The outline of the range of the round-3 curiosity a selection shows: a
 * selected Tesla Tower's zap range (within 2) or Moon Gun's landing range
 * (within 5), as far as explored; also the Tower or Gun under a unit whose
 * Zap or shot is aimed.
 */
export function addCuriosityRangeEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  at: CoordV7 | null,
): void {
  if (at === null || view.curiosities.length === 0) return;
  const radius =
    teslaTowerAtV7(view.curiosities, at) !== null
      ? TESLA_ZAP_RANGE_V7
      : moonGunAtV7(view.curiosities, at) !== null
        ? MOON_GUN_RANGE_V7
        : null;
  if (radius === null) return;
  const tiles: CoordV7[] = [];
  for (let y = at.y - radius; y <= at.y + radius; y += 1)
    for (let x = at.x - radius; x <= at.x + radius; x += 1)
      if (
        x >= 0 &&
        y >= 0 &&
        x < view.board.width &&
        y < view.board.height &&
        view.board.tiles[y * view.board.width + x]?.explored === true
      )
        tiles.push({ x, y });
  const set = new Set(tiles.map(key));
  for (const tile of tiles)
    entries.push({
      key: `ability-area:CURIOSITY_RANGE:${key(tile)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at: tile,
      abilityStyle: "CURIOSITY_RANGE",
      targetEdges: TILE_EDGES.filter((edge) => {
        const next =
          edge === "NORTH"
            ? { x: tile.x, y: tile.y - 1 }
            : edge === "SOUTH"
              ? { x: tile.x, y: tile.y + 1 }
              : edge === "EAST"
                ? { x: tile.x + 1, y: tile.y }
                : { x: tile.x - 1, y: tile.y };
        return !set.has(key(next));
      }),
    });
}

/** The prompt of an aimed pick, for the dock's panel. */
export function curiosityPickPromptV7(pick: CuriosityPickV7): string {
  return pick.kind === "ZAP" ? ZAP_PICK_V7 : FIRE_MOON_GUN_PICK_V7;
}

/** The curiosity under the unit of a pick (the Tower or the Gun). */
export function curiosityPickLabelV7(pick: CuriosityPickV7): string {
  return pick.kind === "ZAP"
    ? CURIOSITY_LABELS_V7.TESLA_TOWER
    : CURIOSITY_LABELS_V7.MOON_GUN;
}
