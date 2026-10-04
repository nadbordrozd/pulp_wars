/**
 * `MARTIAN_MOBILITY_PROBE` (`pulp_wars-1wy.2`,
 * docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 8.2): a
 * headless-only policy for a Martian seat that plays like a competent human
 * who uses every mobility tool every turn. It is never offered in the
 * browser and never used by the Normal AI.
 *
 * The probe is a set of overrides on top of the Normal AI. Every turn, in
 * this order, it looks for one command to play before the Normal policy is
 * asked; when no rule applies it returns null and the Normal policy decides.
 *
 * 0. Production: a carrier (a role with Beam Down or the Tractor Beam) when
 *    the army has fewer than one light carrier per three front units; a
 *    heavy (two-slot) carrier as soon as it is offered.
 * 1. Mind Control: whenever offered, on the most valuable target.
 * 2. Pull: the best offered Tractor Beam of (a) a hostile center emptied
 *    next to an own unit that can step on, (b) a hostile unit pulled where
 *    the own units that can still attack deal at least its Shield plus HP,
 *    (c) an own wounded unit pulled out of visible lethal reach.
 * 3. Focus fire: the attacks (and, for ranged units, a Move to two tiles
 *    from the target first) that kill a target this turn, pulled targets
 *    first, shots without retaliation first.
 * 4. Extract: a carrier picks up an own unit that has acted and stands in
 *    visible lethal reach, onto the safest legal tile.
 * 5. Deliver: a carrier beams a unit to a tile from which it has a hostile
 *    unit in range, else to the tile that gains the most steps toward the
 *    enemy.
 * 6. Reposition: a carrier with nothing to do hovers behind the front, two
 *    tiles from the units it could pull, out of visible lethal reach.
 *
 * The probe only ever returns a command from `queryPlayerCommandsV7`: the
 * engine's own offers decide who may pull, whom, from where, who may be
 * beamed and where to, and whether a carrier that has moved may still act.
 * Nothing here encodes "an unmoved Saucer", "a Mothership", "exactly two
 * tiles", or "the passenger is exhausted": a Tractor Beam offered by a
 * Saucer, a Beam Down offered after a Move, a pick-up of a unit away from a
 * city, and a heavy pull are used as soon as the engine offers them
 * (`pulp_wars-1wy.3`). It reads only the viewer's public view and public
 * previews, draws nothing from the PRNG, and is deterministic.
 */
import { publicProjectedDamageForPolicyV7 } from "../ai/v7";
import {
  bombThreatAtV7,
  dwarfFactsV7,
  dwarfMatchForPolicyV7,
  eruptionAtV7,
  onTheGroundV7,
} from "../ai/v7-dwarf";
import { martianArmyCountsV7, mindControlValueV7 } from "../ai/v7-martian";
import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  effectiveRoleRuleV7,
  roleMechanicsV7,
  unitMovementModeV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import {
  previewTractorBeamV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
} from "../engine/v7/query";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

// --- Parameters -------------------------------------------------------------

/** One light carrier for this many front units (section 8.2, production). */
export const PROBE_FRONT_UNITS_PER_CARRIER_V7 = 3;
/** One heavy carrier for this many front units, and always the first. */
export const PROBE_FRONT_UNITS_PER_HEAVY_CARRIER_V7 = 6;
/** A hostile unit this close to a city center makes its garrison stay. */
export const PROBE_GARRISON_RADIUS_V7 = 3;
/** A delivery by route needs at least this many steps gained. */
export const PROBE_DELIVER_MINIMUM_GAIN_V7 = 2;
/** A carrier hovers within this distance of the front anchor. */
export const PROBE_HOVER_DISTANCE_V7 = 2;
/** A carrier only repositions for at least this much better a tile. */
export const PROBE_REPOSITION_MARGIN_V7 = 2;
/** The pull distance assumed before the engine has offered any pull. */
export const PROBE_DEFAULT_PULL_DISTANCE_V7 = 2;

// --- Types ------------------------------------------------------------------

export type MobilityProbeToolV7 =
  | "TRAIN_CARRIER"
  | "TRAIN_HEAVY_CARRIER"
  | "MIND_CONTROL"
  | "PULL_CITY"
  | "PULL_KILL"
  | "PULL_RESCUE"
  | "STEP_ON_CENTER"
  | "FOCUS_ATTACK"
  | "FOCUS_MOVE"
  | "EXTRACT"
  | "DELIVER_ATTACK"
  | "DELIVER_ROUTE"
  | "REPOSITION";

export const MOBILITY_PROBE_TOOLS_V7: readonly MobilityProbeToolV7[] = [
  "TRAIN_CARRIER",
  "TRAIN_HEAVY_CARRIER",
  "MIND_CONTROL",
  "PULL_CITY",
  "PULL_KILL",
  "PULL_RESCUE",
  "STEP_ON_CENTER",
  "FOCUS_ATTACK",
  "FOCUS_MOVE",
  "EXTRACT",
  "DELIVER_ATTACK",
  "DELIVER_ROUTE",
  "REPOSITION",
];

