import {
  factionTreeV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { queryCombatPreviewV7 } from "../engine/v7/query";
import type { TechnologyIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  drownedCrewRisingTenthsV7,
  exchangeTenthsV7,
  type NavalToolsV7,
} from "./v7-naval";

/**
 * Themed naval branches, the Undead Drowned Fleet
 * (`pulp_wars-5ti.17`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
 * 4.6): the Normal AI's use of Drowned Crews and of the Plague Galleon
 * beyond `src/ai/v7-naval.ts` (where the ram approach and the Battleship
 * station add the risen Ghost Ship, `drownedCrewRisingTenthsV7`, and the
 * station counts the living units a Galleon would plague).
 *
 * - A Sunken Galley's torpedo that sinks a ship and raises a Ghost Ship is
 *   fired first (`DROWNED_CREW_TORPEDO_PRIORITY_V7`, above the Battleship
 *   torpedo) when the kill and the risen ship are worth more than each of
 *   its other torpedoes and no other own Submarine follows on that target.
 * - A seat with a Plague Galleon researches Pestilence
 *   (`navalPlagueTechnologyV7`).
 *
 * Every function reads only the viewer's public view and exact previews.
 */

/** A torpedo kill that raises a Ghost Ship: above the Battleship torpedo (1279). */
export const DROWNED_CREW_TORPEDO_PRIORITY_V7 = 1280;
/** Pestilence for a seat with a Plague Galleon: above the army's due research (1219). */
export const NAVAL_PLAGUE_RESEARCH_PRIORITY_V7 = 1220;

/**
 * The priority of an own Submarine's torpedo whose preview raises a Ghost
 * Ship (`defenderInfected`), or null. It is the Drowned Crews priority when
 * the kill (the target's cost) and the risen ship
 * (`drownedCrewRisingTenthsV7`) are worth more, in tenths of a Coin, than
 * each other torpedo the same Submarine has on offer (its exchange and any
 * Ghost Ship it raises), and no other own Submarine with its attack unspent
 * has a torpedo on that other target (the two would sink it together).
 */
export function drownedCrewTorpedoPriorityV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number | null {
  if (
    !preview.torpedo ||
    !preview.defenderInfected ||
    actor.ownerId !== view.viewer.id
  )
    return null;
  const value =
    exchangeTenthsV7(view, actor, target, preview) +
    drownedCrewRisingTenthsV7(view, tools, actor, preview);
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
      drownedCrewRisingTenthsV7(view, tools, actor, shot);
    if (worth >= value) return null;
  }
  return DROWNED_CREW_TORPEDO_PRIORITY_V7;
}

/**
 * The technology that makes the viewer's Plague Galleon plague
 * (Pestilence, the tree's node whose unlock gives the capability
 * `plague`), when the viewer owns a ship whose role has the `PLAGUE`
 * ability and has not that capability; otherwise null. The caller asks for
 * the first step of its chain. (A Lich keeps the army's rule.)
 */
export function navalPlagueTechnologyV7(
  view: PlayerViewV7,
): TechnologyIdV7 | null {
  const researched = view.viewer.researchedTechs;
  if (technologyCapabilitiesV7(researched, view.viewer.faction).plague)
    return null;
  const galleon = view.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.ownerId === view.viewer.id &&
      unit.form === "NAVAL" &&
      unitRoleRuleV7(view, unit).abilities.includes("PLAGUE"),
  );
  if (!galleon) return null;
  for (const node of factionTreeV7(view.viewer.faction).nodes)
    if (
      !researched.includes(node.id) &&
      technologyCapabilitiesV7([...researched, node.id], view.viewer.faction)
        .plague
    )
      return node.id;
  return null;
}
