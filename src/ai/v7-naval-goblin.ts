import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  unitCapabilitiesV7,
  unitIsIceboundV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { previewKaboomV7, queryCombatPreviewV7 } from "../engine/v7/query";
import { isNeutralOwnerV7, type CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  FRIENDLY_FIRE_TRADE_FACTOR_V7,
  KABOOM_CHIP_MARGIN_V7,
} from "./v7-goblin";
import {
  navalAttackBlastOnAttackerV7,
  navalMovePathLengthV7,
  navalRamApproachV7,
  navalRamShoveValueV7,
  type NavalFleetFactsV7,
  type NavalToolsV7,
} from "./v7-naval";

/**
 * Themed naval branches, the Goblin Scrap Fleet (`pulp_wars-5ti.16`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 3.6): how the Normal AI
 * plays the Fire Raft's Kaboom afloat and the Scrap Dreadnought's death
 * blast, from both sides of the board.
 *
 * Values are in tenths of a Coin, as the Board and Ram rules of
 * `src/ai/v7-naval.ts`: a hit takes the share of its victim's cost that the
 * damage is of its maximum HP, a kill the whole cost. Every function reads
 * only the viewer's public view and the public previews (`previewKaboomV7`
 * and `previewAttackExplosionsV7` are exact on fully visible units), and
 * returns its neutral value for a view without a Fire Raft or an exploding
 * ship, so every other match decides as before.
 */

/** A Fire Raft's Kaboom that is taken goes before every ordinary attack (a kill that clears a center has 1350, Board 1352). */
export const FIRE_RAFT_KABOOM_PRIORITY_V7 = 1349;
/** The Move that brings a Fire Raft next to a cluster worth its blast: above the Ram approach (1276). */
export const FIRE_RAFT_APPROACH_PRIORITY_V7 = 1277;
/** The blast value (tenths of a Coin, after the raft's own cost) from which a raft Kabooms: the Goblin chip margin. */
export const FIRE_RAFT_KABOOM_MARGIN_TENTHS_V7 = KABOOM_CHIP_MARGIN_V7 * 10;
/** The Coins a blast's victim with no training cost (a giant, a daemon) is worth. */
export const UNTRAINED_UNIT_COINS_V7 = 12;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** Whether `unit` is the viewer's own ship that may Kaboom afloat (a Fire Raft with Powder Kegs). */
export function navalOwnFireRaftV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "NAVAL" &&
    unit.ownerId === view.viewer.id &&
    unitRoleRuleV7(view, unit).abilities.includes("KABOOM") &&
    unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).fireRafts &&
    !unitIsIceboundV7(view, unit)
  );
}

/** Whether `unit` is a ship that explodes when it sinks (the Scrap Dreadnought). */
export function navalExplodingShipV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "NAVAL" &&
    (unitRoleMechanicsV7(view, unit).deathBlastDamage ?? 0) > 0
  );
}

/** The share of `unit`'s cost that `damage` takes, in tenths of a Coin. */
function lossTenthsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  damage: number,
  dies: boolean,
): number {
  // A unit no one trains (a reward giant, a summoned daemon) counts as
  // `UNTRAINED_UNIT_COINS_V7`.
  const cost = unitRoleRuleV7(view, unit).cost ?? UNTRAINED_UNIT_COINS_V7;
  return dies
    ? cost * 10
    : Math.floor(
        (cost * 10 * Math.min(damage, unit.hp)) / Math.max(1, unit.maxHp),
      );
}

/** A Fire Raft's blast from the viewer's side. */
export interface FireRaftBlastV7 {
  /** Hostile damage and kills, in tenths of a Coin. */
  readonly hostileTenths: number;
  /** Own and allied damage and kills, in tenths of a Coin. */
  readonly friendlyTenths: number;
  readonly hostileKills: number;
  readonly hostileHits: number;
  /** The blast would hit an own or allied ship that explodes when it sinks. */
  readonly hitsOwnExplodingShip: boolean;
}

/** The exact blast of the raft's offered Kaboom (`previewKaboomV7`, the whole chain), or null. */
export function fireRaftKaboomBlastV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
  raft: PublicUnitV7,
): FireRaftBlastV7 | null {
  const preview = previewKaboomV7(view, raft.id);
  if (preview === null) return null;
  let hostileTenths = 0;
  let friendlyTenths = 0;
  let hostileKills = 0;
  const hit = new Set<UnitId>();
  let hitsOwnExplodingShip = false;
  for (const explosion of preview.explosions)
    for (const result of explosion.results) {
      if (result.unitId === null) continue;
      const unit = view.units.find((item) => item.id === result.unitId);
      if (unit === undefined) continue;
      const loss = lossTenthsV7(view, unit, result.damage, result.dies);
      if (result.friendly) {
        friendlyTenths += loss;
        if (navalExplodingShipV7(view, unit)) hitsOwnExplodingShip = true;
      } else if (isHostile(result.ownerId)) {
        hostileTenths += loss;
        if (result.dies) hostileKills += 1;
        if (result.damage > 0) hit.add(unit.id);
      }
    }
  return {
    hostileTenths,
    friendlyTenths,
    hostileKills,
    hostileHits: hit.size,
    hitsOwnExplodingShip,
  };
}

