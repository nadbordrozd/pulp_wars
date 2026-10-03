import {
  BOMB_RANGE_V7,
  previewAssembleV7,
  previewBombRunV7,
  previewTunnelV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  ASSEMBLE_PICK_V7,
  BOMBED_MARK_V7,
  BOMB_RUN_PICK_LANDING_V7,
  BOMB_RUN_PICK_TARGET_V7,
  RIDE_BADGE_V7,
  RIDING_BADGE_V7,
  STAYS_BEHIND_V7,
  TUNNEL_CONFIRM_HINT_V7,
  TUNNEL_FORECAST_V7,
  TUNNEL_PICK_V7,
  passengerAccessibleNameV7,
  riderLandingTextV7,
  assembleSummaryV7,
  bombPreviewLinesV7,
  bombTargetLabelV7,
  dwarfCityNameV7,
  dwarfCombatLinesV7,
  dwarfStatsV7,
  eruptionDamageOfV7,
  eruptionRingTextV7,
  landingHintV7,
  landingLabelV7,
  matchHasDwarfSeatV7,
  tunnelPreviewLinesV7,
  tunnelTargetLabelV7,
} from "../dwarf-presentation-v7";
import {
  tunnelCommandsV7,
  tunnelDestinationsV7,
  tunnelOutcomeV7,
  tunnelRidersV7,
  type TunnelChoiceStateV7,
} from "../dwarf-tunnel-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The Dwarf part of the board plan (bead pulp_wars-78i.6): the mounds of
 * `view.burrowed` (drawn where the unit would stand, with its HP bar), the
 * Dig In, clockwork and flyer markers of each Dwarf unit, the Tunnel, Bomb
 * Run and Assemble picking modes, the eruption forecast of a Tunnel
 * destination and of a selected or hovered mound, and the Dwarf lines of an
 * attack preview (Dug in, Clockwork, Plated, Blasting Charges, the Gunner's
 * shots, Knockback). Everything is read from the public view, the offered
 * commands and the public previews; nothing is recomputed.
 */

/** The LINK label of the rope from a seated passenger to its Mole. */
export const TUNNEL_TETHER_LINK_V7 = "TUNNEL_TETHER";

/**
 * A Dwarf ability being aimed on the board. While one is active its
 * targets are the only map targets of the selected unit.
 * TUNNEL (passenger first, bead pulp_wars-78i.9): `riderUnitId` is the
 * seated Hammerer (the best one is seated when the Tunnel is aimed; null:
 * the Mole tunnels alone). Choosing a destination (`to`) shows the whole
 * tunnel, the Hammerer's ghost on its default landing or on `riderTo`
 * when the player moved it; choosing `to` again digs it.
 * BOMB_RUN: first the target (`targetUnitId` null), then the landing.
 */
export type DwarfPickV7 =
  | ({ readonly kind: "TUNNEL" } & TunnelChoiceStateV7)
  | {
      readonly kind: "BOMB_RUN";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId | null;
    }
  | { readonly kind: "ASSEMBLE"; readonly unitId: UnitId };

/** UNIT only: the Dwarf markers of a visible Dwarf unit. */
export interface DwarfUnitMarkersV7 {
  /** Dug in: the code-drawn earthwork at its base. */
  readonly dugIn: boolean;
  /** A construct: the clockwork gear at the HP bar's end. */
  readonly clockwork: boolean;
  /** The Gyrocopter in land form: the ground shadow and the lift. */
  readonly flyer: boolean;
}

/** UNIT only: a mound (a burrowed Mole or its rider). */
export interface DwarfMoundMarkerV7 {
  /** The rider's mound (a hammer head beside the drill). */
  readonly rider: boolean;
  /** The burrowed unit's ID (the mound's entry key is `mound:<id>`). */
  readonly unitId: number;
  /** The Mole's eruption damage (0 for a rider, which never erupts). */
  readonly eruptionDamage: number;
  /** The mound is selected: its eruption ring is outlined. */
  readonly ring: boolean;
}

/** The legacy (code-drawn) asset ID of a mound: no legacy raster exists. */
export const MOUND_CODE_ART_ID_V7 = "unit-dwarf-mound-code";

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The board markers of a visible Dwarf unit, or undefined. */
export function dwarfUnitMarkersV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): DwarfUnitMarkersV7 | undefined {
  const mechanics = dwarfStatsV7(view, unit.id);
  if (mechanics === undefined || unit.form !== "LAND") return undefined;
  const flyer = (
    unitRoleRuleV7(view, unit).abilities as readonly string[]
  ).includes("FLY");
  if (!mechanics.dugIn && !mechanics.construct && !flyer) return undefined;
  return { dugIn: mechanics.dugIn, clockwork: mechanics.construct, flyer };
}

