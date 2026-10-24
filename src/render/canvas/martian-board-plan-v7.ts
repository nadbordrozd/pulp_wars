import {
  cooperativeAlliesV7,
  BEAM_DOWN_PICKUP_RANGE_V7,
  MIND_CONTROL_RANGE_V7,
  isIceAtV7,
  isMindControlledV7,
  previewBeamDownV7,
  previewMassBeamDownV7,
  previewMindControlV7,
  previewTractorBeamV7,
  roleMechanicsV7,
  unitFactionV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  BEAMED_HINT_V7,
  BEAMING_BADGE_V7,
  BEAM_BADGE_V7,
  HOVER_LAUNCH_LABEL_V7,
  LAUNCH_LABEL_V7,
  MASS_BEAM_DOWN_CONFIRM_V7,
  MASS_BEAM_DOWN_PICK_V7,
  beamDownPickupTilesV7,
  beamDownTileLabelV7,
  martianCombatLinesV7,
  martianStatsV7,
  martianUnitNameV7,
  matchHasMartianV7,
  mindControlPreviewLinesV7,
  mindControlTargetLabelV7,
  mindControlTargetReasonV7,
  shieldBarMaximumV7,
  tractorBeamPreviewLinesV7,
  tractorBeamTargetLabelV7,
} from "../martian-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";
import type { MartianUnitMarkersV7 } from "./martian-canvas-v7";

/**
 * The Martian part of the board plan (bead pulp_wars-t6s.4): unit markers,
 * the three picking modes (Beam Down, Mind Control, Tractor Beam), the
 * Force Field and control-link previews of a selection, and the Martian lines
 * of an attack preview. Everything is read from the public view, the
 * offered commands and the public previews; nothing is recomputed.
 */

/**
 * A Martian ability being aimed on the board. While one is active its
 * targets are the only map targets of the selected unit.
 * BEAM_DOWN: first the passenger (`passengerUnitId` null), then the tile.
 */
export type MartianPickV7 =
  | {
      readonly kind: "BEAM_DOWN";
      readonly unitId: UnitId;
      readonly passengerUnitId: UnitId | null;
    }
  | { readonly kind: "MIND_CONTROL"; readonly unitId: UnitId }
  | { readonly kind: "TRACTOR_BEAM"; readonly unitId: UnitId }
  /**
   * The Mothership redesign (`pulp_wars-ewpj`): a Mass Beam Down. The tile
   * is chosen once (`chosen`: its landings stay drawn) and beamed when
   * chosen again, like a Stampede's end.
   */
  | {
      readonly kind: "MASS_BEAM_DOWN";
      readonly unitId: UnitId;
      readonly chosen: CoordV7 | null;
    };

/**
 * The board markers of a visible unit of the Martian kind, or of a
 * mind-controlled unit of any kind (the Mind Control revision: `controlled`
 * draws the control halo and the brain chip in the Martian faction colour),
 * or undefined.
 */
export function martianUnitMarkersV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): MartianUnitMarkersV7 | undefined {
  const mechanics = martianStatsV7(view, unit.id);
  const controlled = isMindControlledV7(view, unit.id);
  if (mechanics === undefined)
    return controlled
      ? {
          shield: 0,
          shieldSegments: 0,
          shieldMaximum: 0,
          cooling: false,
          controlled,
          flyer: false,
          afloat: false,
        }
      : undefined;
  const machine = mechanics.movementMode !== "GROUND";
  return {
    shield: mechanics.shield,
    shieldSegments: shieldBarMaximumV7(mechanics),
    shieldMaximum: mechanics.shieldMaximum,
    cooling: mechanics.cooling,
    controlled,
    flyer: mechanics.movementMode === "FLY" && unit.form !== "NAVAL",
    afloat: machine && unit.form === "EMBARKED",
  };
}

