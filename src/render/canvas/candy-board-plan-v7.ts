import {
  hopJumpedTileV7,
  previewCrumbsEatV7,
  previewRebakeV7,
  previewSugarRushV7,
  previewSugarTossV7,
  previewTopUpV7,
  unitRoleRuleV7,
  type RebakeOptionV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../engine/index";
import {
  HOP_MOVE_TEXT_V7,
  REBAKE_PICK_TILE_V7,
  SUGAR_RUSH_LABEL_V7,
  candyChipsV7,
  candyLabelV7,
  candyCombatLinesV7,
  candyStatsV7,
  crumbsTileLinesV7,
  eatsCrumbsTextV7,
  homeSweetHomeChipV7,
  matchHasCandySeatV7,
  rebakeBoardLabelV7,
  rebakeCrumbsNameV7,
  rebakeTargetNameV7,
  sugarTossTargetNameV7,
  topUpBoardLabelV7,
  topUpTargetNameV7,
} from "../candy-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The Candy part of the board plan (bead pulp_wars-jdb.6, docs/product/
 * RULESET_7_CANDY.md section 15.1): the Rushed, Crashed, Splatted and Home
 * Sweet Home markers of each unit, the Crumbs of each tile, the armed Sugar
 * Rush and the Re-bake and Sugar Toss picking modes, the "Eats Crumbs"
 * label of a Move, and the Candy lines of an attack preview (the Bounce's
 * arrow among them). The Candy redesign (RULESET_7_CANDY_REDESIGN.md
 * section 14, bead pulp_wars-jdb.14) adds the Stuck and Toothache markers,
 * the two-step Re-bake pick (the Crumbs, then the tile next to the
 * Confectioner), the Top-Up pick, a Move's hop, and the units a Ricochet or
 * a Thump also hits. Everything is read from the public view, the offered
 * commands and the public previews; nothing is recomputed.
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
  /** The Candy redesign: Stuck, toffee strands round its feet. */
  readonly stuck: boolean;
  /** The Candy redesign: Toothache, a cracked tooth beside its head. */
  readonly toothache: boolean;
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
  readonly kind: "SUGAR_RUSH" | "REBAKE" | "SUGAR_TOSS" | "TOP_UP";
  readonly unitId: UnitId;
  /**
   * The Candy redesign (section 14): a Re-bake picks the Crumbs first, then
   * the tile next to the Confectioner. The chosen Crumbs' tile, or null (or
   * absent) while they are being chosen; with one pile in reach it is
   * chosen at once.
   */
  readonly from?: CoordV7 | null;
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
  const stuck = stats.stuck === true;
  const toothache = stats.toothache === true;
  if (!rushed && !crashed && !splatted && !stuck && !toothache)
    return undefined;
  return {
    rushed,
    crashed,
    splatted,
    home: homeSweetHomeChipV7(view, unit, stats),
    stuck,
    toothache,
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
    // The Candy redesign (section 14): the Crumbs within 2 first (each pile
    // with what it bakes back), then the free tiles next to the
    // Confectioner with the ghost, its price and its HP.
    const commandOf = (option: RebakeOptionV7): CommandV7 | undefined =>
      commands.find(
        (candidate) =>
          candidate.kind === "REBAKE" &&
          candidate.unitId === pick.unitId &&
          same(candidate.from, option.from) &&
          same(candidate.at, option.at),
      );
    const from = rebakePickSourceV7(view, pick);
    const options = previewRebakeV7(view, pick.unitId)?.options ?? [];
    if (from === null)
      return rebakePilesV7(options).flatMap((option): MapCommandTargetV7[] => {
        const command = commandOf(option);
        return command === undefined
          ? []
          : [
              {
                at: option.from,
                command,
                family: "REBAKE_CRUMBS",
                previewLabel: rebakeBoardLabelV7(option.cost, option.hp),
                semanticLabel: `${rebakeCrumbsNameV7(option.role, option.cost, option.hp)}. Then ${REBAKE_PICK_TILE_V7.charAt(0).toLowerCase()}${REBAKE_PICK_TILE_V7.slice(1)}`,
              },
            ];
      });
    return options
      .filter((option) => same(option.from, from))
      .flatMap((option): MapCommandTargetV7[] => {
        const command = commandOf(option);
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
  if (pick.kind === "TOP_UP") {
    const preview = previewTopUpV7(view, pick.unitId);
    if (preview === null) return [];
    return preview.targets.flatMap((entry): MapCommandTargetV7[] => {
      const target = unitById(entry.unitId);
      const command = commands.find(
        (candidate) =>
          candidate.kind === "TOP_UP" &&
          candidate.unitId === pick.unitId &&
          candidate.targetUnitId === entry.unitId,
      );
      return target === undefined || command === undefined
        ? []
        : [
            {
              at: target.at,
              command,
              family: "TOP_UP",
              previewLabel: topUpBoardLabelV7(entry),
              semanticLabel: topUpTargetNameV7(
                unitRoleRuleV7(view, target).label,
                entry,
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
  /**
   * The Candy redesign: the units the Ricochet or the Thump also hits,
   * shown while the target is focused (the giants' `giantHits` marks).
   */
  readonly hits: NonNullable<MapCommandTargetV7["giantHits"]>;
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
    hits: lines.hits.flatMap((hit) => {
      const unit = view.units.find((candidate) => candidate.id === hit.unitId);
      return unit === undefined
        ? []
        : [{ at: unit.at, label: hit.label, lethal: hit.lethal }];
    }),
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

/** Whether `kind` is one of the four aimed Candy commands. */
export function isCandyPickCommandV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "SUGAR_RUSH" ||
    kind === "REBAKE" ||
    kind === "SUGAR_TOSS" ||
    kind === "TOP_UP"
  );
}

/**
 * The Candy redesign (section 14): one offered Re-bake per Crumbs tile in
 * reach (the first placement of each, in the preview's (from, at) order),
 * so the first step of the pick marks each pile once.
 */
export function rebakePilesV7(
  options: readonly RebakeOptionV7[],
): readonly RebakeOptionV7[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.from.x},${option.from.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The Crumbs a Re-bake pick bakes from: the chosen pile while it is still
 * offered, the only pile when there is one, or null while one is to be
 * chosen.
 */
export function rebakePickSourceV7(
  view: PlayerViewV7,
  pick: CandyPickV7,
): CoordV7 | null {
  if (pick.kind !== "REBAKE") return null;
  const piles = rebakePilesV7(
    previewRebakeV7(view, pick.unitId)?.options ?? [],
  );
  const chosen = pick.from ?? null;
  if (chosen !== null && piles.some((pile) => same(pile.from, chosen)))
    return chosen;
  const only = piles.length === 1 ? piles[0] : undefined;
  return only === undefined ? null : only.from;
}

/**
 * Preview entries of an active Candy pick that are not targets: the chosen
 * Crumbs of a Re-bake's second step, marked on their pile.
 */
export function addCandyPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  pick: CandyPickV7,
): void {
  const from = rebakePickSourceV7(view, pick);
  if (from === null) return;
  const crumbs = view.crumbs.find((entry) => same(entry.at, from));
  entries.push({
    key: `ability-target:REBAKE_CRUMBS:${from.x},${from.y}`,
    kind: "ABILITY_TARGET",
    layer: 7.5,
    at: from,
    abilityStyle: "NEST",
    label:
      crumbs === undefined ? "Crumbs" : `${candyLabelV7(crumbs.role)} Crumbs`,
    lethal: false,
  });
}

/**
 * The Candy redesign (section 7.7): a Chocolate Bunny's Move that hops,
 * from the command's own path: the take-off tile, the jumped tile and the
 * landing, or null for a Move without a hop.
 */
export function moveHopV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): {
  readonly from: CoordV7;
  readonly over: CoordV7;
  readonly to: CoordV7;
} | null {
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined) return null;
  let current = unit.at;
  for (const step of command.path) {
    const over = hopJumpedTileV7(current, step);
    if (over !== null) return { from: current, over, to: step };
    current = step;
  }
  return null;
}

/** The sentence a hopping Move adds to its cursor description. */
export const HOP_MOVE_SEMANTIC_V7 = `${HOP_MOVE_TEXT_V7}.`;
