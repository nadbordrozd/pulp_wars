import {
  HORROR_FAVOUR_COST_V7,
  previewAnchorV7,
  previewBeholdV7,
  previewBooV7,
  previewChannelV7,
  previewSummonV7,
  unitRoleRuleV7,
  type CommandV7,
  type DisruptionCauseV7,
  type FavourPurposeV7,
  type PlayerViewV7,
} from "../engine/index";
import type { CultCommandPresentationV7 } from "./cult-presentation-v7";

/**
 * The Cultists of the Ancient Ones, the channel (`pulp_wars-mch9.5`;
 * docs/product/RULESET_7_CULTISTS.md sections 6.1, 6.2, 8.1, 8.4, and 8.5):
 * the words for Summon, Channel, Behold!, Anchor, and Boo!. The browser
 * (`src/render/dom/app-view-v7.ts`) and the text-mode harness
 * (`scripts/play-text-v7.ts`) print the same ones, so this module imports
 * the engine only.
 *
 * **A stand-in.** The dock shows these commands with its generic action
 * buttons: "Summon Horror" (one button per Summoner: the first helper and
 * tile the engine offers), "Channel Horror" (one per daemon in reach),
 * "Behold!", "Grip Initiate" (one per channeller beside the Thing), and
 * "Boo!", each with a chip that says what it does to the strands or the
 * Favour. The interface bead of the channel (U2, `pulp_wars-mch9.18`)
 * replaces them: the Horror's tile, the helper, the daemon, and the gripped
 * cultist are picked on the board; strands are drawn as chains with Control
 * pips under each daemon and a candle over each channeller; a raised idol
 * has its ring; Boo! shows where each unit jumps; and End Turn asks once
 * when a daemon is short of its Control.
 */
export const SUMMON_LABEL_V7 = "Summon Horror";
export const CHANNEL_LABEL_V7 = "Channel";
export const BEHOLD_LABEL_V7 = "Behold!";
export const ANCHOR_LABEL_V7 = "Grip";
export const BOO_LABEL_V7 = "Boo!";

/** Section 6.1, the card text. */
export const SUMMON_TOOLTIP_V7 = `The Summoner and a cultist beside it summon a Horror for ${HORROR_FAVOUR_COST_V7} Favour. Both channel it this turn`;
/** Section 6.2, the card text. */
export const CHANNEL_TOOLTIP_V7 =
  "A cultist channels a daemon within 3 tiles. At the start of your turn each daemon needs as many unbroken strands as its Control, or it is Unbound";
/** Section 8.1, the card text. */
export const BEHOLD_TOOLTIP_V7 =
  "It holds up the idol. Cultists beside it are too awestruck to flinch, until someone hits the Idol Bearer";
/** Section 8.4, the card text. */
export const ANCHOR_TOOLTIP_V7 =
  "The Thing grips the cultist beside it: that cultist's strand counts three. Hit that cultist and all three go";
/** Section 8.5, the card text. */
export const BOO_TOOLTIP_V7 =
  "BOO! Every living unit beside it, friend or foe, jumps one tile away";

/** What a seat spent Favour on, in plain words (the event log). */
export const FAVOUR_PURPOSE_LABELS_V7: Readonly<
  Record<FavourPurposeV7, string>
> = { SUMMON_HORROR: "summoning a Horror" };

/** How a cultist was disrupted, in plain words (the event log). */
export const DISRUPTION_CAUSE_LABELS_V7: Readonly<
  Record<DisruptionCauseV7, string>
> = {
  HP_LOSS: "it was hurt",
  MOVED: "it was moved",
  STATUS: "it was hexed",
  OWNER: "it was taken",
  GONE: "it is gone",
};

/** "2 / 3": a daemon's holding strands against its Control. */
export function strandsTextV7(strands: number, control: number): string {
  return `${strands} / ${control}`;
}

/** "−5 Favour". */
export function favourCostTextV7(amount: number): string {
  return `−${amount} Favour`;
}

/**
 * The button of an offered `SUMMON`, `CHANNEL`, `BEHOLD`, `ANCHOR`, or
 * `BOO`, or null for any other command (or one that is not offered). Units
 * are named by what they are, never by an ID or a tile.
 */
export function cultChannelCommandPresentationV7(
  view: PlayerViewV7,
  command: CommandV7,
): CultCommandPresentationV7 | null {
  const name = (unitId: number): string | null => {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    return unit === undefined ? null : unitRoleRuleV7(view, unit).label;
  };
  switch (command.kind) {
    case "SUMMON": {
      const preview = previewSummonV7(
        view,
        command.unitId,
        command.helperUnitId,
        command.at,
      );
      return preview === null
        ? null
        : {
            label: SUMMON_LABEL_V7,
            chip: favourCostTextV7(preview.favour),
            tooltip: SUMMON_TOOLTIP_V7,
          };
    }
    case "CHANNEL": {
      const preview = previewChannelV7(
        view,
        command.unitId,
        command.daemonUnitId,
      );
      const daemon = name(command.daemonUnitId);
      return preview === null || daemon === null
        ? null
        : {
            label: `${CHANNEL_LABEL_V7} ${daemon}`,
            chip: strandsTextV7(preview.strandsAfter, preview.control),
            tooltip: CHANNEL_TOOLTIP_V7,
          };
    }
    case "BEHOLD": {
      const preview = previewBeholdV7(view, command.unitId);
      const warded = preview?.wardedUnitIds.length ?? 0;
      return preview === null
        ? null
        : {
            label: BEHOLD_LABEL_V7,
            chip: `${warded} ${warded === 1 ? "cultist" : "cultists"}`,
            tooltip: BEHOLD_TOOLTIP_V7,
          };
    }
    case "ANCHOR": {
      const preview = previewAnchorV7(
        view,
        command.unitId,
        command.cultistUnitId,
      );
      const cultist = name(command.cultistUnitId);
      return preview === null || cultist === null
        ? null
        : {
            label: `${ANCHOR_LABEL_V7} ${cultist}`,
            chip: strandsTextV7(preview.strandsAfter, preview.control),
            tooltip: ANCHOR_TOOLTIP_V7,
          };
    }
    case "BOO": {
      const preview = previewBooV7(view, command.unitId);
      const scared = preview?.results.length ?? 0;
      return preview === null
        ? null
        : {
            label: BOO_LABEL_V7,
            chip: `${scared} ${scared === 1 ? "unit" : "units"}`,
            tooltip: BOO_TOOLTIP_V7,
          };
    }
    default:
      return null;
  }
}

/**
 * The stand-in's one rule about what the dock lists: of the `SUMMON`
 * commands of one Summoner (one per helper and free tile, up to 64) only
 * the first the engine offers is a button. Every other command is shown.
 */
export function cultChannelStandInShownV7(
  command: CommandV7,
  offered: readonly CommandV7[],
): boolean {
  if (command.kind !== "SUMMON") return true;
  const first = offered.find(
    (candidate) =>
      candidate.kind === "SUMMON" && candidate.unitId === command.unitId,
  );
  return (
    first === undefined ||
    (first.kind === "SUMMON" &&
      first.helperUnitId === command.helperUnitId &&
      first.at.x === command.at.x &&
      first.at.y === command.at.y)
  );
}