export interface MobilityProbeChoiceV7 {
  readonly command: CommandV7;
  readonly tool: MobilityProbeToolV7;
}

/**
 * What the probe remembers. `turnKey`, `pulledTargetIds`, `focusTargetId`,
 * `centerToEnter`, and `repositionedUnitIds` are reset at the start of each
 * own turn; `pullDistances` is what the engine has offered so far in this
 * match (the reposition rule hovers at those distances).
 */
export interface MobilityProbeMemoryV7 {
  turnKey: string;
  readonly pulledTargetIds: Set<UnitId>;
  focusTargetId: UnitId | null;
  centerToEnter: CoordV7 | null;
  readonly repositionedUnitIds: Set<UnitId>;
  readonly pullDistances: Set<number>;
}

export function createMobilityProbeMemoryV7(): MobilityProbeMemoryV7 {
  return {
    turnKey: "",
    pulledTargetIds: new Set(),
    focusTargetId: null,
    centerToEnter: null,
    repositionedUnitIds: new Set(),
    pullDistances: new Set(),
  };
}

type OfferedV7<K extends CommandV7["kind"]> = Extract<CommandV7, { kind: K }>;

// --- Geometry and public facts ----------------------------------------------

export function chebyshevV7(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** As the Normal policy: every other seat in a rival match is hostile. */
export function probeHostileV7(view: PlayerViewV7, ownerId: PlayerId): boolean {
  return (
    ownerId !== view.viewer.id &&
    !isNeutralOwnerV7(ownerId) &&
    (view.setup.aiMode === "RIVAL" ||
      ownerId === view.humanPlayerId ||
      view.viewer.id === view.humanPlayerId)
  );
}

function shieldOf(view: PlayerViewV7, unitId: UnitId): number {
  return view.shields.find((entry) => entry.unitId === unitId)?.shield ?? 0;
}

/** What it takes to kill `unit` this turn: its HP plus its Shield. */
export function probeToughnessV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return unit.hp + shieldOf(view, unit.id);
}

/** The policy's unit value: four per Coin of its kind, plus its HP. */
export function probeUnitValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return (unitRoleRuleV7(view, unit).cost ?? 2) * 4 + unit.hp + unit.kills * 2;
}

function primaryUsed(unit: PublicUnitV7): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

function hostileUnits(view: PlayerViewV7): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) => unit.hp > 0 && probeHostileV7(view, unit.ownerId),
  );
}

/**
 * Where the enemy is: the visible hostile units on the board and the
 * visible hostile mounds (the Dwarf revision: a burrowed unit is not in
 * `units`, but it is there and surfaces on its owner's next turn). Used for
 * "is an enemy near", never for targeting: a mound cannot be attacked,
 * pulled, or controlled.
 */
function hostilePresence(view: PlayerViewV7): readonly PublicUnitV7[] {
  return [
    ...hostileUnits(view),
    ...view.burrowed
      .map((entry) => entry.unit)
      .filter((unit) => probeHostileV7(view, unit.ownerId)),
  ];
}

function ownUnits(view: PlayerViewV7): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) => unit.hp > 0 && unit.ownerId === view.viewer.id,
  );
}

const THREATENED_TILES_V7 = new WeakMap<
  PlayerViewV7,
  Map<UnitId, ReadonlySet<string>>
>();

function threatenedTiles(
  view: PlayerViewV7,
  unitId: UnitId,
): ReadonlySet<string> {
  let byUnit = THREATENED_TILES_V7.get(view);
  if (byUnit === undefined) {
    byUnit = new Map();
    THREATENED_TILES_V7.set(view, byUnit);
  }
  let tiles = byUnit.get(unitId);
  if (tiles === undefined) {
    tiles = new Set(queryThreatenedTilesV7(view, unitId).map(key));
    byUnit.set(unitId, tiles);
  }
  return tiles;
}

/**
 * The visible hostile damage `unit` can take on `at` during the enemy turn:
 * the sum of the projected hits of every visible hostile unit whose public
 * threat envelope (Move plus range) covers `at`. A Charge counts at its
 * maximum. The Shield is not subtracted (see `probeLethalV7`).
 *
 * Against Dwarves it adds what the Normal policy's danger adds (the Dwarf
 * revision): the eruption of each hostile Mole mound next to `at` (ground
 * units only), each hostile mound's surfacing reach (its unit comes up
 * fresh: the tiles within two), and one bomb of a visible hostile
 * Gyrocopter in range. A Gyrocopter has no ordinary attack, so it is not
 * also counted as an attacker.
 */
export function probeDangerV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): number {
  let total = 0;
  for (const hostile of hostileUnits(view)) {
    const abilities = unitRoleRuleV7(view, hostile).abilities;
    if (abilities.includes("BOMB_RUN") && !abilities.includes("ATTACK"))
      continue;
    if (!threatenedTiles(view, hostile.id).has(key(at))) continue;
    total += publicProjectedDamageForPolicyV7(view, hostile, unit, at, {
      maximumCharge: true,
    });
  }
  if (!dwarfMatchForPolicyV7(view)) return total;
  const facts = dwarfFactsV7(view, (ownerId) => probeHostileV7(view, ownerId));
  if (onTheGroundV7(view, unit)) total += eruptionAtV7(facts, at);
  total += bombThreatAtV7(facts, at);
  for (const mound of facts.hostileMounds)
    if (chebyshevV7(mound.unit.at, at) <= 2)
      total += publicProjectedDamageForPolicyV7(view, mound.unit, unit, at, {
        maximumCharge: true,
      });
  return total;
}

