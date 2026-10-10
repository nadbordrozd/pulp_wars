import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  RAM_BONUS2_V7,
  attackIsTorpedoV7,
  isIceAtV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitIsIceboundV7,
  unitIsSubmergedV7,
  unitMayActAfterMoveV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { previewBoardV7, queryCombatPreviewV7 } from "../engine/v7/query";
import type {
  CoordV7,
  NavalRoleIdV7,
  TechnologyIdV7,
} from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The naval branch for the seafaring seats (`pulp_wars-5ti.4`,
 * docs/product/RULESET_7_NAVAL_BRANCH.md section 13.1, rules in
 * docs/product/RULESET_7_CURRENT.md section 14): when the Normal AI
 * researches Seamanship and Submersibles, which warship it trains against
 * the ships it sees, how it rams, boards, and torpedoes, where a Submarine,
 * a Battleship, and a transport do not go, and how the threat estimate
 * reads a Submarine and a Patrol Boat.
 *
 * Every function reads only the viewer's public view and the public
 * previews (`queryCombatPreviewV7`, `previewBoardV7`); what an attack after
 * a planned Move deals is the exact preview of the view with the unit
 * moved, so a projection here always equals the engine's. Nothing draws
 * from the PRNG, reads authoritative state, or depends on elapsed time.
 * Every rule returns its neutral value at once for a view without a ship,
 * so Dry Land and every match without a naval unit decide as before. The
 * Ice Folk have no ships: their side of the sea is `pulp_wars-5ti.5`.
 */

// --- Priorities and values ---------------------------------------------------

/** Seamanship or Submersibles against a visible hostile ship, with a warship of the seat's own afloat. */
export const NAVAL_DUE_RESEARCH_PRIORITY_V7 = 1170;
/** Harbours for a seat with three docks: after the growth that adds population, before training. */
export const NAVAL_HARBOURS_RESEARCH_PRIORITY_V7 = 1105;
/** Seamanship for a seat with two ships and no enemy at sea: above the generic research, below training. */
export const NAVAL_FLEET_RESEARCH_PRIORITY_V7 = 1075;
/** The own naval units from which Seamanship is worth its price. */
export const NAVAL_SEAMANSHIP_FLEET_V7 = 2;
/** The own docks from which Harbours is worth its price. */
export const NAVAL_HARBOURS_DOCKS_V7 = 3;
/** The counter ships asked for each visible hostile Battleship or Submarine. */
export const NAVAL_COUNTER_RATIO_V7 = 2;
/** Training the ship that counters a visible hostile ship (the Patrol Boat under naval danger has 1290). */
export const NAVAL_COUNTER_TRAINING_PRIORITY_V7 = 1288;
/** A Board that beats the ship's best attack: before every attack (the kill that clears a center has 1350). */
export const NAVAL_BOARD_PRIORITY_V7 = 1352;
/** The share (in tenths) of a prize's cost that counts when it can be sunk on the enemy's next turn. */
export const NAVAL_BOARD_DOOMED_TENTHS_V7 = 3;
/** The Move that earns a Patrol Boat its Ram: above the attack on a transport (1275), below the kill of a threat (1280). */
export const NAVAL_RAM_APPROACH_PRIORITY_V7 = 1276;
/** A shove that takes a blockader off an own dock. */
export const NAVAL_RAM_UNBLOCK_VALUE_V7 = 30;
/** A shove that pushes a transport out of landing reach of an own coast. */
export const NAVAL_RAM_REPEL_VALUE_V7 = 12;
/** A shove that puts the target next to another own ship. */
export const NAVAL_RAM_SETUP_VALUE_V7 = 8;
/** A torpedo by target: Battleship, Submarine, transport, Patrol Boat. */
export const NAVAL_TORPEDO_PRIORITIES_V7 = Object.freeze({
  BATTLESHIP: 1279,
  SUBMARINE: 1278,
  TRANSPORT: 1277,
  PATROL_BOAT: 1276,
});
/** A Patrol Boat between an own Battleship and a visible hostile Submarine. */
export const NAVAL_SCREEN_PRIORITY_V7 = 835;
export const NAVAL_SCREEN_VALUE_V7 = 14;
/** A hostile Submarine this close to an own Battleship is screened against. */
export const NAVAL_SCREEN_RADIUS_V7 = 5;
/** A Battleship's firing station: a tile with targets at two or three tiles. */
export const NAVAL_STATION_PRIORITY_V7 = 832;
export const NAVAL_STATION_TARGET_VALUE_V7 = 6;
export const NAVAL_STATION_CLUSTER_VALUE_V7 = 4;
export const NAVAL_STATION_TARGETS_V7 = 3;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const afloat = (unit: PublicUnitV7): boolean =>
  unit.form === "NAVAL" || unit.form === "EMBARKED";

