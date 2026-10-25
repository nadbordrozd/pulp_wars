import {
  previewRewardArrivalV7,
  queryPlayerCommandsV7,
  type CityId,
  type CommandV7,
  type PlayerViewV7,
  type RewardIdV7,
} from "../engine/index";
import { unitDisplayNameV7 } from "./dinosaur-presentation-v7";

/**
 * Blocked actions of the dock (bead `pulp_wars-2yc.36`): an action the
 * viewer could take now but for Coins, or a unit its city could train now
 * but for a free slot, stays in the dock as a control that cannot be
 * pressed and says why, instead of being absent.
 *
 * No rule is restated here. The engine's public command query answers
 * "what could I do with no shortage of Coins" and "... and with room in
 * every city of mine" on what-if copies of the viewer's own `PlayerView`;
 * the difference from the real offer is the list of blocked actions. Only
 * the viewer's own Coins and the level of its own cities are changed, so
 * nothing the viewer cannot see is read (a resource under fog or one that
 * is not revealed yet stays unknown in the what-if view too).
 */

export type BlockedReasonV7 = "COINS" | "SLOTS";

export interface DockCommandV7 {
  readonly command: CommandV7;
  /** Null for a command the engine offers now. */
  readonly blocked: BlockedReasonV7 | null;
}

/** Commands that use a city's unit slots. */
const SLOT_COMMANDS: ReadonlySet<CommandV7["kind"]> = new Set<
  CommandV7["kind"]
>(["TRAIN", "TRAIN_NAVAL", "HIRE"]);

/** Far above any real city level, so capacity never binds. */
const ROOMY_LEVELS = 1000;

const COIN_RICH = new WeakMap<PlayerViewV7, PlayerViewV7>();
const ROOMY = new WeakMap<PlayerViewV7, PlayerViewV7>();
const UNAFFORDABLE = new WeakMap<PlayerViewV7, readonly CommandV7[]>();
const SLOT_BLOCKED = new WeakMap<PlayerViewV7, readonly CommandV7[]>();

const key = (command: CommandV7): string => JSON.stringify(command);

/**
 * The viewer's own view with no shortage of Coins: the view to price and
 * preview an unaffordable action on (its cost and its effects do not depend
 * on what the viewer holds).
 */
export function coinRichViewV7(view: PlayerViewV7): PlayerViewV7 {
  const cached = COIN_RICH.get(view);
  if (cached !== undefined) return cached;
  const rich: PlayerViewV7 = {
    ...view,
    viewer: { ...view.viewer, coins: Number.MAX_SAFE_INTEGER },
  };
  COIN_RICH.set(view, rich);
  return rich;
}

/** The coin-rich view with room for any unit in every city of the viewer. */
function roomyViewV7(view: PlayerViewV7): PlayerViewV7 {
  const cached = ROOMY.get(view);
  if (cached !== undefined) return cached;
  const rich = coinRichViewV7(view);
  const roomy: PlayerViewV7 = {
    ...rich,
    cities: rich.cities.map((city) =>
      city.ownerId === view.viewer.id
        ? { ...city, level: city.level + ROOMY_LEVELS }
        : city,
    ),
  };
  ROOMY.set(view, roomy);
  return roomy;
}

/**
 * The commands the engine would offer the viewer now with more Coins, in
 * the engine's command order: everything but the price is in place.
 * Research is left out (the technology screen shows its own price), and
 * the list is empty outside the viewer's turn, as the real offer is.
 */
export function unaffordableCommandsV7(
  view: PlayerViewV7,
): readonly CommandV7[] {
  const cached = UNAFFORDABLE.get(view);
  if (cached !== undefined) return cached;
  const offered = new Set(queryPlayerCommandsV7(view).map(key));
  const result =
    offered.size === 0
      ? []
      : queryPlayerCommandsV7(coinRichViewV7(view)).filter(
          (command) =>
            command.kind !== "RESEARCH" && !offered.has(key(command)),
        );
  UNAFFORDABLE.set(view, result);
  return result;
}

/**
 * The units the viewer's cities could train or hire now but for a free
 * slot, whatever the viewer's Coins, in the engine's command order.
 */