/**
 * The mound plan entries of every visible mound: a UNIT entry keyed
 * `mound:<id>` (so no unit lookup, selection jump or ready cue ever finds
 * it), drawn at the mound tile with the burrowed unit's HP and its owner's
 * look. `selectedAt` is the selected tile: a mound there shows its ring.
 */
export function dwarfMoundEntriesV7(
  view: PlayerViewV7,
  presentation: (ownerId: number) => Partial<BoardRenderPlanEntryV7>,
  selectedAt: CoordV7 | null,
): BoardRenderPlanEntryV7[] {
  return view.burrowed.map((entry) => {
    const rider = entry.moleUnitId !== null;
    const name = unitRoleRuleV7(view, entry.unit).label;
    return {
      key: `mound:${entry.unit.id}`,
      kind: "UNIT" as const,
      layer: 5,
      at: entry.unit.at,
      ownerId: entry.unit.ownerId,
      ...presentation(entry.unit.ownerId),
      hp: entry.unit.hp,
      maxHp: entry.unit.maxHp,
      assetId: MOUND_CODE_ART_ID_V7,
      artSubject: rider
        ? ("UNIT:DWARF:MOUND_RIDER" as const)
        : ("UNIT:DWARF:MOUND" as const),
      label: `${name} mound`,
      ready: false,
      dwarfMound: {
        rider,
        unitId: entry.unit.id,
        eruptionDamage: rider ? 0 : eruptionDamageOfV7(view, entry),
        ring: !rider && selectedAt !== null && same(selectedAt, entry.unit.at),
      },
    };
  });
}

/** The explored cells of a Mole's eight-tile ring around `at`. */
export function eruptionRingCellsV7(
  view: PlayerViewV7,
  at: CoordV7,
): readonly CoordV7[] {
  const cells: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const cell = { x: at.x + dx, y: at.y + dy };
      if (
        cell.x < 0 ||
        cell.y < 0 ||
        cell.x >= view.board.width ||
        cell.y >= view.board.height
      )
        continue;
      cells.push(cell);
    }
  return cells;
}