/** Whether a unit of the Martian kind is a machine (it walks or flies). */
export function martianMachineV7(
  view: PlayerViewV7,
  unit: Pick<PlayerViewV7["units"][number], "id" | "ownerId" | "role">,
): boolean {
  const faction = unitFactionV7(view, unit);
  return (
    faction === "MARTIAN" &&
    roleMechanicsV7(unit.role, faction).movementMode !== "GROUND"
  );
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The map targets of an active Martian pick. */
export function martianPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: MartianPickV7,
): MapCommandTargetV7[] {
  const unitAt = (id: number) => view.units.find((unit) => unit.id === id);
  if (pick.kind === "BEAM_DOWN") {
    const beams = commands.filter(
      (command): command is Extract<CommandV7, { kind: "BEAM_DOWN" }> =>
        command.kind === "BEAM_DOWN" && command.unitId === pick.unitId,
    );
    if (pick.passengerUnitId === null) {
      const seen = new Set<number>();
      return beams.flatMap((command): MapCommandTargetV7[] => {
        if (seen.has(command.passengerUnitId)) return [];
        seen.add(command.passengerUnitId);
        const passenger = unitAt(command.passengerUnitId);
        if (passenger === undefined) return [];
        const name = martianUnitNameV7(view, passenger);
        // `pulp_wars-1wy.5`: every unit the carrier may beam wears the
        // "Beam" badge (the passenger is chosen first, like a Tunnel's
        // rider); its description tells a pick-up from a city passenger.
        const carrier = unitAt(pick.unitId);
        const pickUp =
          carrier !== undefined &&
          Math.max(
            Math.abs(carrier.at.x - passenger.at.x),
            Math.abs(carrier.at.y - passenger.at.y),
          ) <= BEAM_DOWN_PICKUP_RANGE_V7;
        return [
          {
            at: passenger.at,
            command,
            family: "BEAM_DOWN_PASSENGER",
            previewLabel: BEAM_BADGE_V7,
            semanticLabel: `Beam the ${name} down, ${passenger.hp} of ${passenger.maxHp} HP, ${pickUp ? "picked up nearby" : "from your city"}. ${BEAMED_HINT_V7}`,
          },
        ];
      });
    }
    const preview = previewBeamDownV7(view, pick.unitId, pick.passengerUnitId);
    if (preview === null) return [];
    const passenger = unitAt(pick.passengerUnitId);
    const name =
      passenger === undefined ? "unit" : martianUnitNameV7(view, passenger);
    return beams.flatMap((command): MapCommandTargetV7[] => {
      if (command.passengerUnitId !== pick.passengerUnitId) return [];
      // `pulp_wars-1wy.5`: a plain tile is its outline alone; the cursor
      // description still names every tile's outcome.
      const warning = beamDownTileLabelV7(preview, command.to);
      return [
        {
          at: command.to,
          command,
          family: "BEAM_DOWN",
          ...(warning === null ? {} : { previewLabel: warning }),
          semanticLabel: `Beam the ${name} here${warning === null ? "" : ", destroys Field Defense"}. ${BEAMED_HINT_V7}`,
        },
      ];
    });
  }
  if (pick.kind === "MASS_BEAM_DOWN")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "MASS_BEAM_DOWN" || command.unitId !== pick.unitId)
        return [];
      const preview = previewMassBeamDownV7(view, command);
      if (preview === null) return [];
      const chosen = pick.chosen !== null && same(pick.chosen, command.to);
      const names = preview.placements.map((placement) => {
        const passenger = unitAt(placement.unitId);
        return passenger === undefined
          ? "unit"
          : martianUnitNameV7(view, passenger);
      });
      const count = names.length;
      return [
        {
          at: command.to,
          command,
          family: "MASS_BEAM_DOWN",
          // Only the chosen tile carries a label; its landings are drawn
          // on their own tiles.
          ...(chosen
            ? {
                previewLabel: `Beam ${count} ${count === 1 ? "unit" : "units"}`,
              }
            : {}),
          semanticLabel: `Beam ${names.join(", ")} down around here${preview.fieldDefenseDestroyed.length > 0 ? ", destroys Field Defense" : ""}. ${BEAMED_HINT_V7}. ${chosen ? MASS_BEAM_DOWN_CONFIRM_V7 : MASS_BEAM_DOWN_PICK_V7}`,
        },
      ];
    });
  if (pick.kind === "MIND_CONTROL")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "MIND_CONTROL" || command.unitId !== pick.unitId)
        return [];
      const preview = previewMindControlV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      if (preview === null) return [];
      const lines = mindControlPreviewLinesV7(view, preview);
      const target = unitAt(command.targetUnitId);
      const name =
        target === undefined ? "unit" : martianUnitNameV7(view, target);
      return [
        {
          at: preview.at,
          command,
          family: "MIND_CONTROL",
          previewLabel: mindControlTargetLabelV7(preview),
          // Bolder abilities (`pulp_wars-w49.42`): every enemy beside the
          // Brain is a target, so the note every target shares (the
          // cooldown, the return) is no longer drawn on each of them (up to
          // eight); it stays in the spoken label and the tooltip.
          // Bead pulp_wars-b5f.8: the target is named, never placed.
          semanticLabel: `Take the ${name}, ${preview.hp} of ${preview.maxHp} HP. ${lines.slice(1).join(". ")}`,
        },
      ];
    });
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "TRACTOR_BEAM" || command.unitId !== pick.unitId)
      return [];
    const preview = previewTractorBeamV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null) return [];
    const lines = tractorBeamPreviewLinesV7(view, preview);
    const target = unitAt(command.targetUnitId);
    const name =
      target === undefined ? "unit" : martianUnitNameV7(view, target);
    return [
      {
        at: preview.from,
        command,
        family: "TRACTOR_BEAM",
        // Bead pulp_wars-9im: pulling an own unit is a Help, not an attack.
        ...(target?.ownerId === view.viewer.id
          ? { highlight: "SUPPORT" as const }
          : {}),
        previewLabel: tractorBeamTargetLabelV7(view, preview),
        ...(lines.length > 1
          ? { previewNote: lines.slice(1).join(" · ") }
          : {}),
        pullTo: preview.to,
        // `pulp_wars-1wy.5`: the tiles the target crosses (one, or two for
        // a Heavy Tractor Beam), drawn while the target is focused.
        pullPath: preview.path,
        // `pulp_wars-1wy.3`: a Heavy Tractor Beam pulls up to two tiles.
        semanticLabel: `Pull the ${name} ${preview.path.length === 1 ? "one tile" : "two tiles"} closer${lines.length === 0 ? "" : `. ${lines.join(". ")}`}`,
      },
    ];
  });
}

