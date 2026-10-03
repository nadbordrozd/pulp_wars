import { unitFactionV7, type PlayerViewV7 } from "../engine/index";
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

export function tacticalAttachmentsV7(
  view: PlayerViewV7,
): readonly TacticalAttachmentV7[] {
  const exploredCoords = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const inspiredUnitIds = new Set(
    view.unitStats
      .filter((stats) =>
        stats.stats.some(
          (stat) =>
            stat.id === "ATTACK" &&
            stat.modifiers.some((modifier) => modifier.source === "INSPIRED"),
        ),
      )
      .map((stats) => stats.unitId),
  );
  return view.units.flatMap((unit): readonly TacticalAttachmentV7[] =>
    unit.form !== "EMBARKED" &&
    exploredCoords.has(`${unit.at.x},${unit.at.y}`) &&
    inspiredUnitIds.has(unit.id)
      ? [
          {
            key: `inspired:${unit.id}`,
            at: unit.at,
            symbolId: "ui-status-inspired",
            // The Mind Control revision: the unit's kind names it.
            label: inspiredLabelV7(unitFactionV7(view, unit)),
            pulse: false,
          },
        ]
      : [],
  );
}

function inspiredLabelV7(
  faction: PlayerViewV7["players"][number]["faction"] | undefined,
): string {
  if (faction === "UNDEAD")
    return "Frenzied by Necromancer Frenzy: +1 next Attack";
  // Revision 17: Goblin Inspired units show WAAAGH!.
  if (faction === "GOBLIN")
    return "WAAAGH! from an Orc Warboss: +1 next Attack";
  // Revision 19: Dinosaur Inspired units show War Drums.
  if (faction === "DINOSAUR")
    return "War Drums from a Shaman: +1 Attack on the next attack";
  return "Inspired by Captain Rally: +1 next Attack";
}