/** Whether `unit` on `at` stands in visible lethal reach. */
export function probeLethalV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  return probeDangerV7(view, unit, at) >= probeToughnessV7(view, unit);
}

/** The offered commands, indexed as the probe's rules read them. */
export interface OfferedIndexV7 {
  readonly attacks: readonly OfferedV7<"ATTACK">[];
  readonly moves: readonly OfferedV7<"MOVE">[];
  readonly pulls: readonly OfferedV7<"TRACTOR_BEAM">[];
  readonly beams: readonly OfferedV7<"BEAM_DOWN">[];
  readonly mindControls: readonly OfferedV7<"MIND_CONTROL">[];
  readonly trains: readonly OfferedV7<"TRAIN">[];
  readonly attackers: ReadonlySet<UnitId>;
  readonly moveEndsByUnit: ReadonlyMap<UnitId, readonly OfferedV7<"MOVE">[]>;
}

export function indexProbeOfferedV7(
  offered: readonly CommandV7[],
): OfferedIndexV7 {
  const attacks: OfferedV7<"ATTACK">[] = [];
  const moves: OfferedV7<"MOVE">[] = [];
  const pulls: OfferedV7<"TRACTOR_BEAM">[] = [];
  const beams: OfferedV7<"BEAM_DOWN">[] = [];
  const mindControls: OfferedV7<"MIND_CONTROL">[] = [];
  const trains: OfferedV7<"TRAIN">[] = [];
  const moveEndsByUnit = new Map<UnitId, OfferedV7<"MOVE">[]>();
  for (const command of offered) {
    if (command.kind === "ATTACK") attacks.push(command);
    else if (command.kind === "MOVE") {
      moves.push(command);
      const list = moveEndsByUnit.get(command.unitId) ?? [];
      list.push(command);
      moveEndsByUnit.set(command.unitId, list);
    } else if (command.kind === "TRACTOR_BEAM") pulls.push(command);
    else if (command.kind === "BEAM_DOWN") beams.push(command);
    else if (command.kind === "MIND_CONTROL") mindControls.push(command);
    else if (command.kind === "TRAIN") trains.push(command);
  }
  return {
    attacks,
    moves,
    pulls,
    beams,
    mindControls,
    trains,
    attackers: new Set(attacks.map((command) => command.unitId)),
    moveEndsByUnit,
  };
}

const moveEnd = (command: OfferedV7<"MOVE">): CoordV7 | undefined =>
  command.path.at(-1);

interface RangeV7 {
  readonly minimum: number;
  readonly maximum: number;
}

function attackRange(view: PlayerViewV7, unit: PublicUnitV7): RangeV7 | null {
  const rule = unitRoleRuleV7(view, unit);
  if (unit.form !== "LAND" || !rule.abilities.includes("ATTACK")) return null;
  return { minimum: rule.minimumRange, maximum: rule.range };
}

const inRange = (range: RangeV7, from: CoordV7, to: CoordV7): boolean => {
  const distance = chebyshevV7(from, to);
  return distance >= range.minimum && distance <= range.maximum;
};

function isRayUnit(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes("HEAT_RAY");
}

/** Whether the role is a carrier: it has Beam Down or the Tractor Beam. */
function isCarrier(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  const abilities = unitRoleRuleV7(view, unit).abilities;
  return abilities.includes("BEAM_DOWN") || abilities.includes("TRACTOR_BEAM");
}

// --- Follow-up damage ---------------------------------------------------------

/**
 * A Move of an unmoved ranged, non-ray unit that ends two tiles or more from
 * `targetAt`, within its range, outside visible lethal reach: the unit
 * shoots from there without retaliation from a melee target. Null when it
 * has none. The Move with the least danger, then the shortest path, wins.
 */
export function probeShootingMoveV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  unit: PublicUnitV7,
  targetAt: CoordV7,
): OfferedV7<"MOVE"> | null {
  const range = attackRange(view, unit);
  if (range === null || range.maximum < 2 || isRayUnit(view, unit)) return null;
  if (unit.activation.moved || primaryUsed(unit)) return null;
  let best: { command: OfferedV7<"MOVE">; danger: number } | null = null;
  for (const command of index.moveEndsByUnit.get(unit.id) ?? []) {
    const end = moveEnd(command);
    if (end === undefined) continue;
    const distance = chebyshevV7(end, targetAt);
    if (distance < Math.max(2, range.minimum) || distance > range.maximum)
      continue;
    const danger = probeDangerV7(view, unit, end);
    if (danger >= probeToughnessV7(view, unit)) continue;
    if (
      best === null ||
      danger < best.danger ||
      (danger === best.danger && command.path.length < best.command.path.length)
    )
      best = { command, danger };
  }
  return best?.command ?? null;
}