/**
 * What the policy lends these rules: its hostility test, its threat
 * estimate, and its projection of a unit. `danger` is the damage the
 * visible hostile units can deal `unit` on `at` on their next turn, in
 * `view` (the decision's view, or a projection of it); `reaches` is whether
 * a visible hostile unit's attack reach covers `at`.
 */
export interface NavalToolsV7 {
  readonly isHostile: (ownerId: PlayerId) => boolean;
  readonly danger: (
    view: PlayerViewV7,
    unit: PublicUnitV7,
    at: CoordV7,
  ) => number;
  readonly reaches: (hostile: PublicUnitV7, at: CoordV7) => boolean;
  readonly project: (
    view: PlayerViewV7,
    unitId: UnitId,
    patch: Partial<PublicUnitV7>,
  ) => PlayerViewV7;
  /** The destinations of the Moves offered to an own unit. */
  readonly moveDestinations: (unitId: UnitId) => readonly CoordV7[];
  readonly commands: readonly CommandV7[];
}

/** The ships of the view: the viewer's fleet and the hostile ships it sees. */
export interface NavalFleetFactsV7 {
  readonly ownPatrolBoats: readonly PublicUnitV7[];
  readonly ownBattleships: readonly PublicUnitV7[];
  readonly ownSubmarines: readonly PublicUnitV7[];
  /** The viewer's Ports and Shipyards, blockaded ones included. */
  readonly ownDocks: number;
  /** Visible hostile ships that are not icebound, by role (nor are the own ships above). */
  readonly hostilePatrolBoats: readonly PublicUnitV7[];
  readonly hostileBattleships: readonly PublicUnitV7[];
  readonly hostileSubmarines: readonly PublicUnitV7[];
}

const NAVAL_FLEET_FACTS_CACHE_V7 = new WeakMap<
  PlayerViewV7,
  NavalFleetFactsV7
>();

/**
 * The fleet facts of a view, read once per view. Ships are read by form and
 * role: a boarded prize is its captor's ship of the same role, and a
 * mind-controlled unit is never a ship.
 */
export function navalFleetFactsV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): NavalFleetFactsV7 {
  const cached = NAVAL_FLEET_FACTS_CACHE_V7.get(view);
  if (cached !== undefined) return cached;
  const own = (role: NavalRoleIdV7): PublicUnitV7[] =>
    view.units.filter(
      (unit) =>
        unit.hp > 0 &&
        unit.form === "NAVAL" &&
        unit.role === role &&
        unit.ownerId === view.viewer.id &&
        // The frozen sea (`pulp_wars-5ti.5`): an own ship frozen in is
        // written off: it escorts, screens, and counters nothing.
        !unitIsIceboundV7(view, unit),
    );
  const hostile = (role: NavalRoleIdV7): PublicUnitV7[] =>
    view.units.filter(
      (unit) =>
        unit.hp > 0 &&
        unit.form === "NAVAL" &&
        unit.role === role &&
        isHostile(unit.ownerId) &&
        !unitIsIceboundV7(view, unit),
    );
  const facts: NavalFleetFactsV7 = {
    ownPatrolBoats: own("PATROL_BOAT"),
    ownBattleships: own("BATTLESHIP"),
    ownSubmarines: own("SUBMARINE"),
    ownDocks: view.naval.ownedPorts.length,
    hostilePatrolBoats: hostile("PATROL_BOAT"),
    hostileBattleships: hostile("BATTLESHIP"),
    hostileSubmarines: hostile("SUBMARINE"),
  };
  NAVAL_FLEET_FACTS_CACHE_V7.set(view, facts);
  return facts;
}

/** Whether the view holds a ship at all (the gate of every rule below). */
export function navalShipsInViewV7(facts: NavalFleetFactsV7): boolean {
  return (
    facts.ownPatrolBoats.length +
      facts.ownBattleships.length +
      facts.ownSubmarines.length +
      facts.hostilePatrolBoats.length +
      facts.hostileBattleships.length +
      facts.hostileSubmarines.length >
    0
  );
}

// --- Research ------------------------------------------------------------------

export interface NavalResearchV7 {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
}

/**
 * Section 13.1, "Research". Seamanship (Ram and Board) once the seat has
 * Sailing and owns two naval units or sees a hostile ship; Submersibles
 * once it has Seamanship and sees a hostile Battleship (the Submarine is
 * what sinks one) or owns three docks (Harbours: a population for every
 * dock). With a warship of its own afloat and the hostile ship in sight the
 * technology is due (`NAVAL_DUE_RESEARCH_PRIORITY_V7`); Harbours alone is
 * bought after the cheaper growth; otherwise it goes ahead of the generic
 * research only. Navigation for a Deep Water plan and Shipbuilding for a
 * defended landing stay the naval plan's (`nextNavalTechnologyV7`). Null
 * for an Ice Folk seat (its tree has other technologies under these IDs),
 * and whenever neither technology is wanted or offered.
 */
