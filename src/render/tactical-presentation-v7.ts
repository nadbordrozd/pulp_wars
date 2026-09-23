import type { PlayerViewV7 } from "../engine/index";
import type { Ruleset7TacticalUiSymbolId } from "../assets/ruleset7-tactical-ui-symbols";
import type { CoordV7 } from "../engine/v7/types";

export interface TacticalAttachmentV7 {
  readonly key: string;
  readonly at: CoordV7;
  readonly symbolId: Ruleset7TacticalUiSymbolId;
  readonly label: string;
  readonly pulse: boolean;
}

export function playerLabelV7(view: PlayerViewV7, playerId: number): string {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "Unknown player" : `Player ${player.seat + 1}`;
}

export function tacticalAttachmentsV7(): readonly TacticalAttachmentV7[] {
  return [];
}