/**
 * The one-wave blast a raft would set off on `center` (the approach's
 * estimate, `hypotheticalBlastV7`'s rule): every visible unit within 1 of
 * `center` but the raft takes the raft's Kaboom damage, capped at its HP.
 */
export function fireRaftHypotheticalBlastV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
  raft: PublicUnitV7,
  center: CoordV7,
): FireRaftBlastV7 {
  const damage = unitRoleMechanicsV7(view, raft).kaboomDamage ?? 0;
  let hostileTenths = 0;
  let friendlyTenths = 0;
  let hostileKills = 0;
  let hostileHits = 0;
  let hitsOwnExplodingShip = false;
  for (const unit of view.units) {
    if (unit.id === raft.id || unit.hp <= 0) continue;
    if (chebyshev(unit.at, center) > 1) continue;
    const dealt = Math.min(damage, unit.hp);
    const dies = dealt >= unit.hp;
    const loss = lossTenthsV7(view, unit, dealt, dies);
    if (isHostile(unit.ownerId)) {
      hostileTenths += loss;
      if (dies) hostileKills += 1;
      if (dealt > 0) hostileHits += 1;
    } else if (!isNeutralOwnerV7(unit.ownerId)) {
      friendlyTenths += loss;
      if (navalExplodingShipV7(view, unit)) hitsOwnExplodingShip = true;
    }
  }
  return {
    hostileTenths,
    friendlyTenths,
    hostileKills,
    hostileHits,
    hitsOwnExplodingShip,
  };
}

/**
 * Section 3.6, "Kaboom afloat": the gain of a blast (hostile minus twice
 * the friendly fire, as for every Goblin blast, less the raft's own cost
 * unless visible enemies sink it anyway) and whether it is taken: when its
 * gain is at least the chip margin, when it kills and does not lose, or
 * when the raft is doomed and the blast hurts the enemy more than its own
 * side.
 */
export function fireRaftBlastDecisionV7(
  view: PlayerViewV7,
  raft: PublicUnitV7,
  blast: FireRaftBlastV7,
  doomed: boolean,
): { readonly taken: boolean; readonly gain: number } {
  const raftTenths = (unitRoleRuleV7(view, raft).cost ?? 0) * 10;
  const trade =
    blast.hostileTenths - FRIENDLY_FIRE_TRADE_FACTOR_V7 * blast.friendlyTenths;
  const net = trade - raftTenths;
  const gain = doomed ? trade : net;
  const taken =
    blast.hostileHits > 0 &&
    (net >= FIRE_RAFT_KABOOM_MARGIN_TENTHS_V7 ||
      (blast.hostileKills > 0 && net >= 0) ||
      (doomed && trade > 0));
  return { taken, gain };
}

/**
 * The best offered attack of an own ship in tenths of a Coin, the Dreadnought
 * blast its kill sets off included (`navalAttackBlastOnAttackerV7`), and
 * whether it kills; null when it has none. `doomed`: the ship is lost
 * anyway, so what the reply takes from it does not count.
 */
export function navalBestAttackTenthsV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  ship: PublicUnitV7,
  doomed: boolean,
): { readonly value: number; readonly kills: boolean } | null {
  let best: { value: number; kills: boolean } | null = null;
  for (const offered of tools.commands) {
    if (offered.kind !== "ATTACK" || offered.unitId !== ship.id) continue;
    const target = view.units.find((unit) => unit.id === offered.targetUnitId);
    const preview = queryCombatPreviewV7(view, ship.id, offered.targetUnitId);
    if (target === undefined || preview === null) continue;
    const blast = navalAttackBlastOnAttackerV7(
      view,
      ship.id,
      offered.targetUnitId,
      preview,
    );
    const taken = Math.min(ship.hp, preview.damageToAttacker + blast);
    const value =
      lossTenthsV7(
        view,
        target,
        preview.damageToDefender,
        preview.defenderDies,
      ) -
      (doomed ? 0 : lossTenthsV7(view, ship, taken, taken >= ship.hp)) +
      10 * navalRamShoveValueV7(view, ship, target, preview);
    if (best === null || value > best.value)
      best = { value, kills: preview.defenderDies };
  }
  return best;
}

/**
 * Section 3.6, "Kaboom afloat": the score of an own Fire Raft's offered
 * `KABOOM`. Taken (`fireRaftBlastDecisionV7`) it goes before the raft's
 * attacks, unless one of them kills and is worth more than the blast; not
 * taken, the raft does not blow itself up (priority -1).
 */
