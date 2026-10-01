import type {
  CoordV7,
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../../assets/ruleset7-tactical-ui-symbols";
import type { ExplosionBlastV7 } from "./goblin-explosion-v7";

export type CorePresentationStepV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: number;
      readonly path: readonly CoordV7[];
      readonly durationMs: number;
      readonly followCamera?: true;
    }
  | {
      readonly kind: "BUILD";
      readonly at: CoordV7;
      readonly durationMs: 180;
    }
  | {
      readonly kind: "MELEE" | "RANGED" | "CATAPULT";
      readonly unitId: number;
      readonly from: CoordV7;
      readonly to: CoordV7;
      readonly durationMs: 230 | 280;
      /** Revision 17: a Goblin Bomb Chucker lobs a round black bomb. */
      readonly projectile?: "BOMB";
    }
  | {
      /**
       * Revision 17: one wave of projected `EXPLOSION_RESOLVED` events (or a
       * Bomb Chucker's bomb burst), every blast of the wave together.
       */
      readonly kind: "EXPLOSION";
      readonly wave: number;
      readonly blasts: readonly ExplosionBlastV7[];
      readonly durationMs: 520 | 360;
      /** Another player's blast: the camera frames it, like enemy moves. */
      readonly followCamera?: true;
    }
  | {
      readonly kind: "VISIBILITY_CROSSFADE";
      readonly durationMs: 180;
    }
  | {
      readonly kind: "TACTICAL_STATUS";
      readonly at: CoordV7;
      readonly symbolId: Ruleset7TacticalUiSymbolId;
      readonly durationMs: 240;
    }
  | {
      readonly kind: "SUPPORT";
      /** RALLY/TEND, plus the revision-13 Undead cues. */
      readonly effect: SupportEffectV7;
      readonly actor: Omit<SupportCueUnitV7, "unitId"> & {
        readonly unitId: number | null;
      };
      readonly recipients: readonly SupportCueUnitV7[];
      /** Revision 17: Troll regeneration holds its "+N" float longer. */
      readonly durationMs: 320 | 640;
    }
  | {
      readonly kind: "WINDMILL_HEALING";
      readonly sources: readonly CoordV7[];
      readonly recipients: readonly {
        readonly unitId: number;
        readonly at: CoordV7;
      }[];
      readonly sourceDurationMs: 180;
      readonly recipientDurationMs: 260;
    }
  | {
      readonly kind: "DAMAGE";
      readonly unitId: number;
      readonly at: CoordV7;
      readonly damage: number;
      readonly lethal: boolean;
      readonly durationMs: 100;
    };

/** A unit a support cue plays on. */
export interface SupportCueUnitV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  /** Revision 17 REGENERATE: the HP regained, floated as "+N". */
  readonly amount?: number;
}

export type SupportEffectV7 =
  | "RALLY"
  | "TEND"
  | "RAISE"
  | "DEVOUR"
  | "WAIL"
  | "INFECT"
  | "GRAVE"
  /** Revision 14: Plague damage or spread on the listed units. */
  | "PLAGUE"
  /**
   * Revision 14: Plague lifted because its source Lich left the board;
   * revision 15 also plays it when Plague expires after three turns.
   */
  | "CURE"
  /** Revision 14: a bitten victim rose as the biter's Zombie. */
  | "BITTEN"
  /**
   * Revision 13 Lich splash (vkq.14): the burst on the shot's target (the
   * actor cell) and on each splashed unit, between the shot and the damage.
   */
  | "SPLASH"
  /**
   * Revision 13 Lifesteal (vkq.14): the healed Vampire is the actor; the
   * unit it drained is the single recipient.
   */
  | "LIFESTEAL"
  /**
   * Revision 17 Troll regeneration (bead pulp_wars-0ao.12): the Tend heal
   * ring with a rising "+N" on each regenerated Troll.
   */
  | "REGENERATE";