export function navalBranchResearchV7(
  view: PlayerViewV7,
  facts: NavalFleetFactsV7,
  offered: (tech: TechnologyIdV7) => boolean,
): NavalResearchV7 | null {
  const researched = view.viewer.researchedTechs;
  if (!researched.includes("SHORECRAFT")) return null;
  const capabilities = technologyCapabilitiesV7(
    [...researched, "SEAMANSHIP", "SUBMERSIBLES"],
    view.viewer.faction,
  );
  // A seafaring tree: Seamanship gives the Ram there.
  if (!capabilities.ram) return null;
  const warships =
    facts.ownPatrolBoats.length +
    facts.ownBattleships.length +
    facts.ownSubmarines.length;
  const hostileShips =
    facts.hostilePatrolBoats.length +
    facts.hostileBattleships.length +
    facts.hostileSubmarines.length;
  if (!researched.includes("SEAMANSHIP")) {
    if (!offered("SEAMANSHIP")) return null;
    if (hostileShips > 0 && warships > 0)
      return {
        tech: "SEAMANSHIP",
        priority: NAVAL_DUE_RESEARCH_PRIORITY_V7,
        strategic: 40 + 10 * Math.min(3, warships),
      };
    if (hostileShips > 0 || warships >= NAVAL_SEAMANSHIP_FLEET_V7)
      return {
        tech: "SEAMANSHIP",
        priority: NAVAL_FLEET_RESEARCH_PRIORITY_V7,
        strategic: 20 + 10 * Math.min(3, warships),
      };
    return null;
  }
  if (researched.includes("SUBMERSIBLES") || !offered("SUBMERSIBLES"))
    return null;
  if (facts.hostileBattleships.length > 0)
    return {
      tech: "SUBMERSIBLES",
      priority: NAVAL_DUE_RESEARCH_PRIORITY_V7,
      strategic: 60 + 5 * Math.min(4, facts.ownDocks),
    };
  if (facts.ownDocks >= NAVAL_HARBOURS_DOCKS_V7)
    return {
      tech: "SUBMERSIBLES",
      priority: NAVAL_HARBOURS_RESEARCH_PRIORITY_V7,
      strategic: 5 * facts.ownDocks,
    };
  return null;
}

// --- Training ------------------------------------------------------------------

/**
 * Section 13.1, "Training": the warship the fleet asks for against what it
 * sees. A Submarine while a visible hostile Battleship exists and the own
 * Submarines are fewer than twice those Battleships; a Patrol Boat while a
 * visible hostile Submarine exists and the own Patrol Boats are fewer than
 * twice those Submarines (a Patrol Boat that rams is what hunts one). The
 * Battleship first: it is the ship that kills the others at range. Null
 * when no hostile capital ship or Submarine is in sight.
 */
export function navalCounterRoleV7(
  facts: NavalFleetFactsV7,
  offers: (role: NavalRoleIdV7) => boolean,
): NavalRoleIdV7 | null {
  if (
    facts.hostileBattleships.length > 0 &&
    facts.ownSubmarines.length <
      NAVAL_COUNTER_RATIO_V7 * facts.hostileBattleships.length &&
    offers("SUBMARINE")
  )
    return "SUBMARINE";
  if (
    facts.hostileSubmarines.length > 0 &&
    facts.ownPatrolBoats.length <
      NAVAL_COUNTER_RATIO_V7 * facts.hostileSubmarines.length &&
    offers("PATROL_BOAT")
  )
    return "PATROL_BOAT";
  return null;
}

// --- Board -----------------------------------------------------------------------

/** The value of an exchange in tenths of a Coin: what the target loses less what the attacker loses. */
function exchangeTenthsV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  const targetCost = unitRoleRuleV7(view, target).cost ?? 0;
  const ownCost = unitRoleRuleV7(view, attacker).cost ?? 0;
  const dealt = preview.defenderDies
    ? targetCost * 10
    : Math.floor(
        (targetCost * 10 * Math.min(preview.damageToDefender, target.hp)) /
          Math.max(1, target.maxHp),
      );
  const taken = preview.attackerDies
    ? ownCost * 10
    : Math.floor(
        (ownCost * 10 * Math.min(preview.damageToAttacker, attacker.hp)) /
          Math.max(1, attacker.maxHp),
      );
  return dealt - taken;
}

