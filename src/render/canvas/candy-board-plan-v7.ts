import {
  previewCrumbsEatV7,
  previewRebakeV7,
  previewSugarRushV7,
  previewSugarTossV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../engine/index";
import {
  SUGAR_RUSH_LABEL_V7,
  candyChipsV7,
  candyCombatLinesV7,
  candyStatsV7,
  crumbsTileLinesV7,
  eatsCrumbsTextV7,
  homeSweetHomeChipV7,
  matchHasCandySeatV7,
  rebakeBoardLabelV7,
  rebakeTargetNameV7,
  sugarTossTargetNameV7,
} from "../candy-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The Candy part of the board plan (bead pulp_wars-jdb.6, docs/product/
 * RULESET_7_CANDY.md section 15.1): the Rushed, Crashed, Splatted and Home
 * Sweet Home markers of each unit and a Rushed Chocolate Bunny's Sugar Frenzy
 * pips, the Crumbs of each tile, the armed Sugar Rush and the Re-bake and
 * Sugar Toss picking modes, the "Eats Crumbs" label of a Move, and the
 * Candy lines of an attack preview (the Bounce's arrow among them).
 * Everything is read from the public view, the offered commands and the
 * public previews; nothing is recomputed.
 */

/** UNIT only: the Candy markers of a visible unit (any owner). */
export interface CandyUnitMarkersV7 {
  /** Rushed: the sparkle chip beside its head. */
  readonly rushed: boolean;
  /** Crashed: the dizzy swirl over its head and the droopy tint. */
  readonly crashed: boolean;
  /** Splatted: the cream pie on its face. */
  readonly splatted: boolean;
  /** The owner's view: a Rushed unit that will not Crash where it stands. */
  readonly home: boolean;
}

/** CRUMBS only: the Crumbs of a tile. */
export interface CandyCrumbsMarkerV7 {
  readonly role: UnitRoleIdV7;
  /** Up to three pips. */
  readonly turnsLeft: number;
  /** Peppermint Surprise: an enemy that eats them is hurt. */
  readonly bite: boolean;
}

/**
 * A Candy ability being aimed on the board. While one is active its targets
 * are the only map targets of the selected unit. An armed SUGAR_RUSH shows
 * the Rushed reach and the attacks with the Rush bonus; choosing one sends
 * `SUGAR_RUSH` and then the Move or the Attack.
 */
export interface CandyPickV7 {
  readonly kind: "SUGAR_RUSH" | "REBAKE" | "SUGAR_TOSS";
  readonly unitId: UnitId;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The board markers of a visible unit in a match with a Candy seat. */
export function candyUnitMarkersV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): CandyUnitMarkersV7 | undefined {
  const stats = candyStatsV7(view, unit.id);
  const rushed = stats.rushed === true;
  const crashed = stats.crashed === true;
  const splatted = stats.splatted === true;
  if (!rushed && !crashed && !splatted) return undefined;
  return {
    rushed,
    crashed,
    splatted,
    home: homeSweetHomeChipV7(view, unit, stats),
  };
}

/** The spoken cue of a unit's Candy statuses, for the cursor description. */
export function candyCursorCueV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  return candyChipsV7(view, unit)
    .map((chip) => chip.status)
    .join(", ");
}

/** The plan entries of every Crumbs tile of the view. */
export function candyCrumbsEntriesV7(
  view: PlayerViewV7,
): BoardRenderPlanEntryV7[] {
  return view.crumbs.map((entry) => ({
    key: `crumbs:${entry.at.x},${entry.at.y}`,
    kind: "CRUMBS" as const,
    layer: 4.5,
    at: entry.at,
    ownerId: entry.ownerId,
    artSubject: "CRUMBS" as const,
    label: crumbsTileLinesV7(view, entry.at).join(". "),
    crumbs: {
      role: entry.role,
      turnsLeft: entry.turnsLeft,
      bite: entry.bite > 0,
    },
  }));
}

/**
 * "Eats Crumbs" or "Eats Crumbs: −3" for an offered Move or landing of the
 * viewer's unit onto hostile Crumbs, from the exact public preview; null
 * for every other tile.
 */
export function crumbsEatLabelV7(
  view: PlayerViewV7,
  unitId: UnitId,
  to: CoordV7,
): { readonly label: string; readonly lethal: boolean } | null {
  if (view.crumbs.length === 0) return null;
  const preview = previewCrumbsEatV7(view, unitId, to);
  return preview === null
    ? null
    : {
        label: eatsCrumbsTextV7(preview.damage + preview.shieldDamage),
        lethal: preview.dies,
      };
}

/**
 * The map targets of an active Candy pick. `rushAttacks` are the selected
 * unit's ordinary attack targets as the board builds them, estimated with
 * the Rush bonus (an armed Sugar Rush only); `ghost` gives the art of a
 * role the viewer would bake back.
 */