/**
 * The damage the own units that can still attack this turn would deal to
 * `target` standing on `at`, without `excludedUnitIds`: every unit that
 * still has its primary action and has `at` in range from where it stands,
 * plus every unmoved ranged unit that can walk to two tiles from `at`
 * (`probeShootingMoveV7`). Each hit is projected against the target's
 * current HP, so the sum never overstates a chain of hits.
 */
export function probeFollowUpDamageV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  target: PublicUnitV7,
  at: CoordV7,
  excludedUnitIds: ReadonlySet<UnitId>,
): number {
  let total = 0;
  for (const unit of ownUnits(view)) {
    if (excludedUnitIds.has(unit.id) || unit.id === target.id) continue;
    const range = attackRange(view, unit);
    if (range === null) continue;
    // A unit that has moved may attack only if the engine still offers it
    // an attack on something (a Shield Projector that moved is offered none).
    const ready =
      !primaryUsed(unit) &&
      (!unit.activation.moved || index.attackers.has(unit.id));
    const standing = ready && inRange(range, unit.at, at);
    if (!standing && probeShootingMoveV7(view, index, unit, at) === null)
      continue;
    total += publicProjectedDamageForPolicyV7(view, unit, target, at);
  }
  return total;
}

// --- 0. Production ----------------------------------------------------------

/**
 * The carrier to train, or null: a heavy (two-slot) carrier whenever one is
 * offered and the army has fewer than one per six front units (always the
 * first); otherwise a light carrier while the army has fewer than one per
 * three front units. Never in a city with a hostile unit within three tiles
 * (bodies first there; the Normal policy decides).
 */
export function probeProductionV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
): MobilityProbeChoiceV7 | null {
  if (index.trains.length === 0) return null;
  const counts = martianArmyCountsV7(view);
  const hostile = hostilePresence(view);
  const quiet = (command: OfferedV7<"TRAIN">): boolean => {
    const city = view.cities.find((item) => item.id === command.cityId);
    return (
      city !== undefined &&
      !hostile.some(
        (unit) => chebyshevV7(unit.at, city.at) <= PROBE_GARRISON_RADIUS_V7,
      )
    );
  };
  const carrierRole = (role: UnitRoleIdV7): "LIGHT" | "HEAVY" | null => {
    const abilities = effectiveRoleRuleV7(role, view.viewer.faction).abilities;
    if (!abilities.includes("BEAM_DOWN") && !abilities.includes("TRACTOR_BEAM"))
      return null;
    return roleMechanicsV7(role, view.viewer.faction).capacitySlots === 2
      ? "HEAVY"
      : "LIGHT";
  };
  const owned = (weight: "LIGHT" | "HEAVY"): number =>
    [...counts.byRole].reduce(
      (sum, [role, count]) => sum + (carrierRole(role) === weight ? count : 0),
      0,
    );
  const heavy = index.trains.find(
    (command) => carrierRole(command.role) === "HEAVY" && quiet(command),
  );
  if (
    heavy !== undefined &&
    owned("HEAVY") <
      Math.max(
        1,
        Math.floor(counts.front / PROBE_FRONT_UNITS_PER_HEAVY_CARRIER_V7),
      )
  )
    return { command: heavy, tool: "TRAIN_HEAVY_CARRIER" };
  const light = index.trains.find(
    (command) => carrierRole(command.role) === "LIGHT" && quiet(command),
  );
  if (
    light !== undefined &&
    owned("LIGHT") < Math.ceil(counts.front / PROBE_FRONT_UNITS_PER_CARRIER_V7)
  )
    return { command: light, tool: "TRAIN_CARRIER" };
  return null;
}

// --- 1. Mind Control --------------------------------------------------------

/** The offered Mind Control on the most valuable target (lower ID on ties). */
export function probeMindControlV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
): MobilityProbeChoiceV7 | null {
  let best: { command: OfferedV7<"MIND_CONTROL">; value: number } | null = null;
  for (const command of index.mindControls) {
    const target = view.units.find((unit) => unit.id === command.targetUnitId);
    if (target === undefined) continue;
    const value = mindControlValueV7(view, target) * 100 + target.hp;
    if (best === null || value > best.value) best = { command, value };
  }
  return best === null ? null : { command: best.command, tool: "MIND_CONTROL" };
}

// --- 2. Pull ----------------------------------------------------------------

export interface ProbePullV7 {
  readonly command: OfferedV7<"TRACTOR_BEAM">;
  readonly tool: "PULL_CITY" | "PULL_KILL" | "PULL_RESCUE";
  readonly to: CoordV7;
  readonly value: number;
  /** For `PULL_CITY`: the center the pull empties. */
  readonly center: CoordV7 | null;
}

/**
 * The best offered pull, or null. In order: a defender pulled off a hostile
 * center next to an own ground unit that can still Move (it steps on); a
 * hostile unit pulled where the own follow-up damage reaches its Shield
 * plus HP when it does not where the unit stands now; an own wounded unit
 * pulled out of visible lethal reach. The destination is the engine's
 * preview (`previewTractorBeamV7`), whatever the puller and the pull length.
 */
