import { deepFreeze } from "../model/freeze";
import type { PlayerId, UnitId } from "../model/ids";
import type {
  DomainEventV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import { isResourceRevealedV7 } from "../rules/ruleset-v7";
import { detectionCoversCoordV7, isUnitVisibleToPlayerV7 } from "./observation";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";
import { viewForV7 } from "./view";

/** Pure canonical-to-player projection. Canonical batches stay authority-only. */
export function projectEventsV7(
  beforeState: GameStateV7,
  afterState: GameStateV7,
  viewerId: PlayerId,
  events: readonly DomainEventV7[],
): PlayerEventEnvelopeV7 {
  viewForV7(beforeState, viewerId);
  viewForV7(afterState, viewerId);
  const beforeVisible = visibility(beforeState, viewerId);
  const afterVisible = visibility(afterState, viewerId);
  const beforeUnitIds = new Set(beforeState.units.map((unit) => unit.id));
  const visiblyCreatedUnitIds = new Set<UnitId>();
  for (const event of events)
    if (
      (event.kind === "UNIT_TRAINED" ||
        event.kind === "NAVAL_UNIT_TRAINED" ||
        event.kind === "UNIT_REWARD_GRANTED" ||
        // Revision 19: the Egg unit of a projected EGG_LAID.
        event.kind === "EGG_LAID" ||
        // Revision 13: a Zombie rising in a projected UNIT_INFECTED.
        event.kind === "UNIT_INFECTED" ||
        // Revision 14: a Zombie rising in a projected BITTEN_UNIT_RISEN.
        event.kind === "BITTEN_UNIT_RISEN" ||
        // The ninth unit (7r55): the Wight of a projected WIGHT_RISEN.
        event.kind === "WIGHT_RISEN") &&
      eventVisible(
        beforeState,
        afterState,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
    )
      visiblyCreatedUnitIds.add(event.unitId);
    else if (
      // The Dwarf revision: the Gunner of a projected Assemble.
      event.kind === "UNIT_ASSEMBLED" &&
      event.playerId === viewerId
    )
      visiblyCreatedUnitIds.add(event.assembledUnitId);
    else if (
      // The Candy revision: the unit of a projected Re-bake.
      event.kind === "UNIT_REBAKED" &&
      event.playerId === viewerId
    )
      visiblyCreatedUnitIds.add(event.rebakedUnitId);
    else if (
      // The giants' signatures (RULESET_7_GIANTS.md sections 6.2 and 6.8):
      // the Trooper of a projected Break Off, the Zombie of a projected
      // regurgitation, and a released victim.
      event.kind === "GIANT_BROKE_OFF" &&
      event.playerId === viewerId
    )
      for (const created of event.newUnitIds)
        visiblyCreatedUnitIds.add(created);
    else if (
      event.kind === "UNIT_REGURGITATED" &&
      event.zombieUnitId !== null &&
      giantEventVisibleV7(
        beforeState,
        afterState,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
    )
      visiblyCreatedUnitIds.add(event.zombieUnitId);
    else if (
      event.kind === "SWALLOWED_UNIT_RELEASED" &&
      giantEventVisibleV7(
        beforeState,
        afterState,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
    )
      visiblyCreatedUnitIds.add(event.unitId);
    else if (
      // The Dwarf revision: the Mole and rider of a projected surfacing
      // (section 13.11) return to the board in plain sight of its viewers.
      event.kind === "UNIT_SURFACED" &&
      (event.playerId === viewerId ||
        coordVisible(beforeState, afterState, viewerId, event.at))
    ) {
      visiblyCreatedUnitIds.add(event.unitId);
      if (event.riderUnitId !== null)
        visiblyCreatedUnitIds.add(event.riderUnitId);
    } else if (
      event.kind === "DEAD_RAISED" &&
      eventVisible(
        beforeState,
        afterState,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
    )
      // Revision 13: Skeletons listed in a projected DEAD_RAISED count as
      // visibly created, so they get no duplicate UNIT_REVEALED.
      for (const result of event.results)
        if (afterVisible.has(result.unitId))
          visiblyCreatedUnitIds.add(result.unitId);
  const needsReveal = (unitId: UnitId): boolean =>
    !beforeVisible.has(unitId) &&
    afterVisible.has(unitId) &&
    (beforeUnitIds.has(unitId) || !visiblyCreatedUnitIds.has(unitId));
  const revealed = new Set<UnitId>();
  const concealed = new Set<UnitId>();
  const projected: PlayerEventV7[] = [];

  const ownedBeforeOrAfter = (unitId: UnitId): boolean =>
    beforeState.units.find((unit) => unit.id === unitId)?.ownerId ===
      viewerId ||
    afterState.units.find((unit) => unit.id === unitId)?.ownerId === viewerId;
  for (const event of events) {
    // Revision 14 afflictions: each entry is projected to a viewer that owns
    // its unit or sees it (before the command for damage, before or after for
    // spread, clearing, and revision-15 expiry); an event with no remaining
    // entry is dropped.
    if (event.kind === "PLAGUE_DAMAGED") {
      const results = event.results.filter(
        (entry) =>
          ownedBeforeOrAfter(entry.unitId) || beforeVisible.has(entry.unitId),
      );
      if (results.length > 0) projected.push({ ...event, results });
      continue;
    }
    if (event.kind === "PLAGUE_SPREAD") {
      const results = event.results.filter(
        (entry) =>
          ownedBeforeOrAfter(entry.unitId) ||
          beforeVisible.has(entry.unitId) ||
          afterVisible.has(entry.unitId),
      );
      if (results.length > 0) projected.push({ ...event, results });
      continue;
    }
    if (event.kind === "PLAGUE_CLEARED" || event.kind === "PLAGUE_EXPIRED") {
      const unitIds = event.unitIds.filter(
        (unitId) =>
          ownedBeforeOrAfter(unitId) ||
          beforeVisible.has(unitId) ||
          afterVisible.has(unitId),
      );
      if (unitIds.length > 0) projected.push({ ...event, unitIds });
      continue;
    }
    if (event.kind === "WINDMILL_HEALING_RESOLVED") {
      if (event.playerId === viewerId) projected.push(event);
      else if (coordVisible(afterState, afterState, viewerId, event.at)) {
        const results = event.results.filter((result) =>
          afterVisible.has(result.unitId),
        );
        if (results.length > 0) projected.push({ ...event, results });
      }
      continue;
    }
    // Revision 17 Troll regeneration, projected like Windmill healing: the
    // owner sees every entry; another viewer sees the Trolls it can see.
    if (
      event.kind === "UNITS_REGENERATED" ||
      // The Martian revision section 10.8: a Shield recharge is projected
      // the same way (the entries of units the viewer can see).
      event.kind === "SHIELDS_RECHARGED"
    ) {
      if (event.playerId === viewerId) projected.push(event);
      else if (event.kind === "UNITS_REGENERATED") {
        const results = event.results.filter((result) =>
          afterVisible.has(result.unitId),
        );
        if (results.length > 0) projected.push({ ...event, results });
      } else {
        const results = event.results.filter((result) =>
          afterVisible.has(result.unitId),
        );
        if (results.length > 0) projected.push({ ...event, results });
      }
      continue;
    }
    // Ice Folk Freeze (`pulp_wars-w49.37`): UNITS_FROZEN keeps the results
    // the viewer can see (or owns); a viewer that cannot see the source gets
    // its entries with `sourceUnitId` null; none left drops the event.
    if (event.kind === "UNITS_FROZEN") {
      const seen = (unitId: UnitId): boolean =>
        beforeVisible.has(unitId) || afterVisible.has(unitId);
      const results = event.results.filter(
        (entry) => ownedBeforeOrAfter(entry.unitId) || seen(entry.unitId),
      );
      const sourceSeen =
        event.playerId === viewerId ||
        (event.sourceUnitId !== null && seen(event.sourceUnitId));
      if (results.length > 0)
        projected.push({
          ...event,
          sourceUnitId: sourceSeen ? event.sourceUnitId : null,
          results,
        });
      continue;
    }
    // The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md section 12):
    // WATER_FROZEN and ICE_MELTED go to every viewer with the tiles it has
    // explored (before or after the command) and the units it owns or can
    // see, and are dropped when no tile is left; a viewer that cannot see
    // the freezing unit gets `unitId` null. UNITS_CRUSHED is projected like
    // Plague damage.
    if (event.kind === "WATER_FROZEN" || event.kind === "ICE_MELTED") {
      const seen = (unitId: UnitId): boolean =>
        ownedBeforeOrAfter(unitId) ||
        beforeVisible.has(unitId) ||
        afterVisible.has(unitId);
      const tiles = event.tiles.filter((at) =>
        coordVisible(beforeState, afterState, viewerId, at),
      );
      if (tiles.length === 0) continue;
      if (event.kind === "ICE_MELTED")
        projected.push({ ...event, tiles, freed: event.freed.filter(seen) });
      else
        projected.push({
          ...event,
          unitId:
            event.unitId !== null && seen(event.unitId) ? event.unitId : null,
          tiles,
          icebound: event.icebound.filter(seen),
        });
      continue;
    }
    // The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 12): the
    // Glaze is public on explored tiles (a viewer that sees the Racer gets
    // the tiles it explored), and a Thump keeps the hits the viewer owns or
    // sees (a viewer that cannot see the Bunny gets none).
    if (event.kind === "TILES_GLAZED") {
      const tiles = event.tiles.filter((at) =>
        coordVisible(beforeState, afterState, viewerId, at),
      );
      if (
        tiles.length > 0 &&
        (event.playerId === viewerId ||
          beforeVisible.has(event.unitId) ||
          afterVisible.has(event.unitId))
      )
        projected.push({ ...event, tiles });
      continue;
    }
    if (event.kind === "THUMPED") {
      const seen = (unitId: UnitId): boolean =>
        ownedBeforeOrAfter(unitId) ||
        beforeVisible.has(unitId) ||
        afterVisible.has(unitId);
      const hits = event.hits.filter((entry) => seen(entry.unitId));
      if (seen(event.unitId) && hits.length > 0)
        projected.push({ ...event, hits });
      continue;
    }
    if (event.kind === "UNITS_CRUSHED") {
      const results = event.results.filter(
        (entry) =>
          ownedBeforeOrAfter(entry.unitId) || beforeVisible.has(entry.unitId),
      );
      if (results.length > 0) projected.push({ ...event, results });
      continue;
    }
    // The Dwarf revision (section 13.11): a tunnel is projected to its
    // actor and to every viewer that explored one of its tiles (the others
    // hidden); a surfacing like a Rally (the results the viewer owns or can
    // see) or, to a viewer that owns a victim but cannot see the mound, its
    // own entries with the Mole hidden; a bombing run like an attack.
    if (event.kind === "UNIT_TUNNELLED") {
      const known = (at: CoordV7 | null): boolean =>
        at !== null && coordVisible(beforeState, afterState, viewerId, at);
      if (event.playerId === viewerId) projected.push(event);
      else if (
        known(event.from) ||
        known(event.to) ||
        known(event.riderFrom) ||
        known(event.riderTo)
      )
        projected.push({
          ...event,
          from: known(event.from) ? event.from : null,
          to: known(event.to) ? event.to : null,
          riderFrom: known(event.riderFrom) ? event.riderFrom : null,
          riderTo: known(event.riderTo) ? event.riderTo : null,
        });
      continue;
    }
    if (event.kind === "UNIT_SURFACED") {
      const owned = (entry: { readonly unitId: UnitId }): boolean =>
        beforeState.units.find((unit) => unit.id === entry.unitId)?.ownerId ===
        viewerId;
      if (event.playerId === viewerId) projected.push(event);
      else if (coordVisible(beforeState, afterState, viewerId, event.at)) {
        const riderSeen =
          event.riderAt !== null &&
          coordVisible(beforeState, afterState, viewerId, event.riderAt);
        projected.push({
          ...event,
          riderUnitId: riderSeen ? event.riderUnitId : null,
          riderAt: riderSeen ? event.riderAt : null,
          results: event.results.filter(
            (entry) =>
              owned(entry) ||
              beforeVisible.has(entry.unitId) ||
              afterVisible.has(entry.unitId),
          ),
        });
      } else {
        const results = event.results.filter(owned);
        if (results.length > 0)
          projected.push({
            ...event,
            unitId: null,
            at: null,
            riderUnitId: null,
            riderAt: null,
            results,
          });
      }
      continue;
    }
    if (event.kind === "UNIT_BOMBED") {
      const seen = (unitId: UnitId): boolean =>
        beforeVisible.has(unitId) || afterVisible.has(unitId);
      if (
        event.playerId === viewerId ||
        (seen(event.unitId) && seen(event.targetUnitId))
      )
        projected.push(event);
      else if (
        beforeState.units.find((unit) => unit.id === event.targetUnitId)
          ?.ownerId === viewerId
      )
        projected.push({
          kind: "COMBAT_SPLASH_DAMAGE",
          splash: [
            {
              unitId: event.targetUnitId,
              at: event.at,
              damage: event.damage,
              dies: event.killed,
              shieldDamage: event.shieldDamage,
            },
          ],
        });
      continue;
    }
    // The Candy revision (docs/product/RULESET_7_CANDY.md section 12.14):
    // the Crash keeps the units the viewer owns or can see; stale Crumbs the
    // tiles it has explored; eaten Crumbs go to their owner always and to
    // every viewer that sees the eater or has explored the tile, with the
    // eater and its bite hidden from a viewer that cannot see it.
    if (event.kind === "UNITS_CRASHED") {
      const kept = (unitId: UnitId): boolean =>
        ownedBeforeOrAfter(unitId) ||
        beforeVisible.has(unitId) ||
        afterVisible.has(unitId);
      const crashedUnitIds = event.crashedUnitIds.filter(kept);
      const sparedUnitIds = event.sparedUnitIds.filter(kept);
      if (crashedUnitIds.length + sparedUnitIds.length > 0)
        projected.push({ ...event, crashedUnitIds, sparedUnitIds });
      continue;
    }
    if (event.kind === "CRUMBS_STALE") {
      const tiles = event.tiles.filter((at) =>
        coordVisible(beforeState, afterState, viewerId, at),
      );
      if (tiles.length > 0) projected.push({ ...event, tiles });
      continue;
    }
    if (event.kind === "CRUMBS_EATEN") {
      const eaterSeen =
        ownedBeforeOrAfter(event.unitId) ||
        beforeVisible.has(event.unitId) ||
        afterVisible.has(event.unitId);
      if (eaterSeen) {
        if (needsReveal(event.unitId)) {
          const unit = afterState.units.find(
            (candidate) => candidate.id === event.unitId,
          );
          if (unit !== undefined)
            reveal(projected, revealed, unit, revealReason());
        }
        projected.push(event);
      } else if (
        event.playerId === viewerId ||
        coordVisible(beforeState, afterState, viewerId, event.at)
      )
        projected.push({
          ...event,
          unitId: null,
          damage: null,
          shieldDamage: null,
          dies: null,
        });
      continue;
    }
    // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8).
    const giant = projectGiantEventV7(
      beforeState,
      afterState,
      viewerId,
      event,
      beforeVisible,
      afterVisible,
    );
    if (giant !== undefined) {
      if (giant !== null) projected.push(giant);
      continue;
    }
    const ids = unitIds(event);
    if (event.kind === "UNIT_MOVE_INTERRUPTED")
      for (const unit of afterState.units)
        if (needsReveal(unit.id))
          reveal(projected, revealed, unit, revealReason());
    for (const id of ids) {
      if (needsReveal(id)) {
        const unit = afterState.units.find((candidate) => candidate.id === id);
        if (unit !== undefined)
          reveal(projected, revealed, unit, revealReason());
      }
    }
    // Dwarf crowd control (`pulp_wars-w49.33`): a Whirl follows the Wail
    // rule.
    if (
      event.kind === "WAIL_RESOLVED" ||
      event.kind === "WHIRL_RESOLVED" ||
      event.kind === "EXPLOSION_RESOLVED"
    ) {
      // Revision 13 section 6.6, following the Battleship splash precedent:
      // a viewer who sees the Banshee gets the results it owns or could see
      // before; otherwise only its own entries as COMBAT_SPLASH_DAMAGE.
      // Revision 17 section 8.6: an explosion follows the Wail rule (an
      // exploder that died is seen before the command, or not at all).
      const owned = (entry: { readonly unitId: UnitId }) =>
        beforeState.units.find((unit) => unit.id === entry.unitId)?.ownerId ===
        viewerId;
      // Tuning 4 (`pulp_wars-w49.3`): a Blast Mountain has no exploding unit
      // (its `unitId` is the charge's fresh ID); it is seen by its player
      // and by every viewer that has explored its tile.
      const blastSeen =
        event.kind === "EXPLOSION_RESOLVED" &&
        event.cause === "BLAST" &&
        (event.playerId === viewerId ||
          coordVisible(beforeState, afterState, viewerId, event.at));
      if (
        blastSeen ||
        beforeVisible.has(event.unitId) ||
        afterVisible.has(event.unitId)
      ) {
        const results = event.results.filter(
          (entry) => owned(entry) || beforeVisible.has(entry.unitId),
        );
        // The Vampire and Banshee rework (`pulp_wars-ty6i`): the terrified
        // units among the projected results.
        projected.push(
          event.kind === "WAIL_RESOLVED"
            ? {
                ...event,
                results,
                terrified: event.terrified.filter((unitId) =>
                  results.some((entry) => entry.unitId === unitId),
                ),
              }
            : { ...event, results },
        );
      } else {
        const ownedResults = event.results.filter(owned);
        if (ownedResults.length > 0)
          projected.push({
            kind: "COMBAT_SPLASH_DAMAGE",
            splash: ownedResults,
          });
      }
      continue;
    }
    if (
      event.kind === "COMBAT_RESOLVED" &&
      ids.some((id) => !beforeVisible.has(id) && !afterVisible.has(id))
    ) {
      const ownedSplash = event.preview.splash.filter(
        (entry) =>
          beforeState.units.find((unit) => unit.id === entry.unitId)
            ?.ownerId === viewerId,
      );
      // Tuning 6 (`pulp_wars-w49.6`): the viewer's own unit that an
      // attacker it cannot see hit directly is reported the same way, first
      // in the list: what it lost and whether it died, nothing about the
      // attacker. (A unit shot from an unexplored tile used to lose HP, or
      // die, with no event at all for its owner.)
      const target = beforeState.units.find(
        (unit) => unit.id === event.preview.targetUnitId,
      );
      const ownedTarget =
        target !== undefined &&
        target.ownerId === viewerId &&
        (event.preview.damageToDefender > 0 ||
          event.preview.defenderShieldDamage > 0 ||
          event.preview.defenderDies)
          ? [
              {
                unitId: target.id,
                at: target.at,
                damage: event.preview.damageToDefender,
                dies: event.preview.defenderDies,
                shieldDamage: event.preview.defenderShieldDamage,
              },
            ]
          : [];
      if (ownedTarget.length + ownedSplash.length > 0)
        projected.push({
          kind: "COMBAT_SPLASH_DAMAGE",
          splash: [...ownedTarget, ...ownedSplash],
        });
      continue;
    }
    const visible = eventVisible(
      beforeState,
      afterState,
      viewerId,
      event,
      beforeVisible,
      afterVisible,
    );
    if (visible)
      projected.push(
        projectEventPayload(beforeState, afterState, viewerId, event),
      );
  }

  for (const unit of afterState.units) {
    if (needsReveal(unit.id)) reveal(projected, revealed, unit, revealReason());
  }
  for (const unit of beforeState.units) {
    if (
      beforeVisible.has(unit.id) &&
      !afterVisible.has(unit.id) &&
      afterState.units.some((candidate) => candidate.id === unit.id) &&
      !concealed.has(unit.id)
    ) {
      projected.push({
        kind: "UNIT_CONCEALED",
        unitId: unit.id,
        lastSeenAt: unit.at,
      });
      concealed.add(unit.id);
    }
  }
  return deepFreeze({
    format: "pulp-wars-player-events",
    version: 7,
    viewerId,
    commandIndex: afterState.commandIndex,
    events: projected,
  });
}

function eventVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
  beforeVisible: ReadonlySet<UnitId>,
  afterVisible: ReadonlySet<UnitId>,
): boolean {
  const ids = unitIds(event);
  // The Undead pass, correction (`pulp_wars-w49.13`): a Tend that cured a
  // Plague or a bite also reaches every viewer that sees the Captain and a
  // cured unit (a bite vanished from the biter's board without an event).
  // Such a viewer's copy lists only the cured units it sees
  // (`projectEventPayload`); a Tend that only healed stays its owner's.
  if (event.kind === "WOUNDED_TENDED") {
    const seen = (id: UnitId): boolean =>
      beforeVisible.has(id) || afterVisible.has(id);
    const owner =
      before.units.find((unit) => unit.id === event.captainId)?.ownerId ??
      after.units.find((unit) => unit.id === event.captainId)?.ownerId;
    if (owner === viewerId) return ids.every(seen);
    return (
      seen(event.captainId) &&
      event.results.some(
        (result) =>
          (result.curedPlague || result.curedBitten) && seen(result.unitId),
      )
    );
  }
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 12): a
  // boarding is projected to the actor, the former owner, and every viewer
  // that sees the prize's tile before or after the command.
  if (event.kind === "SHIP_BOARDED")
    return (
      event.playerId === viewerId ||
      event.fromPlayerId === viewerId ||
      coordVisible(before, after, viewerId, event.at)
    );
  // The Martian revision section 10.8: a Beam Down, a Mind Control, and a
  // pull are projected to the actor and to every viewer that can see a unit
  // or tile involved before or after the command.
  if (
    event.kind === "UNIT_BEAMED" ||
    event.kind === "UNIT_MIND_CONTROLLED" ||
    event.kind === "UNIT_RELEASED" ||
    event.kind === "UNIT_PULLED"
  ) {
    const seen = (id: UnitId): boolean =>
      beforeVisible.has(id) || afterVisible.has(id);
    const tile = (at: CoordV7): boolean =>
      coordVisible(before, after, viewerId, at);
    if (event.kind === "UNIT_BEAMED")
      return (
        event.playerId === viewerId ||
        seen(event.unitId) ||
        seen(event.passengerUnitId) ||
        tile(event.from) ||
        tile(event.to)
      );
    if (event.kind === "UNIT_MIND_CONTROLLED")
      return (
        event.playerId === viewerId ||
        event.targetOwnerId === viewerId ||
        seen(event.unitId) ||
        seen(event.targetUnitId) ||
        tile(event.at)
      );
    // The Mind Control revision (section 6): a release is shown to both
    // seats and to every player who sees the unit or its tile.
    if (event.kind === "UNIT_RELEASED")
      return (
        event.fromPlayerId === viewerId ||
        event.toPlayerId === viewerId ||
        seen(event.unitId) ||
        tile(event.at)
      );
    return (
      seen(event.sourceUnitId) ||
      seen(event.targetUnitId) ||
      tile(event.from) ||
      tile(event.to)
    );
  }
  // Map curiosities (section 8.7): the bounty is owner-private like Plunder,
  // whether or not the owner saw the Monster die.
  if (event.kind === "MONSTER_BOUNTY_AWARDED")
    return event.playerId === viewerId;
  // Dwarf crowd control (`pulp_wars-w49.33`): a Barricade is public on an
  // explored tile, so its building, repair, and the attacks on it reach
  // the actor and every viewer that explored its tile and sees the unit
  // (before or after the command).
  if (
    event.kind === "BARRICADE_BUILT" ||
    event.kind === "BARRICADE_REPAIRED" ||
    event.kind === "BARRICADE_ATTACKED"
  )
    return (
      event.playerId === viewerId ||
      (coordVisible(before, after, viewerId, event.at) &&
        (beforeVisible.has(event.unitId) || afterVisible.has(event.unitId)))
    );
  if (
    ids.length > 0 &&
    ids.some((id) => !beforeVisible.has(id) && !afterVisible.has(id))
  )
    return false;
  switch (event.kind) {
    // Map curiosities (section 8.8): the neutral turn's bounds are public
    // (they say only that the wilds took their turn); a regeneration follows
    // the ordinary unit-visibility rule.
    case "NEUTRAL_TURN_STARTED":
    case "NEUTRAL_TURN_ENDED":
      return true;
    case "TURN_STARTED":
    case "INCOME_AWARDED":
    case "INCOME_PREVIEWED":
    case "TECH_RESEARCHED":
      return event.playerId === viewerId;
    case "TILES_REVEALED":
      return event.playerId === viewerId;
    case "PORT_BLOCKADE_CHANGED":
    case "SEA_NETWORK_CHANGED":
      return event.playerId === viewerId;
    case "FRUIT_HARVESTED":
    case "GAME_HUNTED":
    case "ECONOMIC_BUILDING_BUILT":
    case "FOREST_CLEARED":
    case "FOREST_REPLANTED":
    case "FOREST_CULTIVATED":
    case "MOUNTAIN_BLASTED":
    case "SHIPYARD_BUILT":
    case "ROAD_BUILT":
    case "FIELD_DEFENSE_BUILT":
      return (
        event.playerId === viewerId ||
        coordVisible(before, after, viewerId, event.at)
      );
    case "IMPROVEMENT_PILLAGED":
      return ids.every((id) => beforeVisible.has(id) || afterVisible.has(id));
    // Tuning 7 (`pulp_wars-w49.10`): a Disband also reaches every viewer
    // that saw the unit before it (it used to vanish from an observer's
    // board without an event). The refund is half the role's public price,
    // so the event tells such a viewer nothing private.
    case "UNIT_DISBANDED":
      return event.playerId === viewerId || beforeVisible.has(event.unitId);
    case "UNIT_WAITED":
      return event.playerId === viewerId;
    case "WINDMILL_HEALING_RESOLVED":
      return event.playerId === viewerId;
    // The Dwarf revision: an Assemble is owner-private like training (its
    // Gunner is revealed to other viewers as an ordinary unit).
    // The Candy revision (section 12.14): a Re-bake like an Assemble, and a
    // Sugar Toss like Tend Wounded (its owner only).
    case "UNIT_TRAINED":
    case "UNIT_REWARD_GRANTED":
    case "UNIT_ASSEMBLED":
    case "UNIT_REBAKED":
    case "SUGAR_TOSSED":
      return event.playerId === viewerId;
    // Revision 19 section 9.6: the owner and every viewer that explored the
    // Egg's tile. The ninth unit (`pulp_wars-w49.17`, 7r55): a Wight
    // climbing out of its Grave, like a hatching Egg.
    case "EGG_LAID":
    case "EGG_HATCHED":
    case "WIGHT_RISEN":
      return (
        event.playerId === viewerId ||
        coordVisible(before, after, viewerId, event.at)
      );
    case "UNIT_SPAWN_DISPLACED":
      return (
        event.playerId === viewerId ||
        (coordVisible(before, after, viewerId, event.from) &&
          (event.to === null ||
            coordVisible(before, after, viewerId, event.to)))
      );
    case "TREASURE_CAPTURED":
      return event.playerId === viewerId;
    // Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md sections 5
    // to 7): a Fountain heal like Windmill healing (the owner, and a viewer
    // that sees the unit on the explored Fountain); a Shrine claim to every
    // viewer that explored its tile (and sees the unit); a Wreck salvage,
    // which pays Coins, to its owner only like a treasure chest.
    case "FOUNTAIN_HEALED":
    case "SHRINE_CLAIMED":
      return (
        event.playerId === viewerId ||
        coordVisible(before, after, viewerId, event.at)
      );
    case "WRECK_SALVAGED":
      return event.playerId === viewerId;
    // Map curiosities round 2 (sections 28.4 and 30.2): a gate event and a
    // toss reach the actor and every viewer that sees the unit (a unit on an
    // explored gate is visible, and a gate's partner is explored with it).
    case "GATE_TRAVERSED":
    case "GATE_BLOCKED":
    case "COIN_TOSSED":
      return (
        event.playerId === viewerId ||
        beforeVisible.has(event.unitId) ||
        afterVisible.has(event.unitId)
      );
    // Revision 17: Plunder Coins are owner-private like Spoils.
    case "SPOILS_AWARDED":
    case "PLUNDER_AWARDED":
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
    case "ACHIEVEMENT_UNLOCKED":
      return event.playerId === viewerId;
    case "MONUMENT_BUILT":
      return coordVisible(before, after, viewerId, event.at);
    case "CITY_REWARD_QUEUED":
    case "CITY_ECONOMY_CHANGED":
    case "ECONOMIC_BUILDING_REMOVED":
      return cityOwner(before, after, event.cityId) === viewerId;
    case "CITY_TERRITORY_EXPANDED":
    case "LAND_GRANTED":
      return event.playerId === viewerId;
    case "FIELD_DEFENSE_DESTROYED":
      return coordVisible(before, after, viewerId, event.at);
    // Revision 13: a Grave is projected exactly to viewers who explored its
    // tile before or after the command, so a hidden kill reveals nothing.
    // The Candy revision (section 12.14): Crumbs are projected like a Grave.
    case "GRAVE_CREATED":
    case "CRUMBS_LEFT":
      return coordVisible(before, after, viewerId, event.at);
    case "PLAYER_ELIMINATED":
    case "MATCH_ENDED":
    case "CITY_CAPTURED":
      return true;
    default:
      if ("cityId" in event)
        return cityVisible(before, after, viewerId, event.cityId);
      return (
        ids.length === 0 ||
        ids.every((id) => beforeVisible.has(id) || afterVisible.has(id))
      );
  }
}

function unitIds(event: DomainEventV7): readonly UnitId[] {
  switch (event.kind) {
    case "COMBAT_RESOLVED":
      return [event.preview.attackerId, event.preview.targetUnitId];
    case "UNITS_RALLIED":
      return [event.captainId, ...event.unitIds];
    case "WOUNDED_TENDED":
      return [event.captainId, ...event.results.map((result) => result.unitId)];
    case "WINDMILL_HEALING_RESOLVED":
    case "UNITS_REGENERATED":
      return event.results.map((result) => result.unitId);
    case "UNIT_PUSHED":
    case "UNIT_PULLED":
      return [event.sourceUnitId, event.targetUnitId];
    // The Martian revision: the Saucer and its passenger; the Brain and its
    // target (the Mind Control revision: the target keeps its ID).
    case "UNIT_BEAMED":
      return [event.unitId, event.passengerUnitId];
    case "UNIT_MIND_CONTROLLED":
    case "SHIP_BOARDED":
      return [event.unitId, event.targetUnitId];
    // The frozen sea: projected before this switch; the freezing unit.
    case "WATER_FROZEN":
      return event.unitId === null ? [] : [event.unitId];
    case "UNIT_SPAWN_DISPLACED":
      return [event.spawnedUnitId, event.displacedUnitId];
    case "UNIT_INFECTED":
      // Revision 13: the ordinary unit-visibility rule on the source Zombie
      // and the risen Zombie; the victim is covered by its own UNIT_DIED.
      return [event.sourceUnitId, event.unitId];
    // The Candy redesign (section 12): each is shown to a viewer who sees
    // both units it names (its actor always does).
    case "UNIT_STUCK":
    case "TOOTHACHE_GIVEN":
      return [event.sourceUnitId, event.unitId];
    case "RICOCHETED":
    case "UNIT_TOPPED_UP":
      return [event.unitId, event.targetUnitId];
    default:
      return "unitId" in event ? [event.unitId] : [];
  }
}

function projectEventPayload(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
): PlayerEventV7 {
  if (event.kind === "MONUMENT_BUILT") {
    const cityId = event.cityId;
    const currentOwner = after.cities.find(
      (city) => city.id === cityId,
    )?.ownerId;
    return currentOwner === viewerId
      ? { ...event, visibility: "FULL" }
      : {
          kind: "MONUMENT_BUILT",
          visibility: "BUILDING_ONLY",
          cityId: event.cityId,
          at: event.at,
          populationAdded: event.populationAdded,
        };
  }
  if (
    (event.kind === "UNIT_INFECTED" || event.kind === "BITTEN_UNIT_RISEN") &&
    event.playerId !== viewerId
  )
    // A unit's home city is owner-private, exactly as in the public view.
    return { ...event, homeCityId: null };
  // Revision 19: Coins are owner-private, so other viewers see no cost.
  if (event.kind === "EGG_LAID")
    return event.playerId === viewerId ? event : { ...event, cost: null };
  if (event.kind === "FOREST_CULTIVATED") {
    const viewer = after.players.find((player) => player.id === viewerId);
    return viewer !== undefined &&
      isResourceRevealedV7("FERTILE_GROUND", viewer.researchedTechs)
      ? event
      : { ...event, resourceAfter: null };
  }
  if (
    event.kind === "ECONOMIC_BUILDING_REMOVED" ||
    event.kind === "IMPROVEMENT_PILLAGED"
  ) {
    const tile = viewForV7(after, viewerId).board.tiles[
      event.at.y * after.board.width + event.at.x
    ];
    const visible = tile?.explored === true ? tile.resource : null;
    const resourceRestored =
      visible === "FERTILE_GROUND" ||
      visible === "ORE" ||
      visible === "UNKNOWN_RESOURCE"
        ? visible
        : null;
    return { ...event, resourceRestored };
  }
  if (event.kind === "WOUNDED_TENDED") {
    // The Undead pass, correction: another viewer's copy lists only the
    // cured units it sees.
    const captainId = event.captainId;
    const owner =
      before.units.find((unit) => unit.id === captainId)?.ownerId ??
      after.units.find((unit) => unit.id === captainId)?.ownerId;
    if (owner === viewerId) return event;
    const seenBefore = visibility(before, viewerId);
    const seenAfter = visibility(after, viewerId);
    return {
      ...event,
      results: event.results.filter(
        (result) =>
          (result.curedPlague || result.curedBitten) &&
          (seenBefore.has(result.unitId) || seenAfter.has(result.unitId)),
      ),
    };
  }
  if (event.kind === "DEAD_RAISED") {
    // Revision 13: only the Skeletons visible to the viewer afterwards.
    const afterVisible = visibility(after, viewerId);
    return {
      ...event,
      results: event.results.filter((result) =>
        afterVisible.has(result.unitId),
      ),
    };
  }
  if (event.kind === "COMBAT_RESOLVED") {
    const splash = event.preview.splash.filter((entry) => {
      const unit = before.units.find(
        (candidate) => candidate.id === entry.unitId,
      );
      return (
        unit?.ownerId === viewerId ||
        visibility(before, viewerId).has(entry.unitId)
      );
    });
    // Revision 14: Plague is listed only for the target and kept splash.
    const kept = new Set([
      event.preview.targetUnitId,
      ...splash.map((entry) => entry.unitId),
    ]);
    event = {
      ...event,
      preview: {
        ...event.preview,
        splash,
        plagued: event.preview.plagued.filter((unitId) => kept.has(unitId)),
      },
    };
  }
  if (event.kind === "COMBAT_RESOLVED" && event.preview.crush !== "NONE") {
    // The giants' signatures (section 6.1): a collision with a blocker the
    // viewer cannot see is not reported.
    const preview = event.preview;
    const attacker = before.units.find(
      (unit) => unit.id === preview.attackerId,
    );
    const defender = before.units.find(
      (unit) => unit.id === preview.targetUnitId,
    );
    if (attacker !== undefined && defender !== undefined) {
      const behind = {
        x: defender.at.x * 2 - attacker.at.x,
        y: defender.at.y * 2 - attacker.at.y,
      };
      const seenBefore = visibility(before, viewerId);
      const blocker = before.units.find(
        (unit) => unit.id !== defender.id && same(unit.at, behind),
      );
      if (blocker !== undefined && !seenBefore.has(blocker.id))
        event = { ...event, preview: { ...preview, collisionDamage: 0 } };
    }
  }
  if (event.kind !== "COMBAT_RESOLVED" || event.preview.push !== "BLOCKED")
    return event;
  const attacker = before.units.find(
    (unit) => unit.id === event.preview.attackerId,
  );
  const defender = before.units.find(
    (unit) => unit.id === event.preview.targetUnitId,
  );
  if (
    attacker === undefined ||
    defender === undefined ||
    attacker.ownerId !== viewerId ||
    event.preview.defenderDies ||
    attacker.role !== "JUGGERNAUT"
  )
    return event;
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const view = viewForV7(before, viewerId);
  const tile =
    behind.x >= 0 &&
    behind.y >= 0 &&
    behind.x < view.board.width &&
    behind.y < view.board.height
      ? view.board.tiles[behind.y * view.board.width + behind.x]
      : undefined;
  if (
    tile?.explored !== true ||
    tile.site !== null ||
    view.units.some(
      (unit) => unit.id !== defender.id && same(unit.at, behind),
    ) ||
    detectionCoversCoordV7(before, viewerId, behind)
  )
    return event;
  return {
    kind: "COMBAT_RESOLVED",
    preview: {
      ...event.preview,
      push: "UNKNOWN_BEHIND_FOG",
      // The giants' signatures (section 6.1): the crush state follows the
      // Push preview, and an unknown blocker took nothing the viewer knows.
      ...(event.preview.crush === "NONE"
        ? {}
        : { crush: "UNKNOWN_BEHIND_FOG" as const, collisionDamage: 0 }),
    },
  };
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8): the
 * visibility of a Swallow, a digest, a regurgitation, and a release: the
 * actor, the victim's owner, and every viewer that sees the Abomination (or
 * the victim, or the release tile) before or after the command.
 */
function giantEventVisibleV7(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: Extract<
    DomainEventV7,
    {
      kind:
        | "UNIT_SWALLOWED"
        | "UNIT_DIGESTED"
        | "UNIT_REGURGITATED"
        | "SWALLOWED_UNIT_RELEASED";
    }
  >,
  beforeVisible: ReadonlySet<UnitId>,
  afterVisible: ReadonlySet<UnitId>,
): boolean {
  const seen = (unitId: UnitId): boolean =>
    beforeVisible.has(unitId) || afterVisible.has(unitId);
  if (event.playerId === viewerId) return true;
  switch (event.kind) {
    case "UNIT_SWALLOWED":
      return (
        event.victimOwnerId === viewerId ||
        seen(event.unitId) ||
        seen(event.victimUnitId)
      );
    case "UNIT_DIGESTED":
    case "UNIT_REGURGITATED": {
      const victimOwner = before.giants.swallowed.find(
        (entry) => entry.unit.id === event.victimUnitId,
      )?.unit.ownerId;
      return victimOwner === viewerId || seen(event.unitId);
    }
    case "SWALLOWED_UNIT_RELEASED": {
      const holderOwner = before.units.find(
        (unit) => unit.id === event.holderUnitId,
      )?.ownerId;
      return (
        holderOwner === viewerId ||
        seen(event.holderUnitId) ||
        coordVisible(before, after, viewerId, event.at)
      );
    }
  }
}

/**
 * The giants' signatures: the projection of their events. Returns the
 * projected event, null to drop it, or undefined for an event this does not
 * handle. A crush, a Stomp, and a trample are projected like an attack (to
 * a viewer that sees the giant or the target, with the hits it owns or
 * could see; otherwise its own hits as `COMBAT_SPLASH_DAMAGE`); a Toss like
 * a Move; a Break Off to its owner like a Re-bake; the `UNIT_DIED` of a
 * held victim to its owner and to the viewers that see its holder.
 */
function projectGiantEventV7(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
  beforeVisible: ReadonlySet<UnitId>,
  afterVisible: ReadonlySet<UnitId>,
): PlayerEventV7 | null | undefined {
  const seen = (unitId: UnitId): boolean =>
    beforeVisible.has(unitId) || afterVisible.has(unitId);
  const owned = (unitId: UnitId): boolean =>
    before.units.find((unit) => unit.id === unitId)?.ownerId === viewerId;
  const ownSplash = (
    entries: readonly {
      readonly unitId: UnitId;
      readonly at: CoordV7;
      readonly damage: number;
      readonly dies: boolean;
      readonly shieldDamage: number;
    }[],
  ): PlayerEventV7 | null => {
    const mine = entries
      .filter((entry) => owned(entry.unitId))
      .sort(
        (left, right) =>
          left.at.y - right.at.y ||
          left.at.x - right.at.x ||
          left.unitId - right.unitId,
      );
    return mine.length === 0
      ? null
      : { kind: "COMBAT_SPLASH_DAMAGE", splash: mine };
  };
  switch (event.kind) {
    case "UNIT_SWALLOWED":
    case "UNIT_DIGESTED":
    case "UNIT_REGURGITATED":
    case "SWALLOWED_UNIT_RELEASED":
      return giantEventVisibleV7(
        before,
        after,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
        ? event
        : null;
    case "UNIT_DIED": {
      const held = before.giants.swallowed.find(
        (entry) => entry.unit.id === event.unitId,
      );
      if (held === undefined) return undefined;
      return held.unit.ownerId === viewerId || seen(held.holderUnitId)
        ? event
        : null;
    }
    case "UNIT_CRUSHED": {
      const target = before.units.find(
        (unit) => unit.id === event.targetUnitId,
      );
      const blocker =
        event.blockerUnitId === null
          ? undefined
          : before.units.find((unit) => unit.id === event.blockerUnitId);
      if (
        event.playerId === viewerId ||
        seen(event.sourceUnitId) ||
        seen(event.targetUnitId)
      )
        return event.blockerUnitId === null || seen(event.blockerUnitId)
          ? event
          : {
              ...event,
              blockerUnitId: null,
              blockerDamage: 0,
              blockerShieldDamage: 0,
              blockerDies: false,
            };
      return ownSplash([
        ...(target === undefined
          ? []
          : [
              {
                unitId: target.id,
                at: target.at,
                damage: event.damage,
                dies: event.dies,
                shieldDamage: event.shieldDamage,
              },
            ]),
        ...(blocker === undefined
          ? []
          : [
              {
                unitId: blocker.id,
                at: blocker.at,
                damage: event.blockerDamage,
                dies: event.blockerDies,
                shieldDamage: event.blockerShieldDamage,
              },
            ]),
      ]);
    }
    case "THUNDER_STOMP":
    case "UNITS_TRAMPLED": {
      if (event.playerId === viewerId || seen(event.unitId)) {
        const results = event.results.filter(
          (entry) => owned(entry.unitId) || beforeVisible.has(entry.unitId),
        );
        return event.kind === "THUNDER_STOMP"
          ? {
              ...event,
              results,
              fieldDefenses: event.fieldDefenses.filter((at) =>
                coordVisible(before, after, viewerId, at),
              ),
            }
          : results.length === 0
            ? null
            : { ...event, results };
      }
      return ownSplash(event.results);
    }
    case "GOBLIN_TOSSED":
      return event.playerId === viewerId ||
        seen(event.unitId) ||
        seen(event.passengerUnitId) ||
        coordVisible(before, after, viewerId, event.from) ||
        coordVisible(before, after, viewerId, event.to)
        ? event
        : null;
    case "GIANT_BROKE_OFF":
      return event.playerId === viewerId ? event : null;
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Stampede is projected like a
    // Stomp, to a viewer that owns or sees the Mammoth, with the hits it
    // owns or could see and the path tiles it has explored; otherwise its
    // own hits as `COMBAT_SPLASH_DAMAGE`.
    case "MAMMOTH_STAMPEDED": {
      if (event.playerId === viewerId || seen(event.unitId))
        return {
          ...event,
          path: event.path.filter((at) =>
            coordVisible(before, after, viewerId, at),
          ),
          results: event.results.filter(
            (entry) => owned(entry.unitId) || seen(entry.unitId),
          ),
        };
      return ownSplash(event.results);
    }
    default:
      return undefined;
  }
}

function visibility(
  state: GameStateV7,
  viewerId: PlayerId,
): ReadonlySet<UnitId> {
  return new Set(
    state.units
      .filter((unit) => isUnitVisibleToPlayerV7(state, viewerId, unit))
      .map((unit) => unit.id),
  );
}

function reveal(
  output: PlayerEventV7[],
  revealed: Set<UnitId>,
  unit: Pick<UnitStateV7, "id" | "at">,
  reason: string,
): void {
  if (revealed.has(unit.id)) return;
  output.push({ kind: "UNIT_REVEALED", unitId: unit.id, at: unit.at, reason });
  revealed.add(unit.id);
}

function revealReason(): string {
  return "DETECTED";
}
function cityOwner(
  before: GameStateV7,
  after: GameStateV7,
  cityId: number,
): PlayerId | undefined {
  return (
    after.cities.find((city) => city.id === cityId)?.ownerId ??
    before.cities.find((city) => city.id === cityId)?.ownerId
  );
}
function cityVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  cityId: number,
): boolean {
  return (
    viewForV7(before, viewerId).cities.some((city) => city.id === cityId) ||
    viewForV7(after, viewerId).cities.some((city) => city.id === cityId)
  );
}
function coordVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  at: CoordV7,
): boolean {
  return [before, after].some((state) =>
    state.players
      .find((player) => player.id === viewerId)
      ?.explored.some((known) => same(known, at)),
  );
}
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