export function fireRaftKaboomScoreV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  raft: PublicUnitV7,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const none = { priority: -1, strategic: 0, immediate: 0 };
  if (!navalOwnFireRaftV7(view, raft)) return none;
  const blast = fireRaftKaboomBlastV7(view, tools.isHostile, raft);
  if (blast === null) return none;
  const doomed = tools.danger(view, raft, raft.at) >= raft.hp;
  const decision = fireRaftBlastDecisionV7(view, raft, blast, doomed);
  if (!decision.taken) return none;
  const attack = navalBestAttackTenthsV7(view, tools, raft, doomed);
  if (attack !== null && attack.kills && attack.value > decision.gain)
    return none;
  return {
    priority: FIRE_RAFT_KABOOM_PRIORITY_V7,
    strategic: Math.floor(decision.gain / 10),
    immediate: blast.hostileTenths,
  };
}

export interface FireRaftApproachV7 {
  /** The gain of the blast on the destination, in tenths of a Coin. */
  readonly value: number;
}

const FIRE_RAFT_RAM_BEST_CACHE_V7 = new WeakMap<
  NavalToolsV7,
  Map<UnitId, number>
>();

/** The best Ram approach value of an own raft over its offered Moves (cached per decision). */
function bestRamApproachV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  raft: PublicUnitV7,
): number {
  let cache = FIRE_RAFT_RAM_BEST_CACHE_V7.get(tools);
  if (cache === undefined) {
    cache = new Map();
    FIRE_RAFT_RAM_BEST_CACHE_V7.set(tools, cache);
  }
  const cached = cache.get(raft.id);
  if (cached !== undefined) return cached;
  let best = 0;
  for (const to of tools.moveDestinations(raft.id)) {
    const ram = navalRamApproachV7(
      view,
      tools,
      raft,
      to,
      navalMovePathLengthV7(tools, raft, to),
    );
    if (ram !== null) best = Math.max(best, ram.value);
  }
  cache.set(raft.id, best);
  return best;
}

/**
 * Section 3.6, "Raft approach": an own Fire Raft that has not moved or
 * acted compares the blast it would set off on `to` with its best Ram over
 * its offered Moves and moves first when the blast is worth more (and more
 * than a blast where it stands). It never moves next to an own Dreadnought
 * to blast it. Null when the Move earns no blast.
 */
export function fireRaftApproachV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  raft: PublicUnitV7,
  to: CoordV7,
  pathLength: number,
): FireRaftApproachV7 | null {
  if (
    !navalOwnFireRaftV7(view, raft) ||
    raft.activation.moved ||
    raft.activation.attacked ||
    raft.activation.attacksUsed > 0 ||
    raft.activation.specialActed ||
    (raft.at.x === to.x && raft.at.y === to.y)
  )
    return null;
  const there = fireRaftHypotheticalBlastV7(view, tools.isHostile, raft, to);
  if (there.hitsOwnExplodingShip || there.hostileHits === 0) return null;
  const projected = tools.project(view, raft.id, {
    at: to,
    activation: {
      ...raft.activation,
      moved: true,
      movedPathLength: Math.max(1, pathLength),
    },
  });
  const moved = projected.units.find((unit) => unit.id === raft.id);
  if (moved === undefined) return null;
  const doomed = tools.danger(projected, moved, to) >= raft.hp;
  const decision = fireRaftBlastDecisionV7(view, raft, there, doomed);
  if (!decision.taken) return null;
  const here = fireRaftHypotheticalBlastV7(
    view,
    tools.isHostile,
    raft,
    raft.at,
  );
  const hereDecision = fireRaftBlastDecisionV7(
    view,
    raft,
    here,
    tools.danger(view, raft, raft.at) >= raft.hp,
  );
  if (hereDecision.taken && hereDecision.gain >= decision.gain) return null;
  if (bestRamApproachV7(view, tools, raft) >= decision.gain) return null;
  return { value: decision.gain };
}

/**
 * Section 3.6, "The Dreadnought, from both sides": an own Dreadnought is not
 * kept beside own ships when a hostile Submarine is in reach. A Move of an
 * own exploding ship that ends next to an own unit afloat, or of an own unit
 * afloat that ends next to an own exploding ship, is refused when a visible
 * hostile Submarine reaches the exploding ship's tile, unless the mover
 * already stands so (it may always leave).
 */
export function navalDreadnoughtCrowdRejectedV7(
  view: PlayerViewV7,
  tools: NavalToolsV7,
  facts: NavalFleetFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (actor.ownerId !== view.viewer.id || facts.hostileSubmarines.length === 0)
    return false;
  const afloat = (unit: PublicUnitV7) =>
    unit.form === "NAVAL" || unit.form === "EMBARKED";
  const hunted = (at: CoordV7) =>
    facts.hostileSubmarines.some((sub) => tools.reaches(sub, at));
  const own = view.units.filter(
    (unit) =>
      unit.id !== actor.id &&
      unit.hp > 0 &&
      unit.ownerId === view.viewer.id &&
      afloat(unit),
  );
  const crowded = (at: CoordV7): boolean => {
    if (navalExplodingShipV7(view, actor))
      return hunted(at) && own.some((unit) => chebyshev(unit.at, at) === 1);
    if (!afloat(actor)) return false;
    return own.some(
      (unit) =>
        navalExplodingShipV7(view, unit) &&
        chebyshev(unit.at, at) === 1 &&
        hunted(unit.at),
    );
  };
  return crowded(to) && !crowded(actor.at);
}