/**
 * Preview entries of an active pick that are not targets: a Mind Control's
 * hostile units in range that cannot be taken, with the reason (section
 * 13.1), and the Beam Down passenger's tile.
 */
export function addMartianPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  targets: readonly MapCommandTargetV7[],
  pick: MartianPickV7,
): void {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return;
  if (pick.kind === "MASS_BEAM_DOWN") {
    addMassBeamDownEntriesV7(entries, view, targets, pick, actor);
    return;
  }
  if (pick.kind === "MIND_CONTROL") {
    for (const unit of view.units) {
      if (
        unit.ownerId === actor.ownerId ||
        targets.some((target) => same(target.at, unit.at)) ||
        // Bolder abilities (7r99): the Brain reaches the eight tiles
        // around it.
        Math.max(
          Math.abs(unit.at.x - actor.at.x),
          Math.abs(unit.at.y - actor.at.y),
        ) > MIND_CONTROL_RANGE_V7
      )
        continue;
      if (
        cooperativeAlliesV7(
          view.setup,
          view.humanPlayerId,
          unit.ownerId,
          actor.ownerId,
        )
      )
        continue;
      const reason = mindControlTargetReasonV7(view, unit);
      if (reason === null) continue;
      entries.push({
        key: `ability-target:MIND_CONTROL_BLOCKED:${unit.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: unit.at,
        abilityStyle: "MARTIAN_BLOCKED",
        label: reason,
      });
    }
  }
  if (pick.kind === "BEAM_DOWN" && pick.passengerUnitId === null) {
    // `pulp_wars-1wy.5`: the carrier's pick-up range, tinted with a dashed
    // outer edge: a badged unit inside it is a pick-up, one outside it
    // stands at an own city.
    const range = beamDownPickupTilesV7(view, actor.at);
    const inRange = (at: CoordV7): boolean =>
      same(at, actor.at) || range.some((cell) => same(cell, at));
    for (const at of range)
      entries.push({
        key: `ability-area:BEAM_RANGE:${at.x},${at.y}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: "BEAM_RANGE",
        targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
          (edge) =>
            !inRange({
              x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
              y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
            }),
        ),
      });
  }
  if (pick.kind === "BEAM_DOWN" && pick.passengerUnitId !== null) {
    const passenger = view.units.find(
      (unit) => unit.id === pick.passengerUnitId,
    );
    if (passenger !== undefined)
      entries.push({
        key: `ability-target:BEAM_PASSENGER:${passenger.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: passenger.at,
        abilityStyle: "PULL",
        label: BEAMING_BADGE_V7,
      });
  }
}

/**
 * The Mothership redesign (`pulp_wars-ewpj`): the Mass Beam Down preview.
 * Before a tile is chosen: the pick-up range tint and a "Beam" badge on
 * every unit an offered tile takes. Once one is chosen: "Beaming" on its
 * passengers and, on each landing tile, the name of the unit that lands
 * there (the Tractor Beam's magenta), so where the units land is seen
 * before they are beamed.
 */
function addMassBeamDownEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  targets: readonly MapCommandTargetV7[],
  pick: Extract<MartianPickV7, { kind: "MASS_BEAM_DOWN" }>,
  actor: PlayerViewV7["units"][number],
): void {
  const chosen =
    pick.chosen === null
      ? undefined
      : targets.find(
          (target) =>
            target.command.kind === "MASS_BEAM_DOWN" &&
            pick.chosen !== null &&
            same(target.command.to, pick.chosen),
        );
  const preview =
    chosen === undefined || chosen.command.kind !== "MASS_BEAM_DOWN"
      ? null
      : previewMassBeamDownV7(view, chosen.command);
  if (preview === null) {
    const range = beamDownPickupTilesV7(view, actor.at);
    const inRange = (at: CoordV7): boolean =>
      same(at, actor.at) || range.some((cell) => same(cell, at));
    for (const at of range)
      entries.push({
        key: `ability-area:BEAM_RANGE:${at.x},${at.y}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: "BEAM_RANGE",
        targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
          (edge) =>
            !inRange({
              x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
              y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
            }),
        ),
      });
    const passengers = new Set<number>();
    for (const target of targets)
      if (target.command.kind === "MASS_BEAM_DOWN")
        for (const id of target.command.passengerUnitIds) passengers.add(id);
    for (const id of passengers) {
      const passenger = view.units.find((unit) => unit.id === id);
      if (passenger === undefined) continue;
      entries.push({
        key: `ability-target:BEAM_PASSENGER:${passenger.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: passenger.at,
        abilityStyle: "BEAM_RANGE",
        label: BEAM_BADGE_V7,
      });
    }
    return;
  }
  for (const placement of preview.placements) {
    const passenger = view.units.find((unit) => unit.id === placement.unitId);
    if (passenger === undefined) continue;
    entries.push({
      key: `ability-target:BEAM_PASSENGER:${passenger.id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: passenger.at,
      abilityStyle: "PULL",
      label: BEAMING_BADGE_V7,
    });
    entries.push({
      key: `ability-target:MASS_BEAM_LANDING:${placement.to.x},${placement.to.y}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: placement.to,
      abilityStyle: "PULL",
      // The unit's name alone: on a phone a longer badge overlaps the
      // next tile's.
      label: martianUnitNameV7(view, passenger),
    });
  }
}

/**
 * Selection previews (section 13.1): the Force Field tiles of a selected
 * land-form Shield Projector, and the link from a selected controlled unit
 * to its Brain or from a selected Brain to its controlled units.
 */
export function addMartianSelectionEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  selectedUnitId: number,
): void {
  const unit = view.units.find((candidate) => candidate.id === selectedUnitId);
  if (unit === undefined) return;
  const mechanics = martianStatsV7(view, unit.id);
  const control = view.mindControlled.find((entry) => entry.unitId === unit.id);
  if (mechanics === undefined && control === undefined) return;
  // The Mothership redesign (`pulp_wars-ewpj`): a Mothership's Shield
  // Canopy covers the same ring as a Force Field.
  if (
    (mechanics?.forceField === true || mechanics?.shieldCanopy === true) &&
    unit.form === "LAND"
  ) {
    const explored = new Set(
      view.board.tiles
        .filter((tile) => tile.explored)
        .map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    const ring: CoordV7[] = [];
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const at = { x: unit.at.x + dx, y: unit.at.y + dy };
        if (explored.has(`${at.x},${at.y}`)) ring.push(at);
      }
    const inArea = (at: CoordV7): boolean =>
      ring.some((cell) => same(cell, at)) || same(at, unit.at);
    for (const at of ring)
      entries.push({
        key: `ability-area:FORCE_FIELD:${at.x},${at.y}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: "FORCE_FIELD",
        targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
          (edge) =>
            !inArea({
              x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
              y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
            }),
        ),
      });
  }
  const links =
    control !== undefined
      ? control.brainUnitId === null
        ? []
        : [control.brainUnitId]
      : mechanics?.mindControl != null
        ? view.mindControlled
            .filter((entry) => entry.brainUnitId === unit.id)
            .map((entry) => entry.unitId)
        : [];
  for (const id of links) {
    const other = view.units.find((candidate) => candidate.id === id);
    if (other === undefined) continue;
    entries.push({
      key: `control-link:${unit.id}:${other.id}`,
      kind: "LINK",
      layer: 6,
      at: unit.at,
      linkTo: other.at,
      label: "CONTROL_LINK",
    });
  }
}

