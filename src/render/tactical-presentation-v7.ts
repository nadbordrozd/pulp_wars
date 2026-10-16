import type { PlayerViewV7 } from "../engine/index";
import { presentedUnitFactionV7 } from "./neutral-presentation-v7";
import type { Ruleset7TacticalUiSymbolId } from "../assets/ruleset7-tactical-ui-symbols";
import type { CoordV7 } from "../engine/v7/types";
import { playerNameV7 } from "./player-names-v7";

export interface TacticalAttachmentV7 {
  readonly key: string;
  readonly at: CoordV7;
  readonly symbolId: Ruleset7TacticalUiSymbolId;
  readonly label: string;
  readonly pulse: boolean;
}

/** "You" for the viewer, otherwise "Martians" (bead pulp_wars-2yc.56). */
export function playerLabelV7(view: PlayerViewV7, playerId: number): string {
  return playerNameV7(view, playerId, "Unknown player");
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
            label: inspiredLabelV7(presentedUnitFactionV7(view, unit)),
            pulse: false,
          },
        ]
      : [],
  );
}

function inspiredLabelV7(
  faction: PlayerViewV7["players"][number]["faction"] | undefined,
): string {
  // Bead pulp_wars-2yc.63: one Inspire, named Rally in every faction (the
  // Undead Frenzy and the Dinosaur War Drums before).
  if (faction === "UNDEAD")
    return "Inspired by Necromancer Rally: +1 next Attack";
  // Goblin explosions and Berserk (`pulp_wars-w49.36`): the Orc Warboss
  // inspires nobody now (its Rally is Berserk), so a Goblin unit is Inspired
  // only by another faction's Rally (a mind-controlled Captain): plain words.
  if (faction === "GOBLIN") return "Inspired: +1 next Attack";
  if (faction === "DINOSAUR") return "Inspired by Shaman Rally: +1 next Attack";
  // The Brain's Psychic Command inspires the same way.
  if (faction === "MARTIAN")
    return "Inspired by Brain Psychic Command: +1 next Attack";
  return "Inspired by Captain Rally: +1 next Attack";
}