export function probeBestPullV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
): ProbePullV7 | null {
  const rank = { PULL_CITY: 3, PULL_KILL: 2, PULL_RESCUE: 1 } as const;
  let best: ProbePullV7 | null = null;
  const offer = (candidate: ProbePullV7): void => {
    if (
      best === null ||
      rank[candidate.tool] > rank[best.tool] ||
      (rank[candidate.tool] === rank[best.tool] && candidate.value > best.value)
    )
      best = candidate;
  };
  for (const command of index.pulls) {
    const target = view.units.find((unit) => unit.id === command.targetUnitId);
    const preview = previewTractorBeamV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (target === undefined || preview === null) continue;
    const to = preview.to;
    if (target.ownerId === view.viewer.id) {
      if (
        target.hp < target.maxHp &&
        probeLethalV7(view, target, target.at) &&
        !probeLethalV7(view, target, to)
      )
        offer({
          command,
          tool: "PULL_RESCUE",
          to,
          value: probeUnitValueV7(view, target),
          center: null,
        });
      continue;
    }
    if (!probeHostileV7(view, target.ownerId)) continue;
    const value = probeUnitValueV7(view, target);
    const city =
      preview.emptiesCenterOfCityId === null
        ? undefined
        : view.cities.find((item) => item.id === preview.emptiesCenterOfCityId);
    if (
      city !== undefined &&
      probeHostileV7(view, city.ownerId) &&
      probeStepperV7(view, index, city.at, command.unitId) !== null
    ) {
      offer({ command, tool: "PULL_CITY", to, value, center: city.at });
      continue;
    }
    const excluded = new Set([command.unitId]);
    const need = probeToughnessV7(view, target);
    if (
      probeFollowUpDamageV7(view, index, target, to, excluded) >= need &&
      probeFollowUpDamageV7(view, index, target, target.at, excluded) < need
    )
      offer({ command, tool: "PULL_KILL", to, value, center: null });
  }
  return best;
}

/**
 * An own ground unit next to `center` that can still Move (so it can step
 * on once the center is empty), not the puller: the one with the most HP.
 */
export function probeStepperV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  center: CoordV7,
  pullerId: UnitId,
): PublicUnitV7 | null {
  let best: PublicUnitV7 | null = null;
  for (const unit of ownUnits(view)) {
    if (
      unit.id === pullerId ||
      unit.form !== "LAND" ||
      chebyshevV7(unit.at, center) !== 1 ||
      unitMovementModeV7(view, unit) === "FLY" ||
      !index.moveEndsByUnit.has(unit.id)
    )
      continue;
    if (best === null || unit.hp > best.hp) best = unit;
  }
  return best;
}

/** After a city pull: the offered Move onto the emptied center. */
export function probeStepOnCenterV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  center: CoordV7,
): MobilityProbeChoiceV7 | null {
  let best: { command: OfferedV7<"MOVE">; hp: number } | null = null;
  for (const command of index.moves) {
    const end = moveEnd(command);
    const unit = view.units.find((item) => item.id === command.unitId);
    if (end === undefined || unit === undefined || !same(end, center)) continue;
    if (
      best === null ||
      unit.hp > best.hp ||
      (unit.hp === best.hp && command.path.length < best.command.path.length)
    )
      best = { command, hp: unit.hp };
  }
  return best === null
    ? null
    : { command: best.command, tool: "STEP_ON_CENTER" };
}

// --- 3. Focus fire ----------------------------------------------------------

interface FocusPlanV7 {
  readonly target: PublicUnitV7;
  readonly attack: OfferedV7<"ATTACK"> | null;
  readonly move: OfferedV7<"MOVE"> | null;
  readonly kills: boolean;
  readonly value: number;
}

function focusPlanFor(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  target: PublicUnitV7,
): FocusPlanV7 | null {
  let total = 0;
  let best: {
    command: OfferedV7<"ATTACK">;
    rank: readonly [number, number, number, number];
  } | null = null;
  const direct = new Set<UnitId>();
  for (const command of index.attacks) {
    if (command.targetUnitId !== target.id) continue;
    const preview = queryCombatPreviewV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null || preview.attackerDies) continue;
    direct.add(command.unitId);
    const hit = preview.damageToDefender + preview.defenderShieldDamage;
    total += hit;
    // A killing hit first, then shots with no retaliation, then the
    // biggest hit, then the lower unit ID.
    const rank = [
      preview.defenderDies ? 1 : 0,
      -preview.damageToAttacker,
      hit,
      -command.unitId,
    ] as const;
    if (
      best === null ||
      rank.some(
        (value, position) =>
          value > (best?.rank[position] ?? 0) &&
          rank
            .slice(0, position)
            .every((prior, at) => prior === best?.rank[at]),
      )
    )
      best = { command, rank };
  }
  let move: OfferedV7<"MOVE"> | null = null;
  for (const unit of ownUnits(view)) {
    if (direct.has(unit.id) || isCarrier(view, unit)) continue;
    const candidate = probeShootingMoveV7(view, index, unit, target.at);
    if (candidate === null) continue;
    total += publicProjectedDamageForPolicyV7(view, unit, target, target.at);
    move ??= candidate;
  }
  if (best === null && move === null) return null;
  return {
    target,
    attack: best?.command ?? null,
    move,
    kills: total >= probeToughnessV7(view, target),
    value: probeUnitValueV7(view, target),
  };
}

