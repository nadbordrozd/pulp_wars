import {
  attackIsChargeV7,
  unitRoleRuleV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  unitFactionV7,
} from "../../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../../assets/ruleset7-tactical-ui-symbols";
import type { ExplosionBlastV7 } from "./goblin-explosion-v7";
import type { DinosaurEffectV7 } from "./dinosaur-effects-v7";
import type { MartianFeedbackEffectV7 } from "./martian-effects-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  type IceFolkFeedbackEffectV7,
} from "./ice-folk-effects-v7";
import {
  DWARF_EFFECT_DURATIONS_V7,
  type DwarfFeedbackEffectV7,
} from "./dwarf-effects-v7";
import { attackEffectForV7, type AttackEffectIdV7 } from "./attack-effects-v7";

export type CorePresentationStepV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: number;
      readonly path: readonly CoordV7[];
      readonly durationMs: number;
      readonly followCamera?: true;
      /**
       * Revision 20: the one-tile slide of a unit pushed by a Charge!,
       * before the Triceratops follows. Units with a later slide in such a
       * boundary wait where that slide starts.
       */
      readonly pushSlide?: true;
    }
  | {
      /**
       * Revision 19 Dinosaur cues (DINOSAUR.md "Effects"): the Charge!
       * hit after a run-up, a Spitter's acid landing, an Egg laid, hatching (`unitIds` are
       * the Eggs, whose sprites wobble and whose hatchlings grow in), the
       * Shaman's Hatch call, an Egg destroyed, and a unit growing.
       */
      readonly kind: "DINOSAUR";
      readonly effect: DinosaurEffectV7;
      readonly cells: readonly CoordV7[];
      readonly unitIds: readonly number[];
      /** HATCH_CALL: the Shaman's cell. */
      readonly from?: CoordV7;
      readonly durationMs: number;
      /** Another player's cue: the camera frames it, like enemy moves. */
      readonly followCamera?: true;
    }
  | {
      /**
       * The Martian cues (bead pulp_wars-t6s.4, martian-effects-v7): a heat
       * ray (with its Pierce victim), a Shield flare, the Beam Down column,
       * the Tractor Beam, the Mind Control spiral, and Thralls collapsing.
       */
      readonly kind: "MARTIAN";
      readonly effect: MartianFeedbackEffectV7;
      readonly cells: readonly CoordV7[];
      readonly from?: CoordV7;
      readonly pierce?: CoordV7;
      readonly fullPower?: boolean;
      /** The ray's shooter: shown before the hit, the result after. */
      readonly unitId?: number;
      readonly durationMs: number;
      /** Another player's cue: the camera frames it, like enemy moves. */
      readonly followCamera?: true;
    }
  | {
      /**
       * The Ice Folk cues (bead pulp_wars-7g3.6, ice-folk-effects-v7): a
       * Shatter (`unitId` is the shattered unit, shown cased in ice until it
       * bursts), a Cold Snap, a Bolas, a Cold Aura, and a Mammoth's Sweep.
       */
      readonly kind: "ICE_FOLK";
      readonly effect: IceFolkFeedbackEffectV7;
      readonly cells: readonly CoordV7[];
      readonly from?: CoordV7;
      readonly unitId?: number;
      readonly durationMs: number;
      /** Another player's cue: the camera frames it, like enemy moves. */
      readonly followCamera?: true;
    }
  | {
      /**
       * The Dwarf cues (bead pulp_wars-78i.6, dwarf-effects-v7): a Mole
       * diving into its tunnel, a surfacing's eruption (`unitId` is the Mole;
       * the board shows its mound until the units are back), a Gyrocopter's
       * bomb falling, an Engineer's Assemble and Repair, and a Steam
       * Cannon's Knockback puff.
       */
      readonly kind: "DWARF";
      readonly effect: DwarfFeedbackEffectV7;
      readonly cells: readonly CoordV7[];
      readonly from?: CoordV7;
      readonly unitId?: number;
      readonly durationMs: number;
      /** Another player's cue: the camera frames it, like enemy moves. */
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
      /**
       * Revision 17: a Goblin Bomb Chucker lobs a round black bomb.
       * Revision 19: a Spitter lobs a pale cream acid blob.
       */
      readonly projectile?: "BOMB" | "ACID";
      /**
       * Bead pulp_wars-b5f.5 (attack-effects-v7): a shot drawn as its own
       * cue on the effects overlay (the Lich's bolt, the Rocket Cart's
       * firework, the Gunner's burst, the Steam Cannon's blast, the ice
       * boulder, the harpoon) instead of the arrow or the grey stone.
       */
      readonly attackEffect?: AttackEffectIdV7;
      /**
       * The Ice Folk revision: the target shatters, so the hit keeps it on
       * the board (no impact) for the Shatter step that follows.
       */
      readonly holdTarget?: true;
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
  // Revision 20: the Charge! of this boundary, if any (an attack by a
  // land-form Triceratops). The unit it pushes slides back before the
  // Triceratops follows.
  let chargeUnitId: number | null = null;
  for (const event of envelope.events) {
    if (event.kind !== "COMBAT_RESOLVED") continue;
    const attacker = before.units.find(
      (unit) => unit.id === event.preview.attackerId,
    );
    if (attacker !== undefined && attackIsChargeV7(before, attacker))
      chargeUnitId = attacker.id;
  }
  const isExplored = (at: CoordV7): boolean => explored.has(`${at.x},${at.y}`);
  /** Adds a Dinosaur cue; hatches and Egg losses of one boundary merge. */
  const pushDinosaur = (
    effect: DinosaurEffectV7,
    at: CoordV7,
    unitId: number | null,
    durationMs: number,
    from?: CoordV7,
  ): void => {
    const last = steps.at(-1);
    if (
      last?.kind === "DINOSAUR" &&
      last.effect === effect &&
      (effect === "HATCH" || effect === "EGG_DESTROYED")
    ) {
      steps[steps.length - 1] = {
        ...last,
        cells: [...last.cells, at],
        unitIds: unitId === null ? last.unitIds : [...last.unitIds, unitId],
      };
      return;
    }
    steps.push({
      kind: "DINOSAUR",
      effect,
      cells: [at],
      unitIds: unitId === null ? [] : [unitId],
      durationMs,
      ...(from === undefined ? {} : { from }),
      ...(enemyTurn ? { followCamera: true as const } : {}),
    });
  };
  /** Adds a Martian cue; collapses of one boundary merge. */
  const pushMartian = (
    step: Omit<
      Extract<CorePresentationStepV7, { readonly kind: "MARTIAN" }>,
      "kind" | "followCamera"
    >,
  ): void => {
    const last = steps.at(-1);
    if (
      last?.kind === "MARTIAN" &&
      last.effect === "THRALL_COLLAPSE" &&
      step.effect === "THRALL_COLLAPSE"
    ) {
      steps[steps.length - 1] = {
        ...last,
        cells: [...last.cells, ...step.cells],
      };
      return;
    }
    steps.push({
      kind: "MARTIAN",
      ...step,
      ...(enemyTurn ? { followCamera: true as const } : {}),
    });
  };
  /** Adds an Ice Folk cue at its ICE_FOLK_EFFECT_DURATIONS_V7 duration. */
  const pushIceFolk = (
    step: Omit<
      Extract<CorePresentationStepV7, { readonly kind: "ICE_FOLK" }>,
      "kind" | "followCamera" | "durationMs"
    >,
  ): void => {
    steps.push({
      kind: "ICE_FOLK",
      ...step,
      durationMs: ICE_FOLK_EFFECT_DURATIONS_V7[step.effect],
      ...(enemyTurn ? { followCamera: true as const } : {}),
    });
  };
  /** Adds a Dwarf cue at its DWARF_EFFECT_DURATIONS_V7 duration. */
  const pushDwarf = (
    step: Omit<
      Extract<CorePresentationStepV7, { readonly kind: "DWARF" }>,
      "kind" | "followCamera" | "durationMs"
    >,
  ): void => {
    steps.push({
      kind: "DWARF",
      ...step,
      durationMs: DWARF_EFFECT_DURATIONS_V7[step.effect],
      ...(enemyTurn ? { followCamera: true as const } : {}),
    });
  };
  // The Dwarf revision: a Steam Cannon's Knockback slides its target back
  // like a Charge! push (the target waits where its slide starts).
  const knockbackSources = new Set(
    envelope.events.flatMap((event) => {
      if (event.kind !== "COMBAT_RESOLVED") return [];
      const attacker = before.units.find(
        (unit) => unit.id === event.preview.attackerId,
      );
      return attacker !== undefined &&
        attacker.form === "LAND" &&
        knocksBack(before, attacker)
        ? [attacker.id]
        : [];
    }),
  );
  const unitAnywhere = (id: number) =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id);
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
      event.kind === "UNIT_PUSHED" &&
      knockbackSources.has(event.sourceUnitId)
    ) {
      // The Dwarf revision: a Knockback slides the target one tile straight
      // back, with a puff of steam where it lands.
      if (isExplored(event.from) && isExplored(event.to)) {
        steps.push({
          kind: "MOVE",
          unitId: event.targetUnitId,
          path: [event.from, event.to],
          durationMs: 160,
          pushSlide: true,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
        pushDwarf({ effect: "KNOCKBACK", cells: [event.to] });
      }
      origins.set(event.targetUnitId, event.to);
    } else if (event.kind === "UNIT_PUSHED") {
      // Revision 20: the survivor of a Charge! slides one tile back before
      // the Triceratops follows. Other pushes keep their revision-18 cut.
      if (
        event.sourceUnitId === chargeUnitId &&
        isExplored(event.from) &&
        isExplored(event.to)
      )
        steps.push({
          kind: "MOVE",
          unitId: event.targetUnitId,
          path: [event.from, event.to],
          durationMs: 120,
          pushSlide: true,
        });
      if (event.sourceUnitId === chargeUnitId)
        origins.set(event.targetUnitId, event.to);
    } else if (event.kind === "EGG_LAID") {
      if (isExplored(event.at))
        pushDinosaur("EGG_LAID", event.at, event.unitId, 150);
    } else if (event.kind === "EGG_HATCHED") {
      if (!isExplored(event.at)) continue;
      const shaman =
        event.sourceUnitId === null
          ? undefined
          : before.units.find((unit) => unit.id === event.sourceUnitId);
      if (event.cause === "SHAMAN" && shaman !== undefined)
        pushDinosaur("HATCH_CALL", event.at, null, 250, shaman.at);
      pushDinosaur("HATCH", event.at, event.unitId, 450);
    } else if (event.kind === "UNIT_DIED" && event.cause === "BRAIN_LOST") {
      // The Martian revision: a Thrall collapses when its Brain is lost.
      const thrall = before.units.find((unit) => unit.id === event.unitId);
      if (thrall !== undefined && isExplored(thrall.at))
        pushMartian({
          effect: "THRALL_COLLAPSE",
          cells: [thrall.at],
          durationMs: 320,
        });
    } else if (event.kind === "UNIT_BEAMED") {
      // The Martian revision: the passenger arrives in a column of light.
      const saucer = before.units.find((unit) => unit.id === event.unitId);
      if (isExplored(event.to))
        pushMartian({
          effect: "BEAM_DOWN",
          cells: [event.to],
          ...(saucer === undefined ? {} : { from: saucer.at }),
          durationMs: 480,
        });
      origins.set(event.passengerUnitId, event.to);
    } else if (event.kind === "UNIT_PULLED") {
      // The Martian revision: the beam reaches the target, which slides one
      // tile toward the Mothership.
      const source =
        before.units.find((unit) => unit.id === event.sourceUnitId) ??
        after.units.find((unit) => unit.id === event.sourceUnitId);
      if (source !== undefined && isExplored(event.from))
        pushMartian({
          effect: "TRACTOR_BEAM",
          cells: [event.from],
          from: source.at,
          durationMs: 380,
        });
      if (isExplored(event.from) && isExplored(event.to))
        steps.push({
          kind: "MOVE",
          unitId: event.targetUnitId,
          path: [event.from, event.to],
          durationMs: 200,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
      origins.set(event.targetUnitId, event.to);
    } else if (event.kind === "UNIT_MIND_CONTROLLED") {
      // The Martian revision: a spiral over the victim, a ring round the
      // Brain; the Thrall appears in its place.
      const brain = before.units.find((unit) => unit.id === event.unitId);
      if (isExplored(event.at))
        pushMartian({
          effect: "MIND_CONTROL",
          cells: [event.at],
          ...(brain === undefined ? {} : { from: brain.at }),
          durationMs: 520,
        });
    } else if (event.kind === "UNITS_CHILLED") {
      // The Ice Folk revision: a Bolas flies from the Sled, a Cold Snap
      // rings out from the Witch, a Cold Aura pulses round the Giant; frost
      // forms on each chilled unit.
      const cells = event.results.flatMap((result) => {
        const unit = unitAnywhere(result.unitId);
        return unit === undefined || !isExplored(unit.at) ? [] : [unit.at];
      });
      const source =
        event.sourceUnitId === null
          ? undefined
          : unitAnywhere(event.sourceUnitId);
      if (cells.length > 0)
        pushIceFolk({
          effect:
            event.source === "BOLAS"
              ? "BOLAS"
              : event.source === "COLD_SNAP"
                ? "COLD_SNAP"
                : "COLD_AURA",
          cells,
          ...(source === undefined || !isExplored(source.at)
            ? {}
            : { from: source.at }),
        });
    } else if (event.kind === "UNIT_TUNNELLED") {
      // The Dwarf revision: the Mole (and its rider) dive in and a dirt
      // trail runs to the mound. A projection hides the tiles a viewer has
      // not explored (null); a pair with one hidden end shows only the
      // known one.
      const known = (at: CoordV7 | null): CoordV7 | null =>
        at !== null && isExplored(at) ? at : null;
      const cells: CoordV7[] = [];
      for (const [start, end] of [
        [known(event.from), known(event.to)],
        [known(event.riderFrom), known(event.riderTo)],
      ] as const) {
        const a = start ?? end;
        const b = end ?? start;
        if (a !== null && b !== null) cells.push(a, b);
      }
      if (cells.length > 0) pushDwarf({ effect: "TUNNEL", cells });
    } else if (event.kind === "UNIT_SURFACED") {
      // The Dwarf revision: the faction's "wow" moment. The ground bursts
      // at the mound, smaller bursts ring its eight tiles, the victims show
      // their damage.
      if (event.at !== null && isExplored(event.at))
        pushDwarf({
          effect: "ERUPTION",
          cells: [event.at],
          ...(event.unitId === null ? {} : { unitId: event.unitId }),
        });
      for (const result of event.results)
        if (isExplored(result.at))
          steps.push({
            kind: "DAMAGE",
            unitId: result.unitId,
            at: result.at,
            damage: result.damage + result.shieldDamage,
            lethal: result.dies,
            durationMs: 100,
          });
    } else if (event.kind === "UNIT_BOMBED") {
      // The Dwarf revision: the Gyrocopter flies over its target and lands
      // beyond it, then the bomb falls and blasts; the target shows its
      // damage.
      if (isExplored(event.from) && isExplored(event.to))
        steps.push({
          kind: "MOVE",
          unitId: event.unitId,
          path: [event.from, event.to],
          durationMs: 360,
          ...(enemyTurn ? { followCamera: true as const } : {}),
        });
      origins.set(event.unitId, event.to);
      if (isExplored(event.at)) {
        pushDwarf({ effect: "BOMB", cells: [event.at], from: event.to });
        steps.push({
          kind: "DAMAGE",
          unitId: event.targetUnitId,
          at: event.at,
          damage: event.damage + event.shieldDamage,
          lethal: event.killed,
          durationMs: 100,
        });
      }
    } else if (event.kind === "UNIT_ASSEMBLED") {
      // The Dwarf revision: a key turns and steam puffs as the Gunner is
      // wound up next to its Engineer.
      const engineer = unitAnywhere(event.unitId);
      if (isExplored(event.at))
        pushDwarf({
          effect: "ASSEMBLE",
          cells: [event.at],
          ...(engineer === undefined ? {} : { from: engineer.at }),
        });
    } else if (event.kind === "UNIT_DIED") {
      // Revision 19: a destroyed Egg scatters its shell.
      const egg = before.units.find((unit) => unit.id === event.unitId);
      if (egg !== undefined && egg.form === "EGG" && isExplored(egg.at))
        pushDinosaur("EGG_DESTROYED", egg.at, egg.id, 300);
    } else if (event.kind === "UNIT_GREW") {
      const unit = after.units.find(
        (candidate) => candidate.id === event.unitId,
      );
      if (unit !== undefined && isExplored(unit.at))
        pushDinosaur("GROW", unit.at, unit.id, 300);
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
      // The Mind Control revision: an attack looks like its kind's.
      const attackerFaction = kindOf(before, attacker);
      // Revision 19: the Triceratops (a Dinosaur CATAPULT role) is a melee
      // unit; it charges instead of throwing a rock.
      const triceratops =
        attacker.role === "CATAPULT" && attackerFaction === "DINOSAUR";
      const ranged =
        !triceratops &&
        (attacker.role === "MARKSMAN" ||
          attacker.role === "CATAPULT" ||
          attacker.role === "BATTLESHIP");
      // Revision 17: a Goblin Bomb Chucker's bomb arcs like a Catapult shot.
      const bomb = attacker.role === "MARKSMAN" && attackerFaction === "GOBLIN";
      // Revision 19: a Spitter's acid blob arcs the same way.
      const acid =
        attacker.role === "MARKSMAN" && attackerFaction === "DINOSAUR";
      // Revision 20: a Charge! after a run-up lands with a star flash.
      const chargeHit = event.preview.runUp > 0;
      // The Ice Folk revision: a Yeti's Rockfall lobs a rock from its peak;
      // a shattered defender stays on the board until it bursts.
      const rockfall = event.preview.rockfallApplied;
      const shatters = event.preview.shatters && isExplored(defender.at);
      // Bead pulp_wars-b5f.5: a few shots have a cue of their own.
      const attackEffect = attackEffectForV7(attackerFaction, attacker.role, {
        rockfall,
      });
      // The Martian revision: a heat ray is a beam from the shooter (with a
      // thinner beam on to a Pierce victim), not a projectile or a lunge.
      const ray = event.preview.rayPower !== "NONE";
      // `pulp_wars-b5f.2`: a Grunt's (or Thrall's) ray pistol is a plain
      // shot shown as the thin beam, at range 1 or 2.
      const pistol =
        !ray &&
        attackerFaction === "MARTIAN" &&
        attacker.role === "FIGHTER" &&
        attacker.form === "LAND";
      const pierced =
        ray && attackerFaction === "MARTIAN"
          ? event.preview.splash[0]
          : undefined;
      if (ray || pistol)
        pushMartian({
          effect: "HEAT_RAY",
          cells: [defender.at],
          from: attacker.at,
          unitId: attacker.id,
          ...(pierced === undefined ? {} : { pierce: pierced.at }),
          ...(event.preview.rayPower === "FULL" ? { fullPower: true } : {}),
          durationMs: 360,
        });
      else
        steps.push({
          kind:
            (attacker.role === "CATAPULT" && !triceratops) ||
            bomb ||
            acid ||
            rockfall
              ? "CATAPULT"
              : ranged
                ? "RANGED"
                : "MELEE",
          unitId: attacker.id,
          from: attacker.at,
          to: defender.at,
          durationMs: ranged || rockfall ? 280 : 230,
          ...(bomb
            ? { projectile: "BOMB" as const }
            : acid
              ? { projectile: "ACID" as const }
              : {}),
          ...(shatters ? { holdTarget: true as const } : {}),
          ...(attackEffect === null ? {} : { attackEffect }),
        });
      // The Ice Folk revision: a Mammoth's Sweep arcs over its three tiles
      // (the flank hits follow as damage cues); a Shatter freezes, cracks and
      // bursts the defender: the faction's "wow" moment.
      if (event.preview.sweep && isExplored(defender.at))
        pushIceFolk({
          effect: "SWEEP",
          cells: [
            defender.at,
            ...event.preview.splash.map((splash) => splash.at),
          ],
          from: attacker.at,
        });
      if (shatters)
        pushIceFolk({
          effect: "SHATTER",
          cells: [defender.at],
          unitId: defender.id,
        });
      // The Martian revision: a Shield that absorbed part of a hit flares,
      // turned toward the blow.
      if (event.preview.defenderShieldDamage > 0 && isExplored(defender.at))
        pushMartian({
          effect: "SHIELD_FLARE",
          cells: [defender.at],
          from: attacker.at,
          durationMs: 240,
        });
      if (event.preview.attackerShieldDamage > 0 && isExplored(attacker.at))
        pushMartian({
          effect: "SHIELD_FLARE",
          cells: [attacker.at],
          from: defender.at,
          durationMs: 240,
        });
      if (chargeHit && isExplored(defender.at))
        pushDinosaur("CHARGE_HIT", defender.at, null, 250);
      if (acid && isExplored(defender.at))
        pushDinosaur("ACID_HIT", defender.at, null, 200);
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
      if (attacker.role === "CATAPULT" && kindOf(before, attacker) === "UNDEAD")
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
      // The Dwarf revision: an Engineer's Repair throws wrench sparks.
      if (
        event.kind === "WOUNDED_TENDED" &&
        recipients.length > 0 &&
        kindOf(before, actor) === "DWARF"
      )
        pushDwarf({
          effect: "REPAIR",
          cells: recipients.map((recipient) => recipient.at),
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

/** A visible unit's kind (`unitFactionV7`), or undefined for no owner. */
function kindOf(
  view: PlayerViewV7,
  unit: Pick<PlayerViewV7["units"][number], "id" | "ownerId">,
): PlayerViewV7["players"][number]["faction"] | undefined {
  return view.players.some((player) => player.id === unit.ownerId)
    ? unitFactionV7(view, unit)
    : undefined;
}

/** The Dwarf revision: an attacker whose role knocks back (Steam Cannon). */
function knocksBack(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): boolean {
  return (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
    "KNOCKBACK",
  );
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
