import type { CityId, PlayerId } from "../engine/model/ids";
import {
  cityBarracksV7,
  cityUnitCapacityForV7,
  unitCapacitySlotsV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { compareCommandsV7 } from "../engine/v7/commands";
import { cooperativeAlliesV7 } from "../engine/v7/economy";
import {
  createPublicCommandWorkV7,
  queryOfferedUnitCommandsV7,
  type PublicCommandWorkProgressV7,
  type PublicCommandWorkV7,
} from "../engine/v7/query";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The Normal AI scale mode (`pulp_wars-z6za`, docs/architecture/
 * PERFORMANCE.md "The scale mode for huge seats").
 *
 * A Normal decision scores every offered command of every unit from a fresh
 * view, so a seat's turn costs about units x commands x decisions: with 50
 * to 100 units the early decisions of a turn took 100 to 1,000 ms each and
 * the policy 10 to 20 s a turn in Node (`pulp_wars-2yc.99`). The user
 * (2026-10-25) asked for a heuristic that kicks in from some number of
 * units or cities and makes such turns much faster, slightly dumber
 * allowed.
 *
 * Above the threshold a decision considers a window of the seat's units:
 * the own units are ordered by how close they stand to a visible hostile
 * unit or a hostile city (ties by unit id), and the decision offers the
 * policy the commands of the first `SCALE_WINDOW_UNITS_V7` units that can
 * still act (a command other than Wait or Disband), the units on own city
 * centers with a free unit slot (a city cannot train under one), and every
 * command that belongs to no unit (training, construction, research, End
 * Turn) except Redevelop. The policy scores that subset with its ordinary
 * rules, on a copy of the view that offers only those commands
 * (`restrictPublicCommandsV7`), with the local placement plan
 * (`createPublicPlanningWorkV7(..., { local: true })`). A unit that acts
 * drops out of the window and the next one comes in, so the front acts
 * first and the rear follows. When the best command of a window is End Turn
 * while more units may still act, the decision moves on to the next window
 * (an idle unit is passed over); End Turn comes only when every window has
 * nothing better.
 *
 * Every input is the decision's public view: the policy stays a pure,
 * deterministic function of its view, with no memory between decisions.
 * Below the threshold nothing changes (`scaleModeV7` is false and the policy
 * enumerates and scores everything, as before).
 */

/** A seat with more units than this decides in scale mode. */
export const SCALE_MODE_UNITS_V7 = 40;
/** A seat with more cities than this decides in scale mode. */
export const SCALE_MODE_CITIES_V7 = 14;
/** Units whose commands one window offers the policy. */
export const SCALE_WINDOW_UNITS_V7 = 6;

/**
 * The switch for the head-to-head measurements and tests (benchmarks
 * compare the full policy with the scale mode on the same states). On in
 * every match.
 */
export const SCALE_MODE_SWITCH_V7 = {
  enabled: true,
  windowUnits: SCALE_WINDOW_UNITS_V7,
};

/** Whether the viewer's seat is large enough for the scale mode. */
export function scaleModeV7(view: PlayerViewV7): boolean {
  if (!SCALE_MODE_SWITCH_V7.enabled) return false;
  let units = 0;
  for (const unit of view.units)
    if (unit.ownerId === view.viewer.id) units += 1;
  if (units > SCALE_MODE_UNITS_V7) return true;
  let cities = 0;
  for (const city of view.cities)
    if (city.ownerId === view.viewer.id) cities += 1;
  return cities > SCALE_MODE_CITIES_V7;
}

const hostileV7 = (view: PlayerViewV7, ownerId: PlayerId | null): boolean =>
  ownerId !== null &&
  ownerId !== view.viewer.id &&
  !cooperativeAlliesV7(view.setup, view.humanPlayerId, ownerId, view.viewer.id);

const chebyshevV7 = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const keyV7 = (at: CoordV7): string => `${at.y},${at.x}`;

/**
 * The centers of the own cities with a free unit slot: a unit standing on
 * one keeps the city from training.
 */
function trainingCenterKeysV7(view: PlayerViewV7): ReadonlySet<string> {
  const used = new Map<CityId, number>();
  for (const unit of view.units)
    if (unit.ownerId === view.viewer.id && unit.homeCityId !== null)
      used.set(
        unit.homeCityId,
        (used.get(unit.homeCityId) ?? 0) + unitCapacitySlotsV7(view, unit),
      );
  const keys = new Set<string>();
  for (const city of view.cities) {
    if (city.ownerId !== view.viewer.id) continue;
    const capacity = cityUnitCapacityForV7(
      city.level,
      view.viewer.researchedTechs,
      view.viewer.faction,
      cityBarracksV7(city),
    );
    if (capacity > (used.get(city.id) ?? 0)) keys.add(keyV7(city.at));
  }
  return keys;
}

/**
 * The own units, nearest a visible hostile unit or a hostile city first
 * (ties by unit id).
 */
export function scaleUnitOrderV7(view: PlayerViewV7): readonly PublicUnitV7[] {
  const marks: CoordV7[] = [];
  for (const unit of view.units)
    if (hostileV7(view, unit.ownerId)) marks.push(unit.at);
  for (const city of view.cities)
    if (hostileV7(view, city.ownerId)) marks.push(city.at);
  return view.units
    .filter((unit) => unit.ownerId === view.viewer.id)
    .map((unit) => {
      let nearest = Number.MAX_SAFE_INTEGER;
      for (const at of marks)
        nearest = Math.min(nearest, chebyshevV7(unit.at, at));
      return { unit, nearest };
    })
    .sort(
      (left, right) =>
        left.nearest - right.nearest || left.unit.id - right.unit.id,
    )
    .map((entry) => entry.unit);
}

const DECISION_VIEWS_V7 = new WeakMap<object, PlayerViewV7>();

/** A scale-mode decision was made on this window view of its view. */
export function recordScaleDecisionViewV7(
  decision: object,
  view: PlayerViewV7,
): void {
  DECISION_VIEWS_V7.set(decision, view);
}

/**
 * The window view a scale-mode decision was made on (the same public facts
 * as the decision's view, offering only its candidates' commands), or
 * undefined for a decision of the full policy.
 */
export function scaleDecisionViewV7(
  decision: object,
): PlayerViewV7 | undefined {
  return DECISION_VIEWS_V7.get(decision);
}

/** A unit can still act: it is offered a command other than Wait or Disband. */
function actsV7(commands: readonly CommandV7[]): boolean {
  return commands.some(
    (command) => command.kind !== "WAIT" && command.kind !== "DISBAND",
  );
}

/**
 * The scale mode's command enumeration for one window: one operation
 * handles one tile, city, or unit (as the full enumeration does). Its
 * commands are in `compareCommandsV7` order.
 */
export class ScaleCommandWorkV7 implements PublicCommandWorkV7 {
  private readonly base: PublicCommandWorkV7;
  private baseCommands: readonly CommandV7[] | null = null;
  private order: readonly PublicUnitV7[] | null = null;
  private centerKeys: ReadonlySet<string> = new Set();
  private cursor = 0;
  private acting = 0;
  private readonly unitCommands: CommandV7[] = [];
  private commands: readonly CommandV7[] | null = null;
  /** A unit after this window can still act: End Turn may move on. */
  laterWindow = false;

  constructor(
    private readonly view: PlayerViewV7,
    /** The window: 0 for the nearest units, 1 for the next, ... */
    readonly window: number,
  ) {
    this.base = createPublicCommandWorkV7(view, { withoutUnits: true });
  }

  advance(maxOperations: number): PublicCommandWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.commands === null) {
      operations += 1;
      if (this.baseCommands === null) {
        const progress = this.base.advance(1);
        // No Redevelop in the scale mode: the policy rarely takes one, and
        // its previews and plan cost every decision of a large seat.
        if (progress.done)
          this.baseCommands = (progress.commands ?? []).filter(
            (command) => command.kind !== "REDEVELOP",
          );
        continue;
      }
      if (this.order === null) {
        this.order = scaleUnitOrderV7(this.view);
        this.centerKeys = trainingCenterKeysV7(this.view);
        continue;
      }
      const unit = this.order[this.cursor];
      const size = SCALE_MODE_SWITCH_V7.windowUnits;
      const first = this.window * size;
      if (unit === undefined) {
        this.commands = [...this.baseCommands, ...this.unitCommands].sort(
          compareCommandsV7,
        );
        continue;
      }
      this.cursor += 1;
      // A unit on an own city center is in every window: while it stands
      // there the city cannot train, so it is never left for last.
      const center = this.centerKeys.has(keyV7(unit.at));
      if (!center && this.acting >= first + size) {
        // Not enumerated: it may still act, so End Turn may move on (a
        // later window with nothing in it ends the turn).
        this.laterWindow = true;
        continue;
      }
      const offered = queryOfferedUnitCommandsV7(this.view, unit);
      if (!actsV7(offered)) continue;
      if (center) {
        this.unitCommands.push(...offered);
        continue;
      }
      if (this.acting >= first) this.unitCommands.push(...offered);
      this.acting += 1;
    }
    return {
      done: this.commands !== null,
      operations,
      commands: this.commands,
    };
  }
}