export function candyPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: CandyPickV7,
  rushAttacks: readonly MapCommandTargetV7[],
  ghost: (role: UnitRoleIdV7) => NonNullable<MapCommandTargetV7["rebake"]>,
): MapCommandTargetV7[] {
  const unitById = (id: number) => view.units.find((unit) => unit.id === id);
  if (pick.kind === "SUGAR_RUSH") {
    const command = commands.find(
      (candidate): candidate is Extract<CommandV7, { kind: "SUGAR_RUSH" }> =>
        candidate.kind === "SUGAR_RUSH" && candidate.unitId === pick.unitId,
    );
    const preview = previewSugarRushV7(view, pick.unitId);
    if (command === undefined || preview === null) return [];
    const attackCells = new Set(
      rushAttacks.map((target) => `${target.at.x},${target.at.y}`),
    );
    return [
      ...preview.destinations
        .filter((at) => !attackCells.has(`${at.x},${at.y}`))
        .map((at): MapCommandTargetV7 => {
          const newReach = preview.newDestinations.some((fresh) =>
            same(fresh, at),
          );
          const eats = crumbsEatLabelV7(view, pick.unitId, at);
          return {
            at,
            command,
            family: "SUGAR_RUSH",
            sugarRush: { newReach },
            ...(eats === null ? {} : { previewLabel: eats.label }),
            semanticLabel: `${SUGAR_RUSH_LABEL_V7}: move here${newReach ? ", only with the Rush" : ""}${eats === null ? "" : `. ${eats.label}`}`,
          };
        }),
      ...rushAttacks.map((target): MapCommandTargetV7 => ({
        ...target,
        sugarRush: { newReach: false },
        semanticLabel: `${SUGAR_RUSH_LABEL_V7}, then attack. ${target.semanticLabel ?? target.previewLabel ?? ""}`,
      })),
    ];
  }
  if (pick.kind === "REBAKE") {
    const preview = previewRebakeV7(view, pick.unitId);
    if (preview === null) return [];
    // The Candy redesign (`pulp_wars-jdb.12`): the copy appears on a tile
    // next to the Confectioner, scooped from Crumbs within 2. Until the
    // two-step pick of `pulp_wars-jdb.14`, each placement tile bakes the
    // most expensive offered Crumbs (then the first in (y, x) order).
    const byTile = new Map<string, (typeof preview.options)[number]>();
    for (const option of preview.options) {
      const key = `${option.at.x},${option.at.y}`;
      const known = byTile.get(key);
      if (known === undefined || option.cost > known.cost)
        byTile.set(key, option);
    }
    return [...byTile.values()].flatMap((option): MapCommandTargetV7[] => {
      const command = commands.find(
        (candidate) =>
          candidate.kind === "REBAKE" &&
          candidate.unitId === pick.unitId &&
          same(candidate.from, option.from) &&
          same(candidate.at, option.at),
      );
      return command === undefined
        ? []
        : [
            {
              at: option.at,
              command,
              family: "REBAKE",
              previewLabel: rebakeBoardLabelV7(option.cost, option.hp),
              rebake: ghost(option.role),
              semanticLabel: rebakeTargetNameV7(
                option.role,
                option.cost,
                option.hp,
              ),
            },
          ];
    });
  }
  const preview = previewSugarTossV7(view, pick.unitId);
  if (preview === null) return [];
  return preview.targets.flatMap((entry): MapCommandTargetV7[] => {
    const target = unitById(entry.unitId);
    const command = commands.find(
      (candidate) =>
        candidate.kind === "SUGAR_TOSS" &&
        candidate.unitId === pick.unitId &&
        candidate.targetUnitId === entry.unitId,
    );
    return target === undefined || command === undefined
      ? []
      : [
          {
            at: target.at,
            command,
            family: "SUGAR_TOSS",
            previewLabel: `+${entry.amount}`,
            semanticLabel: sugarTossTargetNameV7(
              unitRoleRuleV7(view, target).label,
              entry.amount,
            ),
          },
        ];
  });
}

/** The Candy additions to an ATTACK target (section 15.1). */
export interface CandyAttackTargetExtrasV7 {
  readonly notes: readonly string[];
  /** The Bounce: an arrow from the attacker to its tile after it. */
  readonly bounce: MapCommandTargetV7["bounce"];
  /** The sentence the cursor description adds. */
  readonly semantic: string | null;
}

/**
 * The Candy lines of an attack preview: "Sugar Rush +1", "Splat: no
 * strike-back this turn", "No strike-back: Splatted", "Bounces back" or
 * "Bounce blocked" (the arrow shows where). Null in a match without a Candy
 * seat, so its attack previews are unchanged.
 */
export function candyAttackTargetExtrasV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7 | null,
): CandyAttackTargetExtrasV7 | null {
  if (preview === null || !matchHasCandySeatV7(view)) return null;
  const lines = candyCombatLinesV7(preview);
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  return {
    notes: lines.notes,
    bounce:
      lines.bounce === null || attacker === undefined
        ? undefined
        : {
            from: attacker.at,
            to: lines.bounce.to,
            blocked: lines.bounce.blocked,
          },
    semantic: lines.notes.length === 0 ? null : `${lines.notes.join(". ")}.`,
  };
}

/** Whether `kind` is one of the three aimed Candy commands. */
export function isCandyPickCommandV7(kind: CommandV7["kind"]): boolean {
  return kind === "SUGAR_RUSH" || kind === "REBAKE" || kind === "SUGAR_TOSS";
}
