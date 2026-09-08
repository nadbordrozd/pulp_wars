import {
  previewBlackoutV7,
  previewDefectionV7,
  queryPursuitPreviewV7,
  type BlackoutPreviewV7,
  type CommandV7,
  type CoordV7,
  type DefectionPreviewV7,
  type PlayerViewV7,
  type PublicBlackoutStatusV7,
  type PublicDefectionStatusV7,
  type UnitId,
} from "../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../assets/ruleset7-tactical-ui-symbols";

type AttackCommandV7 = {
  readonly kind: "ATTACK";
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
};
type PursueCommandV7 = {
  readonly kind: "PURSUE";
  readonly unitId: UnitId;
  readonly path: readonly CoordV7[];
};
type MoveCommandV7 = Omit<PursueCommandV7, "kind"> & {
  readonly kind: "MOVE";
};
type EndPursuitCommandV7 = {
  readonly kind: "END_PURSUIT";
  readonly unitId: UnitId;
};

export type TacticalTargetModeV7 =
  | { readonly kind: "DEFECTION"; readonly sourceUnitId: number }
  | { readonly kind: "BLACKOUT"; readonly sourceUnitId: number };

export interface PursuitPresentationV7 {
  readonly unitId: number;
  readonly phase: "PURSUIT_READY" | "PURSUIT_MOVED";
  readonly attacksUsed: 1 | 2;
  readonly attacksRemaining: 1 | 2;
  readonly directAttackCommands: readonly AttackCommandV7[];
  readonly pursueCommands: readonly PursueCommandV7[];
  readonly laterTargetUnitIds: readonly number[];
  readonly endCommand: EndPursuitCommandV7;
}

export interface DefectionTargetPresentationV7 {
  readonly targetUnitId: number;
  readonly at: CoordV7;
  readonly choices: readonly {
    readonly command: Extract<CommandV7, { kind: "OFFER_DEFECTION" }>;
    readonly preview: DefectionPreviewV7;
  }[];
}

export interface BlackoutTargetPresentationV7 {
  readonly cityId: number;
  readonly at: CoordV7;
  readonly command: Extract<CommandV7, { kind: "BLACKOUT_CITY" }>;
  readonly preview: BlackoutPreviewV7;
}

export interface TacticalAttachmentV7 {
  readonly key: string;
  readonly at: CoordV7;
  readonly symbolId: Ruleset7TacticalUiSymbolId;
  readonly label: string;
  readonly pulse: boolean;
}

export interface DefectionLinkV7 {
  readonly key: string;
  readonly from: CoordV7;
  readonly to: CoordV7;
  readonly phase: "WAITING_FOR_REPLY" | "ARMED";
}

/** The first public END_PURSUIT offering is the global lock and action truth. */
export function pursuitPresentationV7(
  view: PlayerViewV7,
  offeredCommands: readonly CommandV7[],
): PursuitPresentationV7 | null {
  const endCommand = offeredCommands.find(
    (command): command is EndPursuitCommandV7 => command.kind === "END_PURSUIT",
  );
  if (endCommand === undefined) return null;
  const preview = queryPursuitPreviewV7(view, endCommand.unitId);
  if (preview === null) return null;
  const directAttackCommands = offeredCommands.filter(
    (command): command is AttackCommandV7 =>
      command.kind === "ATTACK" && command.unitId === endCommand.unitId,
  );
  const pursueCommands = offeredCommands.filter(
    (command): command is PursueCommandV7 =>
      command.kind === "PURSUE" && command.unitId === endCommand.unitId,
  );
  return {
    unitId: endCommand.unitId,
    phase: preview.phase,
    attacksUsed: preview.attacksUsed,
    attacksRemaining: preview.attacksRemaining,
    directAttackCommands,
    pursueCommands,
    laterTargetUnitIds: [
      ...new Set(preview.pursuePaths.flatMap((path) => path.targetUnitIds)),
    ].sort((left, right) => left - right),
    endCommand,
  };
}