/**
 * Focus fire: the next command of the plan that kills a hostile unit this
 * turn. A target the probe pulled or already focused this turn is kept
 * until nothing more can hit it; otherwise the most valuable target that
 * the offered attacks, plus ranged units walking to two tiles from it,
 * kill. Offered attacks go first (killing hit, then no retaliation, then
 * the biggest), then the walking shooters. Null when no target dies: the
 * Normal policy's attack scoring decides.
 */
export function probeFocusFireV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  memory: Pick<MobilityProbeMemoryV7, "focusTargetId" | "pulledTargetIds">,
): (MobilityProbeChoiceV7 & { readonly targetUnitId: UnitId }) | null {
  const choice = (
    plan: FocusPlanV7,
  ): (MobilityProbeChoiceV7 & { readonly targetUnitId: UnitId }) | null =>
    plan.attack !== null
      ? {
          command: plan.attack,
          tool: "FOCUS_ATTACK",
          targetUnitId: plan.target.id,
        }
      : plan.move !== null
        ? {
            command: plan.move,
            tool: "FOCUS_MOVE",
            targetUnitId: plan.target.id,
          }
        : null;
  const hostile = hostileUnits(view);
  const committed = [
    ...(memory.focusTargetId === null ? [] : [memory.focusTargetId]),
    ...[...memory.pulledTargetIds].sort((left, right) => left - right),
  ];
  for (const unitId of committed) {
    const target = hostile.find((unit) => unit.id === unitId);
    if (target === undefined) continue;
    const plan = focusPlanFor(view, index, target);
    if (plan !== null) return choice(plan);
  }
  let best: FocusPlanV7 | null = null;
  for (const target of hostile) {
    const plan = focusPlanFor(view, index, target);
    if (plan === null || !plan.kills) continue;
    if (
      best === null ||
      plan.value > best.value ||
      (plan.value === best.value && plan.target.id < best.target.id)
    )
      best = plan;
  }
  return best === null ? null : choice(best);
}

// --- 4. and 5. Beam Down ----------------------------------------------------

/** Whether the passenger stands on or next to an own city center. */
export function probeAtOwnCityV7(view: PlayerViewV7, at: CoordV7): boolean {
  return view.cities.some(
    (city) => city.ownerId === view.viewer.id && chebyshevV7(city.at, at) <= 1,
  );
}

/**
 * Extraction: an offered Beam Down of an own unit that has used its primary
 * action and stands in visible lethal reach, onto the legal tile with the
 * least danger (never a lethal one). The most valuable such unit first.
 */
export function probeExtractV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
): MobilityProbeChoiceV7 | null {
  let best: {
    command: OfferedV7<"BEAM_DOWN">;
    value: number;
    danger: number;
  } | null = null;
  for (const command of index.beams) {
    const passenger = view.units.find(
      (unit) => unit.id === command.passengerUnitId,
    );
    if (passenger === undefined || !primaryUsed(passenger)) continue;
    if (!probeLethalV7(view, passenger, passenger.at)) continue;
    const danger = probeDangerV7(view, passenger, command.to);
    if (danger >= probeToughnessV7(view, passenger)) continue;
    const value = probeUnitValueV7(view, passenger);
    if (
      best === null ||
      value > best.value ||
      (value === best.value && danger < best.danger)
    )
      best = { command, value, danger };
  }
  return best === null ? null : { command: best.command, tool: "EXTRACT" };
}

/** The nearest known hostile city center, else the nearest hostile unit. */
export function probeGoalV7(view: PlayerViewV7, from: CoordV7): CoordV7 | null {
  const nearest = (points: readonly CoordV7[]): CoordV7 | null =>
    points.reduce<CoordV7 | null>(
      (best, at) =>
        best === null || chebyshevV7(at, from) < chebyshevV7(best, from)
          ? at
          : best,
      null,
    );
  return (
    nearest(
      view.cities
        .filter((city) => probeHostileV7(view, city.ownerId))
        .map((city) => city.at),
    ) ?? nearest(hostilePresence(view).map((unit) => unit.at))
  );
}

/**
 * Delivery: the best offered Beam Down of a unit that can attack but has no
 * attack offered where it stands and is not the garrison of a city with a
 * hostile unit within three tiles. First, for a passenger that still has
 * its primary action, a tile from which it has a hostile unit in range
 * (which it could not reach by its own Move this turn), the most valuable
 * target, then the least danger; otherwise (and for a passenger that has
 * acted, such as a unit trained this turn) the tile that gains the most
 * steps toward the enemy, at least two and more than its own Move would
 * gain. Never onto a tile in visible lethal reach.
 */
