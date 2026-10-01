import {
  effectiveRoleRuleV7,
  roleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { previewHatchV7, previewStampedeV7 } from "../engine/v7/query";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";

/**
 * Revision 19 Normal AI Dinosaur helpers.
 *
 * `pulp_wars-c87.3` adds only what a Dinosaur seat needs to play complete
 * matches legally: a deterministic nest-tile choice for `LAY_EGG` and a
 * previewed value for the offered `STAMPEDE` and `HATCH` commands. The full
 * Dinosaur policy (Egg protection, lane play, growth, playing against
 * Dinosaurs) is `pulp_wars-c87.5`.
 *
 * Every function reads only the viewer's public view, public commands, and
 * public previews. Nothing here draws from the PRNG, reads authoritative
 * state, or depends on elapsed time. The policy reaches these helpers only
 * through `LAY_EGG`, `HATCH`, and `STAMPEDE` commands, which are offered only
 * to a Dinosaur seat, so every other decision stays byte-identical.
 */

/** A Stampede that kills: an ordinary attack kill (1180). */
export const STAMPEDE_KILL_PRIORITY_V7 = 1180;
/** A Stampede that only damages: an ordinary chip attack (900). */
export const STAMPEDE_CHIP_PRIORITY_V7 = 900;
/** A Hatch: just above ordinary land production (1080). */
export const HATCH_PRIORITY_V7 = 1085;
/** Each hatch turn of an Egg laid in a threatened city costs this much. */
export const THREATENED_EGG_DELAY_COST_V7 = 12;

type LayEggCommandV7 = Extract<CommandV7, { kind: "LAY_EGG" }>;

/**
 * The one `LAY_EGG` the policy considers for each city and role: the offered
 * nest tile farthest (Chebyshev) from every visible hostile unit that is not
 * an Egg, the first in (y, x) order on a tie. With no visible hostile unit
 * it is the first offered tile.
 */
export function chosenLayEggCommandsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): ReadonlySet<CommandV7> {
  const chosen = new Map<
    string,
    { readonly command: LayEggCommandV7; readonly safety: number }
  >();
  let hostiles: readonly CoordV7[] | null = null;
  for (const command of commands) {
    if (command.kind !== "LAY_EGG") continue;
    hostiles ??= view.units
      .filter(
        (unit) =>
          unit.hp > 0 && unit.form !== "EGG" && hostileV7(view, unit.ownerId),
      )
      .map((unit) => unit.at);
    const safety = hostiles.reduce(
      (nearest, at) => Math.min(nearest, distanceV7(at, command.at)),
      Number.MAX_SAFE_INTEGER,
    );
    const key = `${command.cityId}:${command.role}`;
    const best = chosen.get(key);
    if (
      best === undefined ||
      safety > best.safety ||
      (safety === best.safety &&
        (command.at.y - best.command.at.y || command.at.x - best.command.at.x) <
          0)
    )
      chosen.set(key, { command, safety });
  }
  return new Set([...chosen.values()].map((entry) => entry.command));
}

/**
 * The land-production value adjustment of a command: an Egg laid in a
 * threatened city defends nothing until it hatches, so each hatch turn
 * counts against it there. Zero for every other command.
 */
export function layEggAdjustmentV7(
  view: PlayerViewV7,
  command: CommandV7,
  threatened: boolean,
): number {
  if (command.kind !== "LAY_EGG" || !threatened) return 0;
  return (
    -THREATENED_EGG_DELAY_COST_V7 *
    (roleMechanicsV7(command.role, view.viewer.faction).hatchTurns ?? 0)
  );
}

/**
 * The previewed value of an offered `STAMPEDE` or `HATCH`. A Stampede is
 * valued like an attack (a kill, or its damage), and declined when its
 * death-blast chain would kill an own or allied unit. A Hatch is valued by
 * the unit that appears and the turns it saves.
 */
export function dinosaurActionScoreV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "STAMPEDE" | "HATCH" }>,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  if (command.kind === "HATCH") {
    const preview = previewHatchV7(view, command.unitId, command.eggUnitId);
    if (preview === null) return { priority: -1, strategic: 0, immediate: 0 };
    return {
      priority: HATCH_PRIORITY_V7,
      strategic:
        effectiveRoleRuleV7(preview.role, view.viewer.faction).maxHp +
        10 * preview.turnsSaved,
      immediate: 0,
    };
  }
  const preview = previewStampedeV7(view, command.unitId, command.targetUnitId);
  if (
    preview === null ||
    preview.combat.damageToDefender <= 0 ||
    preview.explosions.totals.friendlyKills > 0
  )
    return { priority: -1, strategic: 0, immediate: 0 };
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  const targetValue =
    target === undefined
      ? 0
      : (unitRoleRuleV7(view, target).cost ?? 0) * 4 + target.hp;
  return {
    priority: preview.combat.defenderDies
      ? STAMPEDE_KILL_PRIORITY_V7
      : STAMPEDE_CHIP_PRIORITY_V7,
    strategic:
      (preview.combat.defenderDies ? targetValue : 0) +
      preview.explosions.totals.hostileDamage -
      preview.explosions.totals.friendlyDamage,
    immediate: preview.combat.damageToDefender,
  };
}

const STAMPEDE_HOLDS_V7 = new WeakMap<PlayerViewV7, ReadonlySet<number>>();

/**
 * The own units that hold their Move this turn because a worthwhile Stampede
 * is offered for them (a Triceratops cannot Stampede after moving). Cached
 * per view; empty for every seat that is offered no `STAMPEDE`.
 */
export function stampedeHoldUnitIdsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): ReadonlySet<number> {
  const cached = STAMPEDE_HOLDS_V7.get(view);
  if (cached !== undefined) return cached;
  const holds = new Set<number>();
  for (const command of commands)
    if (
      command.kind === "STAMPEDE" &&
      !holds.has(command.unitId) &&
      dinosaurActionScoreV7(view, command).priority >= 0
    )
      holds.add(command.unitId);
  STAMPEDE_HOLDS_V7.set(view, holds);
  return holds;
}

function hostileV7(view: PlayerViewV7, ownerId: number): boolean {
  if (ownerId === view.viewer.id) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    ownerId === view.humanPlayerId ||
    view.viewer.id === view.humanPlayerId
  );
}

const distanceV7 = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