/** The Martian additions to an ATTACK target (section 13.1). */
export interface MartianAttackTargetExtrasV7 {
  readonly notes: readonly string[];
  /** The shooter's lines (ray power, Cooling), drawn on the focused target. */
  readonly shooter: readonly string[];
  readonly warnings: readonly string[];
  readonly pierce: MapCommandTargetV7["pierce"];
}

/**
 * The Martian lines of an attack preview: notes (Shield, ray power,
 * Cooling, Disintegrator), friendly-fire warnings, and the Pierce victim
 * drawn while the target is focused. Null in a match without a Martian
 * seat, so its attack previews are unchanged.
 */
export function martianAttackTargetExtrasV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7 | null,
): MartianAttackTargetExtrasV7 | null {
  if (preview === null || !matchHasMartianV7(view)) return null;
  const lines = martianCombatLinesV7(view, preview);
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  const pierces =
    attacker !== undefined &&
    preview.rayPower !== "NONE" &&
    (unitRoleRuleV7(view, attacker).abilities as readonly string[]).includes(
      "PIERCE",
    );
  const pierceEntry = pierces ? preview.splash[0] : undefined;
  const pierceLine = lines.pierce[0];
  return {
    notes: lines.notes,
    shooter: lines.shooter,
    warnings: lines.pierce
      .filter((line) => line.friendly)
      .map((line) => line.text),
    pierce:
      pierceEntry === undefined || pierceLine === undefined
        ? undefined
        : {
            at: pierceEntry.at,
            label: `${pierceLine.friendly ? "Yours " : ""}−${pierceEntry.damage}${pierceEntry.shieldDamage > 0 ? ` · Shield −${pierceEntry.shieldDamage}` : ""}`,
            friendly: pierceLine.friendly,
            lethal: pierceEntry.dies,
            note: pierceLine.text,
          },
  };
}

/** Whether `kind` is one of the three Martian ability commands. */
export function isMartianPickCommandV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "BEAM_DOWN" ||
    kind === "MASS_BEAM_DOWN" ||
    kind === "MIND_CONTROL" ||
    kind === "TRACTOR_BEAM"
  );
}

/**
 * The "Launch" label of a machine's Move onto water (section 13.2): the
 * move ends afloat, so the machine crosses water as a transport.
 */
export function martianMoveLabelV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): string | null {
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const at = command.path.at(-1);
  if (unit === undefined || at === undefined || unit.form !== "LAND")
    return null;
  const tile = view.board.tiles.find((candidate) => same(candidate.at, at));
  if (tile?.explored !== true || tile.biome !== null) return null;
  if (martianMachineV7(view, unit)) return LAUNCH_LABEL_V7;
  // Themed naval branches, Hover Pods (`pulp_wars-5ti.19`): an offered Move
  // of a foot unit onto water that is no dock is a hover launch (a Move to
  // an own dock embarks there as ever).
  return tile.improvement !== "PORT" &&
    tile.improvement !== "SHIPYARD" &&
    !isIceAtV7(view, at)
    ? HOVER_LAUNCH_LABEL_V7
    : null;
}