export interface NavalBoardFactsV7 {
  /** The prize's HP after the Board (`previewBoardV7`). */
  readonly hpAfter: number;
  /** No visible hostile unit can sink the prize on its next turn. */
  readonly safe: boolean;
  /** The prize's value in tenths of a Coin. */
  readonly prizeTenths: number;
  /** The best offered attack of the same ship, in tenths of a Coin (null: none). */
  readonly bestAttackTenths: number | null;
  readonly boards: boolean;
}

/**
 * Section 13.1, "Board": the facts of an offered `BOARD`, or null when it
 * is not offered. The prize is worth its role's cost, or three tenths of it
 * when a visible hostile unit can sink it next turn (the threat estimate on
 * the prize as the viewer's ship at its patched HP). The ship boards when
 * that is at least its best offered attack (valued by the same Coins:
 * the share of the target's cost the attack takes, less the share of the
 * ship's own cost the reply takes), and always boards a Battleship or a
 * Submarine that is not in lethal reach.
 */
export function navalBoardFactsV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  command: Extract<CommandV7, { kind: "BOARD" }>,
): NavalBoardFactsV7 | null {
  const preview = previewBoardV7(view, command.unitId, command.targetUnitId);
  const boarder = view.units.find((unit) => unit.id === command.unitId);
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  if (preview === null || boarder === undefined || target === undefined)
    return null;
  const prizePatch = { ownerId: view.viewer.id, hp: preview.hpAfter };
  const after = tools.project(view, target.id, prizePatch);
  const prize = after.units.find((unit) => unit.id === target.id);
  const safe =
    prize !== undefined &&
    tools.danger(after, prize, prize.at) < preview.hpAfter;
  const cost = unitRoleRuleV7(view, target).cost ?? 0;
  const prizeTenths = cost * (safe ? 10 : NAVAL_BOARD_DOOMED_TENTHS_V7);
  let bestAttackTenths: number | null = null;
  for (const offered of tools.commands) {
    if (offered.kind !== "ATTACK" || offered.unitId !== boarder.id) continue;
    const victim = view.units.find((unit) => unit.id === offered.targetUnitId);
    const combat = queryCombatPreviewV7(view, boarder.id, offered.targetUnitId);
    if (victim === undefined || combat === null) continue;
    const value = exchangeTenthsV7(view, boarder, victim, combat);
    if (bestAttackTenths === null || value > bestAttackTenths)
      bestAttackTenths = value;
  }
  const capital = target.role === "BATTLESHIP" || target.role === "SUBMARINE";
  return {
    hpAfter: preview.hpAfter,
    safe,
    prizeTenths,
    bestAttackTenths,
    boards:
      (capital && safe) ||
      bestAttackTenths === null ||
      prizeTenths >= bestAttackTenths,
  };
}

/** The score of an offered `BOARD` (priority -1: the ship attacks instead). */
export function navalBoardScoreV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  command: Extract<CommandV7, { kind: "BOARD" }>,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const facts = navalBoardFactsV7(view, tools, command);
  if (facts === null || !facts.boards)
    return { priority: -1, strategic: 0, immediate: 0 };
  return {
    priority: NAVAL_BOARD_PRIORITY_V7,
    strategic: Math.floor(facts.prizeTenths / 10) * 4 + facts.hpAfter,
    immediate: facts.hpAfter * 10,
  };
}

// --- Ram -------------------------------------------------------------------------

/** Whether `unit` is the viewer's own Patrol Boat that rams (Seamanship). */
export function navalRammerV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "NAVAL" &&
    unit.ownerId === view.viewer.id &&
    unitRoleRuleV7(view, unit).abilities.includes("RAM") &&
    unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).ram
  );
}

function exploredTile(view: PlayerViewV7, at: CoordV7) {
  if (at.x < 0 || at.y < 0 || at.x >= view.board.width) return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile?.explored === true && same(tile.at, at) ? tile : undefined;
}

/** Whether an embarked unit on `at` could land on a tile of the viewer's territory. */
function inOwnLandingReach(view: PlayerViewV7, at: CoordV7): boolean {
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      const tile = exploredTile(view, { x, y });
      if (
        tile !== undefined &&
        tile.biome !== null &&
        tile.territoryOwnerId === view.viewer.id
      )
        return true;
    }
  return false;
}

/**
 * Section 13.1, "Ram": what the shove of a previewed Ram is worth beyond
 * its damage. 0 unless the preview says `ram` and `WILL_PUSH`. The shove
 * tile is the target's tile plus the sign of its offset from the attacker
 * (the engine's rule; the preview has already decided that it is open).
 */