export function slotBlockedCommandsV7(
  view: PlayerViewV7,
): readonly CommandV7[] {
  const cached = SLOT_BLOCKED.get(view);
  if (cached !== undefined) return cached;
  let result: readonly CommandV7[] = [];
  if (queryPlayerCommandsV7(view).length > 0) {
    const withCoins = new Set(
      queryPlayerCommandsV7(coinRichViewV7(view)).map(key),
    );
    result = queryPlayerCommandsV7(roomyViewV7(view)).filter(
      (command) =>
        SLOT_COMMANDS.has(command.kind) && !withCoins.has(key(command)),
    );
  }
  SLOT_BLOCKED.set(view, result);
  return result;
}

/**
 * The commands of the dock in display order: those of `offered`, with each
 * unaffordable one where the engine would list it, then the slot-blocked
 * ones. `offered` is the controller's offer; when it is empty (not the
 * viewer's turn, or the match is busy) nothing is blocked either.
 */
export function dockCommandsV7(
  view: PlayerViewV7 | null,
  offered: readonly CommandV7[],
): readonly DockCommandV7[] {
  if (view === null || offered.length === 0)
    return offered.map((command) => ({ command, blocked: null }));
  const offeredKeys = new Set(offered.map(key));
  const dear = unaffordableCommandsV7(view).filter(
    (command) => !offeredKeys.has(key(command)),
  );
  const result: DockCommandV7[] = [];
  if (dear.length === 0)
    for (const command of offered) result.push({ command, blocked: null });
  else {
    // The what-if offer is the real one plus the unaffordable commands, in
    // one order; an offered command it lacks (a controller's own list)
    // keeps its place at the end.
    const dearKeys = new Set(dear.map(key));
    const placed = new Set<string>();
    for (const command of queryPlayerCommandsV7(coinRichViewV7(view))) {
      const id = key(command);
      if (offeredKeys.has(id)) {
        placed.add(id);
        result.push({ command, blocked: null });
      } else if (dearKeys.has(id)) result.push({ command, blocked: "COINS" });
    }
    for (const command of offered)
      if (!placed.has(key(command))) result.push({ command, blocked: null });
  }
  for (const command of slotBlockedCommandsV7(view))
    if (!offeredKeys.has(key(command)))
      result.push({ command, blocked: "SLOTS" });
  return result;
}

/** "Need 2 more Coins": what an unaffordable action lacks. */
export function needCoinsTextV7(shortfall: number): string {
  return `Need ${shortfall} more ${shortfall === 1 ? "Coin" : "Coins"}`;
}

/** Why a unit does not fit its city: "City full", or "Needs 2 free slots". */
export function slotsBlockedTextV7(slots: number): string {
  return slots > 1 ? `Needs ${slots} free slots` : "City full";
}

/** The chip of an own unit with nothing left to do this turn. */
export const UNIT_DONE_LABEL_V7 = "Done this turn";
export const UNIT_DONE_TOOLTIP_V7 =
  "This unit has acted. It is ready again next turn";
/**
 * Bead `pulp_wars-2yc.109`: the chip of an own unit whose Move is spent
 * (it moved, was beamed, or acted) but that may still attack, or still use
 * another action.
 */
export const UNIT_ATTACK_LEFT_LABEL_V7 = "Can attack · can't move";
export const UNIT_ATTACK_LEFT_TOOLTIP_V7 =
  "It cannot move again this turn, but it can still attack";
export const UNIT_ACTION_LEFT_LABEL_V7 = "Can act · can't move";
export const UNIT_ACTION_LEFT_TOOLTIP_V7 =
  "It cannot move again this turn, but it can still use an action";

/** The turn chip of a unit: its `data-unit-status`, words and tooltip. */
export interface UnitTurnChipV7 {
  readonly status: "done" | "attack-left" | "action-left";
  readonly label: string;
  readonly tooltip: string;
}

/**
 * Commands that leave a unit's turn as it is: Promote is free, Disband and
 * Wait only end it.
 */
const TURN_NEUTRAL_KINDS: ReadonlySet<CommandV7["kind"]> = new Set<
  CommandV7["kind"]
>(["DISBAND", "PROMOTE", "WAIT"]);

/**
 * Bead `pulp_wars-2yc.109`: the turn chip of an own handled unit (its Move
 * is spent), from the commands the engine offers it: "Can attack · can't
 * move" while an Attack is offered, "Can act · can't move" while another
 * action is, and "Done this turn" only when nothing is left. Null for a
 * unit that is not handled (a fresh unit, or one with an Overrun, Feast or
 * second shot pending, which its own status chip names) and for a handled
 * unit offered a Move (it has none). `commands` is the viewer's offer, empty
 * outside its turn.
 */