export function defectionTargetsV7(
  view: PlayerViewV7,
  offeredCommands: readonly CommandV7[],
  sourceUnitId: number,
): readonly DefectionTargetPresentationV7[] {
  const grouped = new Map<number, DefectionTargetPresentationV7["choices"]>();
  for (const command of offeredCommands) {
    if (command.kind !== "OFFER_DEFECTION" || command.unitId !== sourceUnitId)
      continue;
    const result = previewDefectionV7(view, command);
    if (!result.ok) continue;
    const prior = grouped.get(command.targetUnitId) ?? [];
    grouped.set(command.targetUnitId, [
      ...prior,
      { command, preview: result.preview },
    ]);
  }
  const targets: DefectionTargetPresentationV7[] = [];
  for (const [targetUnitId, choices] of grouped) {
    const target = view.units.find((unit) => unit.id === targetUnitId);
    if (target !== undefined)
      targets.push({
        targetUnitId,
        at: target.at,
        choices: [...choices].sort(
          (left, right) =>
            left.preview.reservedCity.cityId -
            right.preview.reservedCity.cityId,
        ),
      });
  }
  return targets.sort((left, right) => left.targetUnitId - right.targetUnitId);
}

export function blackoutTargetsV7(
  view: PlayerViewV7,
  offeredCommands: readonly CommandV7[],
  sourceUnitId: number,
): readonly BlackoutTargetPresentationV7[] {
  return offeredCommands
    .flatMap((command): readonly BlackoutTargetPresentationV7[] => {
      if (command.kind !== "BLACKOUT_CITY" || command.unitId !== sourceUnitId)
        return [];
      const result = previewBlackoutV7(view, command);
      return result.ok
        ? [
            {
              cityId: command.cityId,
              at: result.preview.target.at,
              command,
              preview: result.preview,
            },
          ]
        : [];
    })
    .sort((left, right) => left.cityId - right.cityId);
}

export function playerLabelV7(view: PlayerViewV7, playerId: number): string {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "Unknown player" : `Player ${player.seat + 1}`;
}

export function defectionTimelineV7(
  view: PlayerViewV7,
  preview: DefectionPreviewV7,
): readonly string[] {
  const replyRound = Number.isSafeInteger(preview.replyBoundary.earliestRound)
    ? `, no earlier than round ${preview.replyBoundary.earliestRound}`
    : "";
  const resolutionRound = Number.isSafeInteger(
    preview.earliestResolutionBoundary.earliestRound,
  )
    ? `, no earlier than round ${preview.earliestResolutionBoundary.earliestRound}`
    : "";
  return [
    `${playerLabelV7(view, preview.replyBoundary.playerId)} receives one complete reply turn, ending at their next accepted End Turn${replyRound}.`,
    `${playerLabelV7(view, preview.earliestResolutionBoundary.playerId)} resolves at their first later Start Turn${resolutionRound}.`,
  ];
}

/** Exact only for the viewer-owned target, using currently offered MOVE paths. */
export function defectionEscapeGeometryV7(
  view: PlayerViewV7,
  offeredCommands: readonly CommandV7[],
  status: PublicDefectionStatusV7,
):
  | { readonly kind: "EXACT"; readonly endpoints: readonly CoordV7[] }
  | {
      readonly kind: "NOT_CURRENTLY_ACTIONABLE";
      readonly reason: "NOT_TARGET_OWNER" | "NOT_ACTIVE" | "ACTION_LOCKED";
    } {
  if (status.visibility !== "FULL")
    return { kind: "NOT_CURRENTLY_ACTIONABLE", reason: "NOT_TARGET_OWNER" };
  const target = view.units.find(
    (unit) =>
      unit.id === status.targetUnitId && unit.ownerId === view.viewer.id,
  );
  const source = view.units.find((unit) => unit.id === status.sourceUnitId);
  if (target === undefined || source === undefined)
    return { kind: "NOT_CURRENTLY_ACTIONABLE", reason: "NOT_TARGET_OWNER" };
  if (
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    view.pendingChoices.length > 0
  )
    return { kind: "NOT_CURRENTLY_ACTIONABLE", reason: "NOT_ACTIVE" };
  if (
    target.activation.handled ||
    offeredCommands.some(
      (command) =>
        command.kind === "END_PURSUIT" && command.unitId !== target.id,
    )
  )
    return { kind: "NOT_CURRENTLY_ACTIONABLE", reason: "ACTION_LOCKED" };
  const endpoints = offeredCommands
    .filter(
      (command): command is MoveCommandV7 =>
        command.kind === "MOVE" && command.unitId === target.id,
    )
    .map((command) => command.path.at(-1))
    .filter((at): at is CoordV7 => at !== undefined)
    .filter((at) => chebyshev(at, source.at) > 2)
    .sort((left, right) => left.y - right.y || left.x - right.x);
  return { kind: "EXACT", endpoints };
}