export function navalRamShoveValueV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  if (!preview.ram || preview.push !== "WILL_PUSH" || preview.defenderDies)
    return 0;
  const behind = {
    x: target.at.x + Math.sign(target.at.x - attacker.at.x),
    y: target.at.y + Math.sign(target.at.y - attacker.at.y),
  };
  let value = 0;
  if (view.naval.ownedPorts.some((port) => same(port.at, target.at)))
    value += NAVAL_RAM_UNBLOCK_VALUE_V7;
  if (
    target.form === "EMBARKED" &&
    inOwnLandingReach(view, target.at) &&
    !inOwnLandingReach(view, behind)
  )
    value += NAVAL_RAM_REPEL_VALUE_V7;
  if (
    view.units.some(
      (unit) =>
        unit.hp > 0 &&
        unit.form === "NAVAL" &&
        unit.ownerId === view.viewer.id &&
        unit.id !== attacker.id &&
        chebyshev(unit.at, behind) === 1 &&
        chebyshev(unit.at, target.at) > 1,
    )
  )
    value += NAVAL_RAM_SETUP_VALUE_V7;
  return value;
}

export interface NavalRamApproachV7 {
  readonly targetUnitId: UnitId;
  /** The exact preview of the attack after the Move. */
  readonly preview: CombatPreviewV7;
  /** The exchange in tenths of a Coin plus ten times the shove's value. */
  readonly value: number;
}

/** The exact preview of the own unit's attack on `target` after a Move of `pathLength` tiles to `to`. */
export function navalAttackAfterMoveV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  pathLength: number,
  targetUnitId: UnitId,
): CombatPreviewV7 | null {
  const moved = tools.project(view, actor.id, {
    at: to,
    activation: {
      ...actor.activation,
      moved: true,
      movedPathLength: Math.max(1, pathLength),
    },
  });
  return queryCombatPreviewV7(moved, actor.id, targetUnitId);
}

/**
 * Section 13.1, "a Patrol Boat makes its approach Move before attacking
 * when that earns the ram": the best Ram an own Patrol Boat that has not
 * moved or attacked has from `to`, or null. Each visible hostile unit
 * afloat next to `to` is previewed with the boat moved there; a Ram counts
 * when the boat survives it, the exchange is not a loss, and the boat is
 * not left in lethal reach it is not already in.
 */
export function navalRamApproachV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  pathLength: number,
): NavalRamApproachV7 | null {
  if (
    !navalRammerV7(view, actor) ||
    actor.activation.moved ||
    actor.activation.attacksUsed > 0 ||
    actor.activation.attacked ||
    unitIsIceboundV7(view, actor)
  )
    return null;
  let best: NavalRamApproachV7 | null = null;
  for (const target of view.units) {
    if (
      target.hp <= 0 ||
      !afloat(target) ||
      !tools.isHostile(target.ownerId) ||
      chebyshev(target.at, to) !== 1 ||
      unitIsIceboundV7(view, target)
    )
      continue;
    const preview = navalAttackAfterMoveV7(
      view,
      tools,
      actor,
      to,
      pathLength,
      target.id,
    );
    if (preview === null || !preview.ram || preview.attackerDies) continue;
    const exchange = exchangeTenthsV7(view, actor, target, preview);
    if (exchange <= 0) continue;
    const value =
      exchange +
      10 * navalRamShoveValueV7(view, { ...actor, at: to }, target, preview);
    if (
      best === null ||
      value > best.value ||
      (value === best.value && target.id < best.targetUnitId)
    )
      best = { targetUnitId: target.id, preview, value };
  }
  if (best === null) return null;
  if (
    navalDangerAfterAttackV7(view, tools, actor, to, best.preview) >=
      actor.hp - best.preview.damageToAttacker &&
    tools.danger(view, actor, actor.at) < actor.hp
  )
    return null;
  return best;
}

/**
 * The threat estimate on an own ship once it has moved to `to` and made the
 * previewed attack: the ship at the HP the reply leaves it, the target at
 * the HP the attack leaves it (gone when it dies) and on the tile a Ram
 * shoves it to.
 */
function navalDangerAfterAttackV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  preview: CombatPreviewV7,
): number {
  const target = view.units.find((unit) => unit.id === preview.targetUnitId);
  let after = tools.project(view, actor.id, {
    at: to,
    hp: actor.hp - preview.damageToAttacker,
  });
  if (target !== undefined && preview.defenderDies)
    after = {
      ...after,
      units: after.units.filter((unit) => unit.id !== target.id),
      unitStats: after.unitStats.filter((stats) => stats.unitId !== target.id),
    };
  else if (target !== undefined)
    after = tools.project(after, target.id, {
      hp: target.hp - preview.damageToDefender,
      at:
        preview.ram && preview.push === "WILL_PUSH"
          ? {
              x: target.at.x + Math.sign(target.at.x - to.x),
              y: target.at.y + Math.sign(target.at.y - to.y),
            }
          : target.at,
    });
  const moved = after.units.find((unit) => unit.id === actor.id);
  return moved === undefined ? 0 : tools.danger(after, moved, to);
}