/** The map targets of an active Dwarf pick. */
export function dwarfPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: DwarfPickV7,
): MapCommandTargetV7[] {
  const unitById = (id: number) => view.units.find((unit) => unit.id === id);
  if (pick.kind === "TUNNEL") {
    const riders = tunnelRidersV7(view, commands, pick.unitId);
    const seated =
      riders.find((rider) => rider.unitId === pick.riderUnitId) ?? null;
    const targets: MapCommandTargetV7[] = [];
    // The chosen destination's landing and the other legal landings of the
    // seated Hammerer: the landing is the Hammerer's ghost, the others
    // small dots that move it (bead pulp_wars-78i.9).
    const chosen =
      pick.to === null ? null : tunnelOutcomeV7(view, commands, pick, pick.to);
    const landingCells = new Set(
      chosen === null || chosen.landing === null
        ? []
        : [chosen.landing, ...chosen.otherLandings].map(key),
    );
    if (chosen !== null && seated !== null)
      for (const at of chosen.otherLandings) {
        const command = tunnelCommandsV7(commands, pick.unitId).find(
          (candidate) =>
            candidate.rider !== null &&
            candidate.rider.unitId === seated.unitId &&
            pick.to !== null &&
            same(candidate.to, pick.to) &&
            same(candidate.rider.to, at),
        );
        if (command !== undefined)
          targets.push({
            at,
            command,
            family: "TUNNEL_RIDER",
            semanticLabel: `Move the ${seated.label}'s landing here, next to the Mole. ${TUNNEL_CONFIRM_HINT_V7}.`,
          });
      }
    // The Hammerers that can ride: a badge each; choosing one seats it,
    // choosing the seated one leaves the Mole to tunnel alone.
    for (const rider of riders) {
      const command = tunnelCommandsV7(commands, pick.unitId).find(
        (candidate) => candidate.rider?.unitId === rider.unitId,
      );
      if (command === undefined) continue;
      const isSeated = rider.unitId === seated?.unitId;
      targets.push({
        at: rider.at,
        command,
        family: "TUNNEL_PASSENGER",
        previewLabel: isSeated ? RIDING_BADGE_V7 : RIDE_BADGE_V7,
        semanticLabel: isSeated
          ? `${passengerAccessibleNameV7(rider.label, rider.hp, rider.maxHp, true)}. Choose it again to tunnel alone.`
          : `Seat this ${rider.label} as the passenger (${rider.hp} of ${rider.maxHp} HP).`,
      });
    }
    for (const to of tunnelDestinationsV7(commands, pick.unitId)) {
      // A landing tile of the chosen destination is the Hammerer's, not
      // another destination.
      if (landingCells.has(key(to))) continue;
      const outcome = tunnelOutcomeV7(view, commands, pick, to);
      const alone = tunnelCommandsV7(commands, pick.unitId).find(
        (command) => command.rider === null && same(command.to, to),
      );
      const preview = alone === undefined ? null : previewTunnelV7(view, alone);
      if (outcome === null || preview === null) continue;
      const lines = tunnelPreviewLinesV7(view, preview);
      const isChosen = pick.to !== null && same(pick.to, to);
      const passenger =
        seated === null
          ? []
          : [
              outcome.landing === null
                ? STAYS_BEHIND_V7
                : riderLandingTextV7(seated.label, outcome.landing),
            ];
      targets.push({
        at: to,
        command: outcome.command,
        // With a Hammerer that could ride, choosing a destination shows the
        // whole tunnel and a second choice digs it; without one the first
        // choice digs at once.
        family: riders.length === 0 ? "TUNNEL" : "TUNNEL_DESTINATION",
        // Calm: only a destination that would erupt on someone has a
        // label; the others are the plain dashed outline.
        ...(preview.eruptionTargets.length === 0
          ? {}
          : { previewLabel: tunnelTargetLabelV7(preview) }),
        eruption: {
          at: to,
          targets: preview.eruptionTargets.map((target) => ({
            at: target.at,
            label: `−${target.damage + target.shieldDamage}`,
            lethal: target.dies,
          })),
          undermines: preview.undermines,
        },
        tunnel: {
          moleUnitId: pick.unitId,
          riderUnitId:
            outcome.landing === null ? null : (seated?.unitId ?? null),
          landing: outcome.landing,
          staysBehind: outcome.staysBehind,
          chosen: isChosen,
        },
        semanticLabel: `Tunnel: the Mole surfaces here at the start of your next turn. ${[...lines, ...passenger].join(". ")}. ${TUNNEL_FORECAST_V7}. ${isChosen ? `${TUNNEL_CONFIRM_HINT_V7}.` : riders.length === 0 ? `${TUNNEL_PICK_V7}.` : `${TUNNEL_PICK_V7}, then confirm.`}`,
      });
    }
    return targets;
  }
  if (pick.kind === "BOMB_RUN") {
    const runs = commands.filter(
      (command): command is Extract<CommandV7, { kind: "BOMB_RUN" }> =>
        command.kind === "BOMB_RUN" && command.unitId === pick.unitId,
    );
    if (pick.targetUnitId === null) {
      const seen = new Set<number>();
      return runs.flatMap((command): MapCommandTargetV7[] => {
        if (seen.has(command.targetUnitId)) return [];
        seen.add(command.targetUnitId);
        const target = unitById(command.targetUnitId);
        const preview = previewBombRunV7(view, command);
        if (target === undefined || preview === null) return [];
        const name = unitRoleRuleV7(view, target).label;
        return [
          {
            at: target.at,
            command,
            family: "BOMB_TARGET",
            previewLabel: bombTargetLabelV7(preview),
            semanticLabel: `Bomb Run: bomb this ${name}. ${bombPreviewLinesV7(preview).join(". ")}. ${BOMB_RUN_PICK_TARGET_V7}.`,
          },
        ];
      });
    }
    return runs.flatMap((command): MapCommandTargetV7[] => {
      if (command.targetUnitId !== pick.targetUnitId) return [];
      const preview = previewBombRunV7(view, command);
      if (preview === null) return [];
      return [
        {
          at: command.to,
          command,
          family: "BOMB_RUN",
          previewLabel: landingLabelV7(preview),
          semanticLabel: `Bomb Run: land here after the bomb. ${bombPreviewLinesV7(preview).join(". ")}. ${landingHintV7(preview)}. ${BOMB_RUN_PICK_LANDING_V7}.`,
        },
      ];
    });
  }
  const assemble = commands.filter(
    (command): command is Extract<CommandV7, { kind: "ASSEMBLE" }> =>
      command.kind === "ASSEMBLE" && command.unitId === pick.unitId,
  );
  const preview = previewAssembleV7(view, pick.unitId);
  if (preview === null) return [];
  const city = dwarfCityNameV7(view, preview.cityId);
  return assemble.map((command) => ({
    at: command.to,
    command,
    family: "ASSEMBLE" as const,
    // No label per tile: the dock's prompt names the cost and the slot.
    semanticLabel: `Assemble: ${assembleSummaryV7(preview, city)}. It arrives exhausted. ${ASSEMBLE_PICK_V7}.`,
  }));
}

/**
 * Preview entries of an active pick that are not targets: the rope from a
 * seated Tunnel passenger to its Mole, the chosen bomb target with its damage (the landing step), the blast of an
 * exploding target, and the hostile units in range that were bombed this
 * turn ("Bombed this turn").
 */
