import {
  previewBlackoutV7,
  type BlackoutPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type PublicBlackoutStatusV7,
} from "../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../assets/ruleset7-tactical-ui-symbols";

export type TacticalTargetModeV7 = {
  readonly kind: "BLACKOUT";
  readonly sourceUnitId: number;
};

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