/**
 * The attack of an own Patrol Boat that has not moved is held while a Move
 * on offer earns a better Ram on the same target (more damage, or the kill
 * the plain attack does not make): the boat sidesteps first and the attack
 * is offered again with the Ram.
 */
export function navalRamHoldsAttackV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  const actor = view.units.find((unit) => unit.id === command.unitId);
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  if (
    actor === undefined ||
    target === undefined ||
    !afloat(target) ||
    !navalRammerV7(view, actor) ||
    actor.activation.moved
  )
    return false;
  const plain = queryCombatPreviewV7(view, actor.id, target.id);
  if (plain === null || plain.ram || plain.defenderDies) return false;
  for (const to of tools.moveDestinations(actor.id)) {
    const approach = navalRamApproachV7(
      view,
      tools,
      actor,
      to,
      chebyshev(actor.at, to),
    );
    if (
      approach !== null &&
      approach.targetUnitId === target.id &&
      (approach.preview.defenderDies ||
        approach.preview.damageToDefender > plain.damageToDefender)
    )
      return true;
  }
  return false;
}

// --- Submarines --------------------------------------------------------------------

/** Whether `unit` is the viewer's own Submarine (a ship whose attack is a torpedo). */
export function navalOwnSubmarineV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unit.ownerId === view.viewer.id && attackIsTorpedoV7(view, unit);
}

/**
 * Section 13.1, "Submarine play", the targets: a torpedo is never answered,
 * so every offered one is worth firing; among them the Battleship first,
 * then a Submarine, then a transport, then a Patrol Boat. Null for an
 * attack that is not a torpedo.
 */
export function navalTorpedoPriorityV7(
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number | null {
  if (!preview.torpedo) return null;
  if (target.form === "EMBARKED") return NAVAL_TORPEDO_PRIORITIES_V7.TRANSPORT;
  if (target.role === "BATTLESHIP")
    return NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP;
  if (target.role === "SUBMARINE") return NAVAL_TORPEDO_PRIORITIES_V7.SUBMARINE;
  return NAVAL_TORPEDO_PRIORITIES_V7.PATROL_BOAT;
}

/**
 * Section 13.1, "Submarine play", the safety: an own Submarine never ends a
 * Move next to a visible hostile Battleship it will not torpedo, nor in the
 * ram reach of two visible hostile Patrol Boats unless it torpedoes this
 * turn. A Submarine torpedoes one target a turn, the Battleship first
 * (`navalTorpedoPriorityV7`): so a tile next to two Battleships is refused,
 * and one next to a Battleship when its attack is spent; a tile two Patrol
 * Boats reach is refused unless a hostile unit afloat is next to it and the
 * attack is unspent. A Submarine that already stands in such a place may
 * leave for any tile.
 */
export function navalSubmarineMoveRejectedV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (!navalOwnSubmarineV7(view, actor)) return false;
  const torpedoReady =
    actor.activation.attacksUsed === 0 &&
    !actor.activation.attacked &&
    !actor.activation.specialActed;
  const unsafe = (at: CoordV7, moving: boolean): boolean => {
    const battleships = facts.hostileBattleships.filter(
      (ship) => chebyshev(ship.at, at) === 1,
    ).length;
    if (battleships > (torpedoReady ? 1 : 0)) return true;
    const rammers = facts.hostilePatrolBoats.filter((boat) =>
      tools.reaches(boat, at),
    ).length;
    if (rammers < 2) return false;
    const torpedoes =
      torpedoReady &&
      view.units.some(
        (unit) =>
          unit.hp > 0 &&
          afloat(unit) &&
          tools.isHostile(unit.ownerId) &&
          chebyshev(unit.at, at) === 1,
      );
    return !(moving && torpedoes);
  };
  return unsafe(to, true) && !unsafe(actor.at, false);
}

// --- Battleships and their screen -------------------------------------------------

/**
 * Section 13.1, "Battleships keep a Patrol Boat between them and a visible
 * hostile Submarine when one is free": the value of a Move of an own Patrol
 * Boat to `to`. `to` screens when it is next to an own Battleship and
 * nearer the Submarine than the Battleship is, the Submarine is within
 * `NAVAL_SCREEN_RADIUS_V7` of that Battleship, and no other own Patrol Boat
 * already stands on such a tile. A boat with an attack on offer is not free
 * (`free`).
 */