/** Builds animation instructions exclusively from captured public views/events. */
export function corePresentationPlanV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  after: PlayerViewV7 = before,
): readonly CorePresentationStepV7[] {
  const steps: CorePresentationStepV7[] = [];
  const enemyTurn =
    before.turnOrder[before.activeSeatIndex] !== before.viewer.id;
  const explored = new Set(
    [...before.board.tiles, ...after.board.tiles]
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const origins = new Map(before.units.map((unit) => [unit.id, unit.at]));
  const healingEvents = envelope.events.filter(
    (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
  );
  const healingSources = healingEvents.map((event) => event.at);
  const healingRecipientIds = new Set(
    healingEvents.flatMap((event) =>
      event.results.map((result) => result.unitId),
    ),
  );
  const healingRecipients = [...healingRecipientIds].flatMap((unitId) => {
    const unit = after.units.find((candidate) => candidate.id === unitId);
    return unit === undefined ? [] : [{ unitId, at: unit.at }];
  });
  let healingAdded = false;
  let visibilityCrossfadeAdded = false;
  let gravesAdded = false;
  let lastExplosionIndex = -1;
  const graves = envelope.events.flatMap((event) =>
    event.kind === "GRAVE_CREATED" &&
    explored.has(`${event.at.x},${event.at.y}`)
      ? [event.at]
      : [],
  );
  for (const event of envelope.events) {
    if (event.kind === "WINDMILL_HEALING_RESOLVED") {
      if (
        !healingAdded &&
        healingSources.length > 0 &&
        healingRecipients.length > 0
      ) {
        steps.push({
          kind: "WINDMILL_HEALING",
          sources: healingSources,
          recipients: healingRecipients,
          sourceDurationMs: 180,
          recipientDurationMs: 260,
        });
        healingAdded = true;
      }
    } else if (event.kind === "UNIT_MOVED") {
      const origin = origins.get(event.unitId);
      if (enemyTurn) {
        // Ordinary public moves may span fog; reveal/conceal events reset
        // their origins.
        // Never join visible stretches across an unobserved coordinate.
        const path =
          origin === undefined ? event.path : [origin, ...event.path];
        let segment: CoordV7[] = [];
        const flush = (): void => {
          if (segment.length > 0)
            steps.push({
              kind: "MOVE",
              unitId: event.unitId,
              path: segment,
              durationMs: Math.min(900, Math.max(1, segment.length - 1) * 90),
              followCamera: true,
            });
          segment = [];
        };
        for (const at of path) {
          if (!explored.has(`${at.x},${at.y}`)) flush();
          else {
            const previous = segment.at(-1);
            if (previous === undefined || !same(previous, at)) segment.push(at);
          }
        }
        flush();
      } else if (origin !== undefined && event.path.length > 0)
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: [origin, ...event.path],
          durationMs: Math.min(900, event.path.length * 90),
        });
      const destination = event.path.at(-1);
      if (destination !== undefined) origins.set(event.unitId, destination);
    } else if (
      event.kind === "UNIT_EMBARKED" ||
      event.kind === "UNIT_DISEMBARKED"
    ) {
      const publicPath = [event.from, event.to].filter((at) =>
        explored.has(`${at.x},${at.y}`),
      );
      if (publicPath.length === 2)
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: publicPath,
          durationMs: 180,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
      origins.set(event.unitId, event.to);
    } else if (
      enemyTurn &&
      (event.kind === "ECONOMIC_BUILDING_BUILT" ||
        event.kind === "PORT_BUILT" ||
        event.kind === "NAVAL_UNIT_TRAINED" ||
        event.kind === "ROAD_BUILT" ||
        event.kind === "FIELD_DEFENSE_BUILT" ||
        event.kind === "MONUMENT_BUILT")
    ) {
      if (explored.has(`${event.at.x},${event.at.y}`))
        steps.push({ kind: "BUILD", at: event.at, durationMs: 180 });
    } else if (event.kind === "COMBAT_RESOLVED") {
      const attacker = before.units.find(
        (unit) => unit.id === event.preview.attackerId,
      );
      const defender = before.units.find(
        (unit) => unit.id === event.preview.targetUnitId,
      );
      if (attacker === undefined || defender === undefined) continue;
      const ranged =
        attacker.role === "MARKSMAN" ||
        attacker.role === "CATAPULT" ||
        attacker.role === "BATTLESHIP";
      // Revision 17: a Goblin Bomb Chucker's bomb arcs like a Catapult shot.
      const bomb =
        attacker.role === "MARKSMAN" &&
        factionOf(before, attacker.ownerId) === "GOBLIN";
      steps.push({
        kind:
          attacker.role === "CATAPULT" || bomb
            ? "CATAPULT"
            : ranged
              ? "RANGED"
              : "MELEE",
        unitId: attacker.id,
        from: attacker.at,
        to: defender.at,
        durationMs: ranged ? 280 : 230,
        ...(bomb ? { projectile: "BOMB" as const } : {}),
      });
      // The bomb bursts on its target and puffs on each splashed unit.
      if (bomb)
        steps.push({
          kind: "EXPLOSION",
          wave: 1,
          blasts: [
            {
              at: defender.at,
              kind: "BOMB",
              hits: event.preview.splash.flatMap((splash) => {
                const victim = before.units.find(
                  (unit) => unit.id === splash.unitId,
                );
                return victim === undefined ? [] : [victim.at];
              }),
            },
          ],
          durationMs: 360,
        });
      // The Lich (an Undead Catapult) bursts on its target and splash cells.
      if (
        attacker.role === "CATAPULT" &&
        factionOf(before, attacker.ownerId) === "UNDEAD"
      )
        steps.push({
          kind: "SUPPORT",
          effect: "SPLASH",
          actor: { unitId: defender.id, at: defender.at },
          recipients: event.preview.splash.flatMap((splash) => {
            const victim = before.units.find(
              (unit) => unit.id === splash.unitId,
            );
            return victim === undefined
              ? []
              : [{ unitId: victim.id, at: victim.at }];
          }),
          durationMs: 320,
        });
      // Lifesteal: a wisp drains from the damaged unit to the healed Vampire.
      for (const [healed, drained, heal] of [
        [attacker, defender, event.preview.attackerHeal],
        [defender, attacker, event.preview.defenderHeal],
      ] as const)
        if (heal > 0)
          steps.push({
            kind: "SUPPORT",
            effect: "LIFESTEAL",
            actor: { unitId: healed.id, at: healed.at },
            recipients: [{ unitId: drained.id, at: drained.at }],
            durationMs: 320,
          });
      for (const splash of event.preview.splash) {
        const victim = before.units.find((unit) => unit.id === splash.unitId);
        if (victim !== undefined)
          steps.push({
            kind: "DAMAGE",
            unitId: splash.unitId,
            at: victim.at,
            damage: splash.damage,
            lethal: splash.dies,
            durationMs: 100,
          });
      }
    } else if (event.kind === "EXPLOSION_RESOLVED") {
      // Revision 17: one burst per wave, in wave order (events arrive in
      // chain order); blasts of one wave burst together.
      const blast: ExplosionBlastV7 = {
        at: event.at,
        kind: event.cause,
        hits: event.results.map((result) => result.at),
      };
      const last = steps.at(-1);
      if (
        last?.kind === "EXPLOSION" &&
        lastExplosionIndex === steps.length - 1 &&
        last.wave === event.wave
      )
        steps[lastExplosionIndex] = {
          ...last,
          blasts: [...last.blasts, blast],
        };
      else {
        steps.push({
          kind: "EXPLOSION",
          wave: event.wave,
          blasts: [blast],
          durationMs: 520,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
        lastExplosionIndex = steps.length - 1;
      }
    } else if (event.kind === "COMBAT_SPLASH_DAMAGE") {
      for (const splash of event.splash) {
        const victim = before.units.find((unit) => unit.id === splash.unitId);
        if (victim !== undefined)
          steps.push({
            kind: "DAMAGE",
            unitId: splash.unitId,
            at: victim.at,
            damage: splash.damage,
            lethal: splash.dies,
            durationMs: 100,
          });
      }
    } else if (
      event.kind === "UNITS_RALLIED" ||
      event.kind === "WOUNDED_TENDED"
    ) {
      const publicUnits = new Map(
        [...before.units, ...after.units].map(
          (unit) => [unit.id, unit] as const,
        ),
      );
      const actor = publicUnits.get(event.captainId);
      if (actor === undefined) continue;
      const recipientIds =
        event.kind === "UNITS_RALLIED"
          ? event.unitIds
          : event.results.map((result) => result.unitId);
      const recipients = recipientIds.flatMap((unitId) => {
        const unit = publicUnits.get(unitId);
        return unit === undefined ? [] : [{ unitId, at: unit.at }];
      });
      if (recipients.length > 0)
        steps.push({
          kind: "SUPPORT",
          effect: event.kind === "UNITS_RALLIED" ? "RALLY" : "TEND",
          actor: { unitId: actor.id, at: actor.at },
          recipients,
          durationMs: 320,
        });
      // Revision 14: Tend also cures Plague and bites; the cured sparkle.
      if (event.kind === "WOUNDED_TENDED") {
        const [first, ...rest] = event.results.flatMap((result) => {
          const unit = publicUnits.get(result.unitId);
          return unit !== undefined &&
            (result.curedPlague || result.curedBitten)
            ? [{ unitId: unit.id, at: unit.at }]
            : [];
        });
        if (first !== undefined)
          steps.push({
            kind: "SUPPORT",
            effect: "CURE",
            actor: first,
            recipients: rest,
            durationMs: 320,
          });
      }
    } else if (event.kind === "UNITS_REGENERATED") {
      // Revision 17: the projected event lists only Trolls the viewer may
      // see; each one shows the heal ring and its "+N" where it stands.
      const [first, ...rest] = event.results.flatMap((result) => {
        const unit =
          after.units.find((candidate) => candidate.id === result.unitId) ??
          before.units.find((candidate) => candidate.id === result.unitId);
        return unit === undefined || !explored.has(`${unit.at.x},${unit.at.y}`)
          ? []
          : [{ unitId: unit.id, at: unit.at, amount: result.amount }];
      });
      if (first !== undefined)
        steps.push({
          kind: "SUPPORT",
          effect: "REGENERATE",
          actor: first,
          recipients: rest,
          durationMs: 640,
        });
    } else if (event.kind === "DEAD_RAISED") {
      const actor = [...after.units, ...before.units].find(
        (unit) => unit.id === event.unitId,
      );
      if (actor === undefined) continue;
      steps.push({
        kind: "SUPPORT",
        effect: "RAISE",
        actor: { unitId: actor.id, at: actor.at },
        recipients: event.results.map((result) => ({
          unitId: result.unitId,
          at: result.at,
        })),
        durationMs: 320,
      });
    } else if (event.kind === "GRAVE_DEVOURED") {
      steps.push({
        kind: "SUPPORT",
        effect: "DEVOUR",
        actor: { unitId: event.unitId, at: event.at },
        recipients: [],
        durationMs: 320,
      });
    } else if (event.kind === "WAIL_RESOLVED") {
      steps.push({
        kind: "SUPPORT",
        effect: "WAIL",
        actor: { unitId: event.unitId, at: event.at },
        recipients: event.results.map((result) => ({
          unitId: result.unitId,
          at: result.at,
        })),
        durationMs: 320,
      });
      for (const result of event.results)
        steps.push({
          kind: "DAMAGE",
          unitId: result.unitId,
          at: result.at,
          damage: result.damage,
          lethal: result.dies,
          durationMs: 100,
        });
    } else if (event.kind === "UNIT_INFECTED") {
      if (explored.has(`${event.at.x},${event.at.y}`))
        steps.push({
          kind: "SUPPORT",
          effect: "INFECT",
          actor: { unitId: event.unitId, at: event.at },
          recipients: [],
          durationMs: 320,
        });
    } else if (
      event.kind === "PLAGUE_DAMAGED" ||
      event.kind === "PLAGUE_SPREAD"
    ) {
      // Revision 14 Start Turn Plague: a miasma pulse on every visible
      // damaged or newly plagued unit, then each damage impact.
      const results = event.results.filter((result) =>
        explored.has(`${result.at.x},${result.at.y}`),
      );
      const [first, ...rest] = results;
      if (first === undefined) continue;
      steps.push({
        kind: "SUPPORT",
        effect: "PLAGUE",
        actor: { unitId: first.unitId, at: first.at },
        recipients: rest.map((result) => ({
          unitId: result.unitId,
          at: result.at,
        })),
        durationMs: 320,
      });
      if (event.kind === "PLAGUE_DAMAGED")
        for (const result of event.results)
          if (explored.has(`${result.at.x},${result.at.y}`))
            steps.push({
              kind: "DAMAGE",
              unitId: result.unitId,
              at: result.at,
              damage: result.damage,
              lethal: result.dies,
              durationMs: 100,
            });
    } else if (
      event.kind === "PLAGUE_CLEARED" ||
      event.kind === "PLAGUE_EXPIRED"
    ) {
      // Revision 14 source-Lich clearing and revision 15 expiry lift Plague
      // with the same cure sparkle.
      const [first, ...rest] = event.unitIds.flatMap((unitId) => {
        const unit =
          after.units.find((candidate) => candidate.id === unitId) ??
          before.units.find((candidate) => candidate.id === unitId);
        return unit === undefined ? [] : [{ unitId, at: unit.at }];
      });
      if (first !== undefined)
        steps.push({
          kind: "SUPPORT",
          effect: "CURE",
          actor: first,
          recipients: rest,
          durationMs: 320,
        });
    } else if (event.kind === "BITTEN_UNIT_RISEN") {
      if (explored.has(`${event.at.x},${event.at.y}`))
        steps.push({
          kind: "SUPPORT",
          effect: "BITTEN",
          actor: { unitId: event.unitId, at: event.at },
          recipients: [],
          durationMs: 320,
        });
    } else if (event.kind === "GRAVE_CREATED") {
      const [first, ...rest] = graves;
      if (!gravesAdded && first !== undefined)
        steps.push({
          kind: "SUPPORT",
          effect: "GRAVE",
          actor: { unitId: null, at: first },
          recipients: rest.map((at) => ({ unitId: -1, at })),
          durationMs: 320,
        });
      gravesAdded = true;
    } else if (
      event.kind === "UNIT_REVEALED" ||
      event.kind === "UNIT_CONCEALED"
    ) {
      // A reveal can name the final coordinate of an ordinary move, so it is
      // not an origin. The next public path supplies its own visible start.
      origins.delete(event.unitId);
      if (!visibilityCrossfadeAdded) {
        steps.push({ kind: "VISIBILITY_CROSSFADE", durationMs: 180 });
        visibilityCrossfadeAdded = true;
      }
    }
  }
  return steps;
}

function factionOf(
  view: PlayerViewV7,
  playerId: PlayerViewV7["players"][number]["id"],
): PlayerViewV7["players"][number]["faction"] | undefined {
  return view.players.find((player) => player.id === playerId)?.faction;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
