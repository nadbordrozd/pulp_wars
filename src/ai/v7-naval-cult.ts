import {
  isIceAtV7,
  unitIsIceboundV7,
  unitRoleMechanicsV7,
} from "../engine/rules/ruleset-v7";
import type { CombatPreviewV7 } from "../engine/v7/events";
import {
  publicDraggingKrakenV7,
  publicDraggingKrakensV7,
  queryCombatPreviewV7,
} from "../engine/v7/query";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  deepOfferingTenthsV7,
  exchangeTenthsV7,
  type NavalFleetFactsV7,
  type NavalToolsV7,
} from "./v7-naval";

/**
 * Themed naval branches, the Deep Ones (`pulp_wars-5ti.22`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 9.6): the Normal AI's
 * use of Offerings to the Deep and of the Kraken beyond
 * `src/ai/v7-naval.ts` (where the ram approach and the Battleship station
 * add the Favour of a kill afloat, `deepOfferingTenthsV7`), and every
 * other seat's respect for the Kraken's Drag.
 *
 * - **Offerings.** A Kraken's torpedo that sinks a unit afloat for Favour
 *   is fired first (`DEEP_OFFERING_TORPEDO_PRIORITY_V7`, above the
 *   Battleship torpedo) when the kill and the Favour are worth more than
 *   each of its other torpedoes and no other own Submarine follows on that
 *   target. Favour is worth a Coin (`NAVAL_FAVOUR_TENTHS_V7`), and only the
 *   part below the cap of 30 counts, so a seat at the cap sinks for the
 *   exchange alone and its summon plan (which reads the Favour it holds at
 *   every decision) spends what the sea paid on the same turn.
 * - **The Kraken holds.** Its routine Move values ending beside a hostile
 *   transport or Patrol Boat afloat (`navalKrakenHoldValueV7`), which its
 *   Drag then holds to one tile, when the visible enemy cannot sink it
 *   there and no hostile Battleship is beside the tile (the Submarine
 *   safety rules of `navalSubmarineMoveRejectedV7` still apply).
 * - **Against a Kraken.** A hostile unit afloat beside a visible Kraken that
 *   is hostile to it has a threat reach of one tile
 *   (`navalKrakenDraggedV7`), and an own transport does not end a Move
 *   beside a hostile Kraken unless it can land from there next turn
 *   (`navalKrakenTransportMoveRejectedV7`).
 *
 * Every function reads only the viewer's public view and exact previews.
 */

/** A torpedo kill that feeds the deep: above the Battleship torpedo (1279). */
export const DEEP_OFFERING_TORPEDO_PRIORITY_V7 = 1280;
/** A Kraken's Move beside a transport or a Patrol Boat it holds: above the screen (835). */
export const NAVAL_KRAKEN_HOLD_PRIORITY_V7 = 836;
/** A hostile transport a Kraken holds (it cannot sail on to its landing). */
export const NAVAL_KRAKEN_HOLD_TRANSPORT_VALUE_V7 = 16;
/** A hostile Patrol Boat a Kraken holds (it cannot run in for a Ram). */
export const NAVAL_KRAKEN_HOLD_BOAT_VALUE_V7 = 10;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/**
 * The priority of an own Kraken's torpedo whose kill pays Favour, or null.
 * It is the Offerings priority when the kill (the target's cost) and its
 * Favour (`deepOfferingTenthsV7`) are worth more, in tenths of a Coin,
 * than each other torpedo the same Submarine has on offer (its exchange and
 * any Favour it pays), and no other own Submarine with its attack unspent
 * has a torpedo on that other target (the two would sink it together).
 */
export function deepOfferingTorpedoPriorityV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number | null {
  if (
    !preview.torpedo ||
    !preview.defenderDies ||
    actor.ownerId !== view.viewer.id
  )
    return null;
  const favour = deepOfferingTenthsV7(view, actor, preview);
  if (favour <= 0) return null;
  const value = exchangeTenthsV7(view, actor, target, preview) + favour;
  for (const offered of tools.commands) {
    if (
      offered.kind !== "ATTACK" ||
      offered.unitId !== actor.id ||
      offered.targetUnitId === target.id
    )
      continue;
    const other = view.units.find((unit) => unit.id === offered.targetUnitId);
    const shot = queryCombatPreviewV7(view, actor.id, offered.targetUnitId);
    if (other === undefined || shot === null || !shot.torpedo) continue;
    const followed = tools.commands.some(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId !== actor.id &&
        command.targetUnitId === other.id &&
        queryCombatPreviewV7(view, command.unitId, other.id)?.torpedo === true,
    );
    if (followed) return null;
    const worth =
      exchangeTenthsV7(view, actor, other, shot) +
      deepOfferingTenthsV7(view, actor, shot);
    if (worth >= value) return null;
  }
  return DEEP_OFFERING_TORPEDO_PRIORITY_V7;
}

