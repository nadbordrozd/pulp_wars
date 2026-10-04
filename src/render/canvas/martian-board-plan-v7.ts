import {
  isMindControlledV7,
  previewBeamDownV7,
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
  LAUNCH_LABEL_V7,
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
  | { readonly kind: "TRACTOR_BEAM"; readonly unitId: UnitId };

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
        return [
          {
            at: passenger.at,
            command,
            family: "BEAM_DOWN_PASSENGER",
            previewLabel: `Beam ${name}`,
            semanticLabel: `Beam the ${name} down`,
          },
        ];
      });
    }
    const preview = previewBeamDownV7(view, pick.unitId, pick.passengerUnitId);
    if (preview === null) return [];
    const passenger = unitAt(pick.passengerUnitId);
    const name =
      passenger === undefined ? "unit" : martianUnitNameV7(view, passenger);
    return beams.flatMap((command): MapCommandTargetV7[] =>
      command.passengerUnitId === pick.passengerUnitId
        ? [
            {
              at: command.to,
              command,
              family: "BEAM_DOWN",
              previewLabel: beamDownTileLabelV7(preview, command.to),
              semanticLabel: `Beam the ${name} here${beamDownTileLabelV7(preview, command.to).includes("Field Defense") ? ", destroys Field Defense" : ""}`,
            },
          ]
        : [],
    );
  }
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
          previewNote: lines.slice(1).join(" · "),
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
        previewLabel: tractorBeamTargetLabelV7(view, preview),
        ...(lines.length > 1
          ? { previewNote: lines.slice(1).join(" · ") }
          : {}),
        pullTo: preview.to,
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
  if (pick.kind === "MIND_CONTROL") {
    for (const unit of view.units) {
      if (
        unit.ownerId === actor.ownerId ||
        targets.some((target) => same(target.at, unit.at)) ||
        Math.max(
          Math.abs(unit.at.x - actor.at.x),
          Math.abs(unit.at.y - actor.at.y),
        ) > 2
      )
        continue;
      if (
        view.setup.aiMode === "COOPERATIVE" &&
        unit.ownerId !== view.humanPlayerId &&
        actor.ownerId !== view.humanPlayerId
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
        label: "Beaming",
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
  if (mechanics?.forceField === true && unit.form === "LAND") {
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
    kind === "BEAM_DOWN" || kind === "MIND_CONTROL" || kind === "TRACTOR_BEAM"
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
  if (!martianMachineV7(view, unit)) return null;
  const tile = view.board.tiles.find((candidate) => same(candidate.at, at));
  return tile?.explored === true && tile.biome === null
    ? LAUNCH_LABEL_V7
    : null;
}