export function unitTurnChipV7(
  unit: Pick<PlayerViewV7["units"][number], "id" | "activation">,
  commands: readonly CommandV7[],
): UnitTurnChipV7 | null {
  if (!unit.activation.handled || commands.length === 0) return null;
  const left = commands.filter(
    (command) =>
      "unitId" in command &&
      command.unitId === unit.id &&
      !TURN_NEUTRAL_KINDS.has(command.kind),
  );
  if (left.some((command) => command.kind === "MOVE")) return null;
  if (
    left.some(
      (command) =>
        command.kind === "ATTACK" || command.kind === "ATTACK_BARRICADE",
    )
  )
    return {
      status: "attack-left",
      label: UNIT_ATTACK_LEFT_LABEL_V7,
      tooltip: UNIT_ATTACK_LEFT_TOOLTIP_V7,
    };
  if (left.length > 0)
    return {
      status: "action-left",
      label: UNIT_ACTION_LEFT_LABEL_V7,
      tooltip: UNIT_ACTION_LEFT_TOOLTIP_V7,
    };
  return {
    status: "done",
    label: UNIT_DONE_LABEL_V7,
    tooltip: UNIT_DONE_TOOLTIP_V7,
  };
}

/** The chip of a resource the viewer sees on land that is not its own. */
export const OUTSIDE_BORDERS_LABEL_V7 = "Outside your borders";
export const OUTSIDE_BORDERS_TOOLTIP_V7 =
  "A resource is used only inside your own borders";

/**
 * Siege rules (`pulp_wars-0pgd`, 7r80): the chip of an own tile an enemy
 * unit stands on (no tile command but Blast Mountain targets it).
 */
export const ENEMY_ON_TILE_LABEL_V7 = "Enemy on this tile";
export const ENEMY_ON_TILE_TOOLTIP_V7 =
  "Nothing is built or gathered on a tile an enemy unit stands on";

/** The tooltip of a besieged city's status. */
export const BESIEGED_TOOLTIP_V7 =
  "An enemy unit stands on the center: no income and no new units. The city can still build";

/**
 * Reward arrival (`pulp_wars-sa3h`; `pulp_wars-spue`): the reward card's
 * line when the center is taken.
 */
export const REWARD_ARRIVAL_BESIDE_V7 = "Appears beside the city";
export const REWARD_ARRIVAL_HELD_V7 =
  "No room near the city: arrives when a tile is free";
/** The line of a reward unit that pushes `unit` (its name) off the center. */
export function rewardArrivalPushTextV7(unit: string): string {
  return `Pushes the ${unit} off the city`;
}

/**
 * Reward arrival (`pulp_wars-sa3h`; `pulp_wars-spue`, `pulp_wars-rzqf`):
 * what a reward unit does on arrival, in a few words for the reward
 * choice, from the engine's public preview (`previewRewardArrivalV7`): it
 * pushes the unit on the center off ("Pushes the Ogre off the city"),
 * appears beside the city when there is no room to push, or is held; null
 * when the reward grants no unit or the unit appears on the free center.
 * Nothing is ever killed or damaged, so there is no loss to warn of.
 */
export function rewardArrivalNoteV7(
  view: PlayerViewV7,
  cityId: CityId,
  reward: RewardIdV7,
): {
  readonly text: string;
  readonly placement: "PUSH" | "BESIDE" | "HELD";
} | null {
  const arrival = previewRewardArrivalV7(view, cityId, reward);
  if (arrival === null) return null;
  if (arrival.at === null)
    return { text: REWARD_ARRIVAL_HELD_V7, placement: "HELD" };
  const pushed =
    arrival.pushedUnitId === null
      ? undefined
      : view.units.find((unit) => unit.id === arrival.pushedUnitId);
  if (pushed !== undefined)
    return {
      text: rewardArrivalPushTextV7(unitDisplayNameV7(view, pushed)),
      placement: "PUSH",
    };
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return city === undefined ||
    (arrival.at.x === city.at.x && arrival.at.y === city.at.y)
    ? null
    : { text: REWARD_ARRIVAL_BESIDE_V7, placement: "BESIDE" };
}