export function navalScreenValueV7(
  view: PlayerViewV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  free: boolean,
): number {
  if (
    !free ||
    actor.form !== "NAVAL" ||
    actor.role !== "PATROL_BOAT" ||
    actor.ownerId !== view.viewer.id ||
    facts.ownBattleships.length === 0 ||
    facts.hostileSubmarines.length === 0
  )
    return 0;
  const screens = (at: CoordV7, ship: PublicUnitV7, sub: PublicUnitV7) =>
    chebyshev(at, ship.at) === 1 &&
    chebyshev(at, sub.at) < chebyshev(ship.at, sub.at);
  for (const ship of facts.ownBattleships)
    for (const sub of facts.hostileSubmarines) {
      if (chebyshev(ship.at, sub.at) > NAVAL_SCREEN_RADIUS_V7) continue;
      if (!screens(to, ship, sub) || screens(actor.at, ship, sub)) continue;
      if (
        facts.ownPatrolBoats.some(
          (boat) => boat.id !== actor.id && screens(boat.at, ship, sub),
        )
      )
        continue;
      return NAVAL_SCREEN_VALUE_V7;
    }
  return 0;
}

/**
 * The Battleship's area shot: the value of a Move of an own Battleship to a
 * firing station. A Battleship does not fire after a Move, so it goes where
 * it fires from next turn: `to` counts each visible hostile unit two or
 * three tiles away that it could target there (never a submerged
 * Submarine), at most `NAVAL_STATION_TARGETS_V7`, and the largest group its
 * splash would catch (the hostile units next to one of those targets). 0
 * for a tile next to a visible hostile Submarine or within a hostile
 * Submarine's reach (`reached`), and for a tile that is no better than
 * where it stands.
 */
export function navalBattleshipStationValueV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  if (
    actor.form !== "NAVAL" ||
    actor.role !== "BATTLESHIP" ||
    actor.ownerId !== view.viewer.id
  )
    return 0;
  const rule = unitRoleRuleV7(view, actor);
  if (rule.range < 2 || unitMayActAfterMoveV7(view, actor)) return 0;
  const hostiles = view.units.filter(
    (unit) => unit.hp > 0 && tools.isHostile(unit.ownerId),
  );
  const station = (at: CoordV7): number => {
    if (facts.hostileSubmarines.some((sub) => tools.reaches(sub, at))) return 0;
    const targets = hostiles.filter((unit) => {
      const range = chebyshev(unit.at, at);
      return (
        range >= Math.max(2, rule.minimumRange) &&
        range <= rule.range &&
        !unitIsSubmergedV7(view, unit)
      );
    });
    if (targets.length === 0) return 0;
    const cluster = Math.max(
      ...targets.map(
        (target) =>
          hostiles.filter(
            (unit) =>
              unit.id !== target.id && chebyshev(unit.at, target.at) === 1,
          ).length,
      ),
    );
    return (
      Math.min(NAVAL_STATION_TARGETS_V7, targets.length) *
        NAVAL_STATION_TARGET_VALUE_V7 +
      cluster * NAVAL_STATION_CLUSTER_VALUE_V7
    );
  };
  const there = station(to);
  return there > station(actor.at) ? there : 0;
}

// --- Transports ----------------------------------------------------------------------

/**
 * "Do not sail a transport into a Battleship's or a Submarine's reach
 * unescorted": whether a Move that leaves an own unit afloat on `to` is
 * refused. It is when a visible hostile Battleship or Submarine reaches
 * `to`, no own warship stands on or next to `to`, and the unit is not
 * already in such reach where it is (it may always leave). Both ships sink
 * a transport in one attack, so the test is the reach, not the damage.
 */
export function navalTransportMoveRejectedV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (actor.ownerId !== view.viewer.id || actor.form === "NAVAL") return false;
  const hunters = [...facts.hostileBattleships, ...facts.hostileSubmarines];
  if (hunters.length === 0) return false;
  const reached = (at: CoordV7): boolean =>
    hunters.some((ship) => tools.reaches(ship, at));
  if (!reached(to)) return false;
  if (actor.form === "EMBARKED" && reached(actor.at)) return false;
  return ![
    ...facts.ownPatrolBoats,
    ...facts.ownBattleships,
    ...facts.ownSubmarines,
  ].some((ship) => chebyshev(ship.at, to) <= 1);
}

/**
 * The landing discipline on one landmass (`pulp_wars-eru`): the way by sea
 * must be shorter than the walk by more than this many steps. It pays for
 * the turn spent boarding and the turn spent landing, and it keeps a unit
 * that stands a step either side of the break-even point from changing its
 * mind.
 */
export const NAVAL_SEA_ROUTE_MARGIN_V7 = 3;

