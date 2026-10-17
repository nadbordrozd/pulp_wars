import type { CommandV7 } from "../engine/index";

/**
 * The "nothing left" glow on End Turn (bead pulp_wars-2yc.82, UI review
 * V10, docs/ui/UI_REVIEW_2026_10.md). When the player has nothing useful
 * left to do this turn, the End Turn button takes the coach's soft pulse
 * (a still yellow ring under reduced motion), every turn, not only during
 * the coach's first three turns.
 *
 * It is read from the commands the player is offered alone (the public
 * command query), and it is conservative: it stays dark while any
 * meaningful action remains. A command is useful when it is
 *
 * - any command of an own unit (one that names a unit: a move, an attack,
 *   a capture, every ability, Board, Disembark), except Wait, Disband and
 *   Recover (End Turn recovers an idle unit by itself);
 * - any command of an own city (one that names a city: train, naval
 *   training, Land Grant, Hire, Lay Egg, an Offering, a city reward);
 * - Research;
 * - one of the coach's harvests and basic buildings (Harvest Fruit, Hunt
 *   Game, Harvest Fish, Gather Pearls, Farm, Lumber Camp, Mine), or Build
 *   Monument.
 *
 * Not counted: the standing tile investments a player with Coins is
 * always offered (roads, forest clearing, replanting and cultivating,
 * blasting, redeveloping, and the later buildings such as a Windmill or a
 * Port); counting them would keep End Turn dark for most of a match.
 */

/** Unit commands that are never needed before ending the turn. */
const IDLE_UNIT_KINDS_V7: ReadonlySet<CommandV7["kind"]> = new Set<
  CommandV7["kind"]
>(["WAIT", "DISBAND", "RECOVER"]);

/** The tile commands that count, as the coach's hint counts them. */
const USEFUL_TILE_KINDS_V7: ReadonlySet<CommandV7["kind"]> = new Set<
  CommandV7["kind"]
>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "HARVEST_FISH",
  "GATHER_PEARLS",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_MONUMENT",
]);

/** Whether `command` still means something useful to do this turn. */
export function usefulCommandV7(command: CommandV7): boolean {
  if (command.kind === "END_TURN") return false;
  if ("unitId" in command) return !IDLE_UNIT_KINDS_V7.has(command.kind);
  if ("cityId" in command) return true;
  if (command.kind === "RESEARCH") return true;
  return USEFUL_TILE_KINDS_V7.has(command.kind);
}

/**
 * Whether End Turn glows: it is offered and no other offered command is
 * useful (`usefulCommandV7`).
 */
export function nothingUsefulLeftV7(commands: readonly CommandV7[]): boolean {
  return (
    commands.some((command) => command.kind === "END_TURN") &&
    !commands.some(usefulCommandV7)
  );
}
