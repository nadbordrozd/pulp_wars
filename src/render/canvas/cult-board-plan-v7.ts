import {
  sacrificeFavourV7,
  seizeFavourV7,
  seizeHolderV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  SACRIFICE_PICK_V7,
  SEIZE_PICK_V7,
  favourBoardLabelV7,
  sacrificeBlockTextV7,
  sacrificeTargetNameV7,
  seizeBlockTextV7,
  seizeTargetNameV7,
} from "../cult-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The Cult part of the board plan (bead `pulp_wars-mch9.17`,
 * docs/ui/BOARD_TARGETING.md section 3.7): the Summoner's Sacrifice and
 * Seize picking modes. A Sacrifice marks each own unit it may offer with the
 * Help ring, a Seize each broken enemy with the Attack mark, and both label
 * the victim with the Favour it pays. Everything is read from the public
 * view and the offered commands; the Favour is the engine's own value of
 * the victim (what `previewSacrificeV7` and `previewSeizeV7` return).
 */

/** A Sacrifice or a Seize being aimed: its victims are the only targets. */
export interface CultPickV7 {
  readonly kind: "SACRIFICE" | "SEIZE";
  readonly unitId: UnitId;
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** The map targets of an active pick: one per offered command of its kind. */
export function cultPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: CultPickV7,
): MapCommandTargetV7[] {
  const summoner = view.units.find((unit) => unit.id === pick.unitId);
  if (summoner === undefined) return [];
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (
      (command.kind !== "SACRIFICE" && command.kind !== "SEIZE") ||
      command.kind !== pick.kind ||
      command.unitId !== pick.unitId
    )
      return [];
    const victim = view.units.find((unit) => unit.id === command.victimUnitId);
    if (victim === undefined) return [];
    const name = unitRoleRuleV7(view, victim).label;
    if (command.kind === "SACRIFICE") {
      const favour = sacrificeFavourV7(view, victim);
      return [
        {
          at: victim.at,
          command,
          family: "SACRIFICE",
          previewLabel: favourBoardLabelV7(favour),
          semanticLabel: `${sacrificeTargetNameV7(name, favour)} ${SACRIFICE_PICK_V7}`,
        },
      ];
    }
    const favour = seizeFavourV7(view, victim);
    const holder = seizeHolderV7(view, view.units, summoner, victim);
    return [
      {
        at: victim.at,
        command,
        family: "SEIZE",
        previewLabel: favourBoardLabelV7(favour),
        semanticLabel: `${seizeTargetNameV7(
          name,
          favour,
          holder === undefined ? null : unitRoleRuleV7(view, holder).label,
        )} ${SEIZE_PICK_V7}`,
      },
    ];
  });
}

/**
 * Preview entries of an active pick that are not targets: each unit next to
 * the Summoner that the pick could have been aimed at but is refused wears
 * the engine's reason in grey (a Seize: "Above 5 HP", "Nobody holds it",
 * "Cannot be Seized"; a Sacrifice: "Plagued", "Bitten", "Mind-controlled").
 */
export function addCultPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  targets: readonly MapCommandTargetV7[],
  pick: CultPickV7,
): void {
  const summoner = view.units.find((unit) => unit.id === pick.unitId);
  if (summoner === undefined) return;
  for (const unit of view.units) {
    if (
      unit.id === summoner.id ||
      chebyshev(unit.at, summoner.at) !== 1 ||
      (pick.kind === "SACRIFICE") !== (unit.ownerId === summoner.ownerId) ||
      targets.some(
        (target) => target.at.x === unit.at.x && target.at.y === unit.at.y,
      )
    )
      continue;
    const label =
      pick.kind === "SACRIFICE"
        ? sacrificeBlockTextV7(view, summoner, unit)
        : seizeBlockTextV7(view, summoner, unit);
    if (label === null) continue;
    entries.push({
      key: `ability-target:${pick.kind}_BLOCKED:${unit.id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: unit.at,
      abilityStyle: "MARTIAN_BLOCKED",
      label,
    });
  }
}