export function blackoutStatusTextV7(status: PublicBlackoutStatusV7): string {
  if (status.phase === "PENDING")
    return "Pending · activates at this city's next owner Start Turn";
  if (status.phase === "ACTIVE")
    return status.visibility === "FULL" && status.suppressedCoins !== null
      ? `Active · ${status.suppressedCoins} Coins suppressed this turn (cap 3)`
      : "Active · income suppression capped at 3 Coins; exact amount unavailable";
  if (status.visibility === "FULL" && status.unaffectedTurnStarted !== null)
    return `Recovery · unaffected owner turn started: ${status.unaffectedTurnStarted ? "yes" : "no"}`;
  return "Recovery · requires one complete unaffected owner turn";
}

export function tacticalAttachmentsV7(
  view: PlayerViewV7,
): readonly TacticalAttachmentV7[] {
  const attachments: TacticalAttachmentV7[] = [];
  for (const unit of view.units) {
    if (unit.visibility?.concealment !== undefined)
      attachments.push({
        key: `concealed:${unit.id}`,
        at: unit.at,
        symbolId: "ui-status-concealed",
        label: "Concealment capability; legal detection still applies",
        pulse: false,
      });
    if (unit.visibility?.detection !== undefined)
      attachments.push({
        key: `detected:${unit.id}`,
        at: unit.at,
        symbolId: "ui-status-detected",
        label: "Detected while inside any legal detector range",
        pulse: true,
      });
    if ((unit.visibility?.exposures?.length ?? 0) > 0)
      attachments.push({
        key: `exposed:${unit.id}`,
        at: unit.at,
        symbolId: "ui-status-exposed",
        label: "Exposed until its projected accepted End Turn boundary",
        pulse: true,
      });
  }
  for (const status of view.defectionStatuses) {
    const ids =
      status.visibility === "FULL"
        ? [status.sourceUnitId, status.targetUnitId]
        : [status.endpointUnitId];
    for (const id of ids) {
      const unit = view.units.find((candidate) => candidate.id === id);
      if (unit === undefined) continue;
      attachments.push({
        key: `defection:${status.visibility === "FULL" ? status.markId : `endpoint-${id}`}:${id}`,
        at: unit.at,
        symbolId:
          status.phase === "ARMED"
            ? "ui-status-defection-armed"
            : "ui-status-defection-waiting",
        label:
          status.phase === "ARMED"
            ? "Defection armed for the initiating player's next Start Turn"
            : "Defection waiting for the target owner's reply boundary",
        pulse: true,
      });
    }
  }
  for (const status of view.blackoutStatuses) {
    const city = view.cities.find(
      (candidate) => candidate.id === status.cityId,
    );
    if (city === undefined) continue;
    attachments.push({
      key: `blackout:${status.cityId}`,
      at: city.at,
      symbolId:
        status.phase === "PENDING"
          ? "ui-status-blackout-pending"
          : status.phase === "ACTIVE"
            ? "ui-status-blackout-active"
            : "ui-status-blackout-recovery",
      label: blackoutStatusTextV7(status),
      pulse: true,
    });
  }
  return attachments;
}

/** FULL is necessary but not sufficient: both endpoints must exist now. */
export function defectionLinksV7(
  view: PlayerViewV7,
): readonly DefectionLinkV7[] {
  return view.defectionStatuses.flatMap(
    (status): readonly DefectionLinkV7[] => {
      if (status.visibility !== "FULL") return [];
      const source = view.units.find((unit) => unit.id === status.sourceUnitId);
      const target = view.units.find((unit) => unit.id === status.targetUnitId);
      return source === undefined || target === undefined
        ? []
        : [
            {
              key: `defection-link:${status.markId}`,
              from: source.at,
              to: target.at,
              phase: status.phase,
            },
          ];
    },
  );
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