export function addDwarfPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: DwarfPickV7,
): void {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return;
  // The seated passenger is tied to the Mole by a short rope, with a
  // hammer-head pip on the Mole (bead pulp_wars-78i.9).
  if (pick.kind === "TUNNEL" && pick.riderUnitId !== null) {
    const rider = view.units.find((unit) => unit.id === pick.riderUnitId);
    if (rider !== undefined)
      entries.push({
        key: `tunnel-tether:${rider.id}:${actor.id}`,
        kind: "LINK",
        layer: 6,
        at: rider.at,
        linkTo: actor.at,
        label: TUNNEL_TETHER_LINK_V7,
      });
  }
  // A chosen destination is still a target: its forecast and ghosts are
  // drawn from it while nothing else is focused.
  if (pick.kind === "BOMB_RUN") {
    if (pick.targetUnitId !== null) {
      const command = commands.find(
        (candidate): candidate is Extract<CommandV7, { kind: "BOMB_RUN" }> =>
          candidate.kind === "BOMB_RUN" &&
          candidate.unitId === pick.unitId &&
          candidate.targetUnitId === pick.targetUnitId,
      );
      const preview =
        command === undefined ? null : previewBombRunV7(view, command);
      const target = view.units.find((unit) => unit.id === pick.targetUnitId);
      if (preview !== null && target !== undefined) {
        entries.push({
          key: `ability-target:BOMB:${target.id}`,
          kind: "ABILITY_TARGET",
          layer: 7.5,
          at: target.at,
          abilityStyle: "BOMB",
          label: bombTargetLabelV7(preview),
          lethal: preview.kills,
        });
        for (const blast of preview.blast)
          for (const result of blast.results)
            entries.push({
              key: `ability-target:BOMB_BLAST:${blast.unitId}:${key(result.at)}`,
              kind: "ABILITY_TARGET",
              layer: 7.5,
              at: result.at,
              abilityStyle: "BLAST",
              label: `−${result.damage}`,
              lethal: result.dies,
            });
      }
    } else
      for (const unit of view.units) {
        if (
          !view.bombedThisTurn.includes(unit.id) ||
          unit.ownerId === actor.ownerId ||
          Math.max(
            Math.abs(unit.at.x - actor.at.x),
            Math.abs(unit.at.y - actor.at.y),
          ) > BOMB_RANGE_V7
        )
          continue;
        entries.push({
          key: `ability-target:BOMBED:${unit.id}`,
          kind: "ABILITY_TARGET",
          layer: 7.5,
          at: unit.at,
          abilityStyle: "BOMBED",
          label: BOMBED_MARK_V7,
        });
      }
  }
}

/**
 * The Repair targets of a selected own Engineer, from the exact Tend
 * Wounded preview (section 16.1: the targets highlighted with "+4" or "+2").
 */
export function dwarfEngineerSelectedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  return (
    unit !== undefined &&
    unit.form === "LAND" &&
    dwarfStatsV7(view, unit.id) !== undefined &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "ASSEMBLE",
    )
  );
}

/** The Dwarf additions to an ATTACK target (section 16.1). */
export interface DwarfAttackTargetExtrasV7 {
  readonly notes: readonly string[];
  /** The shooter's lines, drawn on the focused target only. */
  readonly shooter: readonly string[];
  /** The Knockback destination, drawn while the target is focused. */
  readonly knockback: MapCommandTargetV7["knockback"];
  /** The sentence the cursor description adds. */
  readonly semantic: string | null;
}

/**
 * The Dwarf lines of an attack preview: "Dug in", "Clockwork: full
 * strength", "Plated: at most 4", "Ignores fortification", the Gunner's
 * shots, and Knockback. Null in a match without a Dwarf seat, so its
 * attack previews are unchanged.
 */
export function dwarfAttackTargetExtrasV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7 | null,
): DwarfAttackTargetExtrasV7 | null {
  if (preview === null || !matchHasDwarfSeatV7(view)) return null;
  const lines = dwarfCombatLinesV7(view, preview);
  return {
    notes: lines.notes,
    shooter: lines.shooter,
    knockback:
      lines.knockback === null
        ? undefined
        : { to: lines.knockback.to, blocked: lines.knockback.blocked },
    semantic:
      lines.notes.length + lines.shooter.length === 0
        ? null
        : `${[...lines.notes, ...lines.shooter].join(". ")}.`,
  };
}

/** Whether `kind` is one of the three aimed Dwarf commands. */
export function isDwarfPickCommandV7(kind: CommandV7["kind"]): boolean {
  return kind === "TUNNEL" || kind === "BOMB_RUN" || kind === "ASSEMBLE";
}

/** The eruption ring's label for a hovered or selected Mole mound. */
export function moundRingLabelV7(damage: number): string {
  return eruptionRingTextV7(damage);
}