export function probeDeliverV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
): MobilityProbeChoiceV7 | null {
  const hostile = hostileUnits(view);
  let best: {
    command: OfferedV7<"BEAM_DOWN">;
    tool: "DELIVER_ATTACK" | "DELIVER_ROUTE";
    score: number;
  } | null = null;
  const passengers = new Map<UnitId, boolean>();
  const eligible = (passenger: PublicUnitV7): boolean => {
    const cached = passengers.get(passenger.id);
    if (cached !== undefined) return cached;
    const range = attackRange(view, passenger);
    const garrison =
      view.cities.some(
        (city) =>
          city.ownerId === view.viewer.id && same(city.at, passenger.at),
      ) &&
      hostilePresence(view).some(
        (unit) =>
          chebyshevV7(unit.at, passenger.at) <= PROBE_GARRISON_RADIUS_V7,
      );
    const result =
      range !== null &&
      !isCarrier(view, passenger) &&
      !index.attackers.has(passenger.id) &&
      !garrison;
    passengers.set(passenger.id, result);
    return result;
  };
  for (const command of index.beams) {
    const passenger = view.units.find(
      (unit) => unit.id === command.passengerUnitId,
    );
    if (passenger === undefined || !eligible(passenger)) continue;
    const range = attackRange(view, passenger);
    if (range === null) continue;
    const danger = probeDangerV7(view, passenger, command.to);
    if (danger >= probeToughnessV7(view, passenger)) continue;
    const ends = (index.moveEndsByUnit.get(passenger.id) ?? []).flatMap(
      (move) => {
        const end = moveEnd(move);
        return end === undefined ? [] : [end];
      },
    );
    // Only a passenger that still has its primary action can shoot on
    // arrival (if the rules let a beamed unit act at all).
    const targets = hostile.filter(
      (unit) =>
        !primaryUsed(passenger) &&
        inRange(range, command.to, unit.at) &&
        !ends.some((end) => inRange(range, end, unit.at)),
    );
    if (targets.length > 0) {
      const value = Math.max(
        ...targets.map((unit) => probeUnitValueV7(view, unit)),
      );
      // A shot from two tiles or more is preferred to standing next to it.
      const standoff = targets.some(
        (unit) => chebyshevV7(unit.at, command.to) >= 2,
      )
        ? 20
        : 0;
      const score = 1000 + value + standoff - 3 * danger;
      if (best === null || score > best.score)
        best = { command, tool: "DELIVER_ATTACK", score };
      continue;
    }
    const goal = probeGoalV7(view, passenger.at);
    if (goal === null) continue;
    const from = chebyshevV7(passenger.at, goal);
    const gain = from - chebyshevV7(command.to, goal);
    const walking = Math.max(
      0,
      ...ends.map((end) => from - chebyshevV7(end, goal)),
    );
    if (gain < PROBE_DELIVER_MINIMUM_GAIN_V7 || gain <= walking) continue;
    const score = 10 * gain - 3 * danger;
    if (best === null || score > best.score)
      best = { command, tool: "DELIVER_ROUTE", score };
  }
  return best === null ? null : { command: best.command, tool: best.tool };
}

// --- 6. Reposition ----------------------------------------------------------

/**
 * The front anchor: the own ground attacker nearest a hostile unit or
 * hostile city center (the unit the carriers work for). Null without a
 * known enemy or without such a unit.
 */
export function probeFrontAnchorV7(view: PlayerViewV7): PublicUnitV7 | null {
  let best: { unit: PublicUnitV7; distance: number } | null = null;
  for (const unit of ownUnits(view)) {
    if (attackRange(view, unit) === null || isCarrier(view, unit)) continue;
    if (unitMovementModeV7(view, unit) === "FLY") continue;
    const goal = probeGoalV7(view, unit.at);
    const nearestUnit = hostilePresence(view).reduce(
      (distance, hostile) =>
        Math.min(distance, chebyshevV7(hostile.at, unit.at)),
      Number.POSITIVE_INFINITY,
    );
    const distance = Math.min(
      goal === null ? Number.POSITIVE_INFINITY : chebyshevV7(goal, unit.at),
      nearestUnit,
    );
    if (!Number.isFinite(distance)) continue;
    if (
      best === null ||
      distance < best.distance ||
      (distance === best.distance && unit.id < best.unit.id)
    )
      best = { unit, distance };
  }
  return best?.unit ?? null;
}

/**
 * How good `at` is for the carrier to hover on: near the front anchor
 * (within `PROBE_HOVER_DISTANCE_V7`), out of danger, and, for a carrier
 * with a Tractor Beam, at a pull distance the engine has offered from a
 * hostile unit that own shooters stand near.
 */
export function probeHoverScoreV7(
  view: PlayerViewV7,
  carrier: PublicUnitV7,
  at: CoordV7,
  anchor: PublicUnitV7,
  pullDistances: ReadonlySet<number>,
): number {
  const danger = probeDangerV7(view, carrier, at);
  if (danger >= probeToughnessV7(view, carrier))
    return Number.NEGATIVE_INFINITY;
  let score =
    -4 * danger -
    3 * Math.max(0, chebyshevV7(at, anchor.at) - PROBE_HOVER_DISTANCE_V7);
  if (unitRoleRuleV7(view, carrier).abilities.includes("TRACTOR_BEAM")) {
    const distances =
      pullDistances.size > 0
        ? pullDistances
        : new Set([PROBE_DEFAULT_PULL_DISTANCE_V7]);
    const shooters = ownUnits(view).filter(
      (unit) => unit.id !== carrier.id && attackRange(view, unit) !== null,
    );
    for (const hostile of hostileUnits(view)) {
      if (!distances.has(chebyshevV7(hostile.at, at))) continue;
      const near = shooters.filter(
        (unit) => chebyshevV7(unit.at, hostile.at) <= 3,
      ).length;
      score += Math.min(3, near) * 2;
    }
  }
  return score;
}