/**
 * Whether a land unit that can walk to the naval plan's target goes by sea
 * through one Port instead. `walk` is its public land route to the target
 * from where it stands; `toPort` its distance to the Port; `water` the
 * public water route the seat can sail today from the Port to the water
 * beside the landing coast (absent: no such route, and the unit walks);
 * `coast` the walk from that coast to the target. Every term is counted
 * from the unit's own tile, so the answer changes only when the unit, the
 * target, or the known board does: walking toward the Port keeps a yes,
 * walking toward the target keeps a no, and a unit landed beside its target
 * never gets a yes.
 */
export function navalSeaRouteBeatsWalkV7(route: {
  readonly walk: number;
  readonly toPort: number;
  readonly water: number | undefined;
  readonly coast: number;
}): boolean {
  return (
    route.water !== undefined &&
    route.toPort + route.water + route.coast + NAVAL_SEA_ROUTE_MARGIN_V7 <
      route.walk
  );
}

// --- Threat estimates ---------------------------------------------------------------

/**
 * Section 13.1, "Estimates", for the policy's threat estimate of one
 * visible hostile unit against `defender` standing on `at`.
 *
 * - `spared`: the hostile unit is a Submarine and the defender is not
 *   afloat there (a torpedo targets only units afloat; a unit on ice or on
 *   land is never its target).
 * - `submerged`: the defender is a submerged Submarine there (not on ice),
 *   attacked only from an adjacent tile.
 * - `ramBonus2`: the `attack2` a visible hostile Patrol Boat adds by
 *   ramming a defender afloat on open water. Its owner's Seamanship is
 *   private, so the Ram is assumed (the Wallbreaker precedent).
 */
export function navalThreatFactsV7(
  view: PlayerViewV7,
  hostile: PublicUnitV7,
  defender: PublicUnitV7,
  at: CoordV7,
): {
  readonly spared: boolean;
  readonly submerged: boolean;
  readonly ramBonus2: number;
} {
  if (hostile.form !== "NAVAL" && defender.form !== "NAVAL")
    return NO_NAVAL_THREAT_FACTS_V7;
  const ice = isIceAtV7(view, at);
  const defenderAfloat = afloat(defender) && !ice;
  return {
    spared: attackIsTorpedoV7(view, hostile) && !afloat(defender),
    submerged: unitIsSubmergedV7(view, { ...defender, at }),
    ramBonus2:
      hostile.form === "NAVAL" &&
      defenderAfloat &&
      unitRoleRuleV7(view, hostile).abilities.includes("RAM")
        ? RAM_BONUS2_V7
        : 0,
  };
}

const NO_NAVAL_THREAT_FACTS_V7 = Object.freeze({
  spared: false,
  submerged: false,
  ramBonus2: 0,
});

/**
 * Section 13.1, "own and visible Submarines are threatened only from
 * adjacent tiles": whether a hostile unit's attack reaches a submerged
 * Submarine on `at`. Where it stands, only from the next tile and only with
 * a range that begins at 1. By a Move, a unit that reaches one tile already
 * strikes from the next tile (`reachable` is its estimate); a ranged unit
 * that may act after a Move must come next to the Submarine, which the
 * estimate bounds by its Move plus one; a unit that cannot fire after a
 * Move, or whose range begins beyond 1, never does.
 */
export function navalSubmergedReachV7(
  hostile: PublicUnitV7,
  at: CoordV7,
  facts: {
    readonly move: number;
    readonly minimumRange: number;
    readonly maximumRange: number;
  },
  mayActAfterMove: boolean,
  reachable: boolean,
): { readonly direct: boolean; readonly reachable: boolean } {
  const range = chebyshev(hostile.at, at);
  const adjacentAttack = facts.minimumRange <= 1 && facts.maximumRange >= 1;
  return {
    direct: adjacentAttack && range === 1,
    reachable:
      adjacentAttack &&
      reachable &&
      (facts.maximumRange <= 1 ||
        (mayActAfterMove && range <= 1 + Math.max(0, Math.floor(facts.move)))),
  };
}

/**
 * Section 13.1, "a visible hostile Submarine threatens only afloat units":
 * the tiles of a hostile unit's attack reach that count for a torpedo
 * attacker are the water tiles (an unexplored tile is kept: it may be
 * water). The identity for every other unit.
 */
export function navalTorpedoReachV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  tiles: readonly CoordV7[],
): readonly CoordV7[] {
  if (!attackIsTorpedoV7(view, unit)) return tiles;
  return tiles.filter((at) => {
    const tile = view.board.tiles[at.y * view.board.width + at.x];
    return tile?.explored !== true || tile.biome === null;
  });
}