/** Whether `unit` is the viewer's own Kraken (a ship that Drags afloat). */
export function navalOwnKrakenV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "NAVAL" &&
    unit.summoned === undefined &&
    unitRoleMechanicsV7(view, unit).dragsAfloat
  );
}

/**
 * Section 9.6, "the Kraken": the value of a Move of an own Kraken to `to`:
 * what the hostile units afloat beside `to` that it would hold are worth
 * (a transport `NAVAL_KRAKEN_HOLD_TRANSPORT_VALUE_V7`, a Patrol Boat
 * `NAVAL_KRAKEN_HOLD_BOAT_VALUE_V7`), when that is more than it holds where
 * it stands. 0 on ice, beside a visible hostile Battleship (never next to
 * an untouched capital ship), and where the visible enemy can sink it on
 * its next turn.
 */
export function navalKrakenHoldValueV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  if (
    !navalOwnKrakenV7(view, actor) ||
    unitIsIceboundV7(view, actor) ||
    isIceAtV7(view, to)
  )
    return 0;
  if (facts.hostileBattleships.some((ship) => chebyshev(ship.at, to) <= 1))
    return 0;
  const held = (at: CoordV7): number => {
    let value = 0;
    for (const unit of view.units) {
      if (
        unit.hp <= 0 ||
        unit.id === actor.id ||
        chebyshev(unit.at, at) !== 1 ||
        !tools.isHostile(unit.ownerId) ||
        unitIsIceboundV7(view, unit)
      )
        continue;
      if (unit.form === "EMBARKED")
        value += NAVAL_KRAKEN_HOLD_TRANSPORT_VALUE_V7;
      else if (unit.form === "NAVAL" && unit.role === "PATROL_BOAT")
        value += NAVAL_KRAKEN_HOLD_BOAT_VALUE_V7;
    }
    return value;
  };
  const value = held(to);
  if (value <= held(actor.at)) return 0;
  const moved = tools.project(view, actor.id, { at: to });
  const there = moved.units.find((unit) => unit.id === actor.id);
  if (there === undefined || tools.danger(moved, there, to) >= actor.hp)
    return 0;
  return value;
}

/**
 * Section 9.6, "against a Kraken", the threat estimate: whether the visible
 * unit afloat begins its next Move beside a visible Kraken hostile to it
 * that is not on ice (its Move then covers one tile). The engine's own
 * public rule (`publicDraggingKrakenV7`); false at once in a view without
 * a Kraken.
 */
export function navalKrakenDraggedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  if (unit.form !== "NAVAL" && unit.form !== "EMBARKED") return false;
  return publicDraggingKrakenV7(view, unit.id) !== null;
}

/**
 * Section 9.6, "a transport does not end a routine Move next to a hostile
 * Kraken unless it lands from there next turn": whether a Move of an own
 * unit afloat (or one that embarks) ending on `to` is refused. It is when a
 * visible hostile Kraken that drags (not on ice) is beside `to`, the unit
 * is not already beside one (it may always move on), and no explored free
 * land tile beside `to` is there to land on.
 */
export function navalKrakenTransportMoveRejectedV7(
  view: PlayerViewV7,
  tools: Pick<NavalToolsV7, "isHostile">,
  actor: PublicUnitV7,
  to: CoordV7,
  embarks: boolean,
): boolean {
  if (actor.ownerId !== view.viewer.id || actor.form === "NAVAL") return false;
  if (actor.form !== "EMBARKED" && !embarks) return false;
  const krakens = publicDraggingKrakensV7(view).filter((kraken) =>
    tools.isHostile(kraken.ownerId),
  );
  if (krakens.length === 0) return false;
  const beside = (at: CoordV7): boolean =>
    krakens.some((kraken) => chebyshev(kraken.at, at) === 1);
  if (!beside(to)) return false;
  if (actor.form === "EMBARKED" && beside(actor.at)) return false;
  return !landsBesideV7(view, actor, to);
}

/** An explored land tile beside `at` with no visible unit (a landing). */
function landsBesideV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
): boolean {
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      if ((x === at.x && y === at.y) || x < 0 || y < 0) continue;
      if (x >= view.board.width || y >= view.board.height) continue;
      const tile = view.board.tiles[y * view.board.width + x];
      if (tile?.explored !== true || tile.biome === null) continue;
      if (
        view.units.some(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== actor.id &&
            unit.at.x === x &&
            unit.at.y === y,
        )
      )
        continue;
      return true;
    }
  return false;
}