/**
 * Reposition: a carrier that has not acted, moved, or repositioned this
 * turn flies to the best hover tile if it is better than its own by the
 * margin. Null without a front anchor (the Normal policy scouts).
 */
export function probeRepositionV7(
  view: PlayerViewV7,
  index: OfferedIndexV7,
  memory: Pick<MobilityProbeMemoryV7, "repositionedUnitIds" | "pullDistances">,
): MobilityProbeChoiceV7 | null {
  const anchor = probeFrontAnchorV7(view);
  if (anchor === null) return null;
  for (const carrier of ownUnits(view)) {
    if (
      !isCarrier(view, carrier) ||
      carrier.form !== "LAND" ||
      carrier.activation.moved ||
      primaryUsed(carrier) ||
      memory.repositionedUnitIds.has(carrier.id) ||
      // A carrier with an attack offered is left to the Normal policy.
      index.attackers.has(carrier.id)
    )
      continue;
    const stay = probeHoverScoreV7(
      view,
      carrier,
      carrier.at,
      anchor,
      memory.pullDistances,
    );
    let best: { command: OfferedV7<"MOVE">; score: number } | null = null;
    for (const command of index.moveEndsByUnit.get(carrier.id) ?? []) {
      const end = moveEnd(command);
      if (end === undefined) continue;
      const score = probeHoverScoreV7(
        view,
        carrier,
        end,
        anchor,
        memory.pullDistances,
      );
      if (
        best === null ||
        score > best.score ||
        (score === best.score && command.path.length < best.command.path.length)
      )
        best = { command, score };
    }
    if (
      best !== null &&
      Number.isFinite(best.score) &&
      best.score >= stay + PROBE_REPOSITION_MARGIN_V7
    )
      return { command: best.command, tool: "REPOSITION" };
  }
  return null;
}

// --- The probe ----------------------------------------------------------------

/**
 * The probe's override for this decision, or null (the Normal policy
 * decides). The returned command is always one of `offered`
 * (`queryPlayerCommandsV7(view)` by default). `memory` is updated for the
 * returned choice: call this once per accepted command.
 */
export function chooseMartianMobilityProbeCommandV7(
  view: PlayerViewV7,
  memory: MobilityProbeMemoryV7,
  offered: readonly CommandV7[] = queryPlayerCommandsV7(view),
): MobilityProbeChoiceV7 | null {
  if (
    view.outcome !== null ||
    view.pendingChoices.length > 0 ||
    view.viewer.faction !== "MARTIAN"
  )
    return null;
  const turnKey = `${view.round}:${view.viewer.id}`;
  if (memory.turnKey !== turnKey) {
    memory.turnKey = turnKey;
    memory.pulledTargetIds.clear();
    memory.focusTargetId = null;
    memory.centerToEnter = null;
    memory.repositionedUnitIds.clear();
  }
  const index = indexProbeOfferedV7(offered);
  // What the engine offers teaches the hover rule the pull distances.
  for (const command of index.pulls) {
    const puller = view.units.find((unit) => unit.id === command.unitId);
    const target = view.units.find((unit) => unit.id === command.targetUnitId);
    if (puller !== undefined && target !== undefined)
      memory.pullDistances.add(chebyshevV7(puller.at, target.at));
  }

  if (memory.centerToEnter !== null) {
    const step = probeStepOnCenterV7(view, index, memory.centerToEnter);
    memory.centerToEnter = null;
    if (step !== null) return step;
  }
  const production = probeProductionV7(view, index);
  if (production !== null) return production;
  const mindControl = probeMindControlV7(view, index);
  if (mindControl !== null) return mindControl;
  const pull = probeBestPullV7(view, index);
  if (pull !== null) {
    if (pull.tool === "PULL_CITY") memory.centerToEnter = pull.center;
    if (pull.tool === "PULL_KILL")
      memory.pulledTargetIds.add(pull.command.targetUnitId);
    return { command: pull.command, tool: pull.tool };
  }
  const focus = probeFocusFireV7(view, index, memory);
  if (focus !== null) {
    memory.focusTargetId = focus.targetUnitId;
    return { command: focus.command, tool: focus.tool };
  }
  memory.focusTargetId = null;
  const extract = probeExtractV7(view, index);
  if (extract !== null) return extract;
  const deliver = probeDeliverV7(view, index);
  if (deliver !== null) return deliver;
  const reposition = probeRepositionV7(view, index, memory);
  if (reposition !== null && reposition.command.kind === "MOVE") {
    memory.repositionedUnitIds.add(reposition.command.unitId);
    return reposition;
  }
  return null;
}
