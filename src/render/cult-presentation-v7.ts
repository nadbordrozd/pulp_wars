import {
  OFFERING_FAVOUR_V7,
  OFFERING_POPULATION_V7,
  favourOfV7,
  previewOfferingV7,
  previewSacrificeV7,
  previewSeizeV7,
  unitRoleRuleV7,
  type CommandV7,
  type FavourSourceV7,
  type PlayerId,
  type PlayerViewV7,
} from "../engine/index";

/**
 * The Cultists of the Ancient Ones (docs/product/RULESET_7_CULTISTS.md;
 * `pulp_wars-mch9.4`): the words for Favour, Sacrifice, Seize, and Offering.
 * The browser (`src/render/dom/app-view-v7.ts`) and the text-mode harness
 * (`scripts/play-text-v7.ts`) print the same ones, so this module imports
 * the engine only.
 *
 * The dock shows these commands with the generic action buttons for now (one
 * button per victim, named by the victim's unit). The interface bead
 * (`pulp_wars-mch9.17`) replaces that with one button per Summoner and a
 * victim picked on the board (the help mark on own units, the attack mark on
 * enemies, each with its Favour), and adds Favour to the HUD and the
 * leaderboard.
 */
export const FAVOUR_LABEL_V7 = "Favour";
export const SACRIFICE_LABEL_V7 = "Sacrifice";
export const SEIZE_LABEL_V7 = "Seize";
export const OFFERING_LABEL_V7 = "Offering";

/** Section 5.1, the card text. */
export const SACRIFICE_TOOLTIP_V7 =
  "The Summoner offers a unit beside it to the Ancient Ones: it is gone, and you gain its value in Favour";
/** Section 5.2, the card text. */
export const SEIZE_TOOLTIP_V7 =
  "Two cultists hold down a broken enemy; the Summoner offers it. Twice its value in Favour";
/** Section 5.3, the card text. */
export const OFFERING_TOOLTIP_V7 = `The city gives up ${OFFERING_POPULATION_V7} population to the Ancient Ones for ${OFFERING_FAVOUR_V7} Favour`;

/** Administration (shown as Leadership), `SUMMONER_SUPPORT`. */
export const SUMMONER_SUPPORT_UNLOCK_TEXT_V7 =
  "Summoners Sacrifice your own units and Seize badly hurt enemies for Favour";
/** Farming (shown as Harvest Rites), `OFFERING`. */
export const OFFERING_UNLOCK_TEXT_V7 = `Offering: a city gives up ${OFFERING_POPULATION_V7} population for ${OFFERING_FAVOUR_V7} Favour`;

/** "+3 Favour". */
export function favourGainTextV7(amount: number): string {
  return `+${amount} ${FAVOUR_LABEL_V7}`;
}

/** What paid the Favour, in plain words (the event log and the harness). */
export const FAVOUR_SOURCE_LABELS_V7: Readonly<Record<FavourSourceV7, string>> =
  {
    SACRIFICE: "a Sacrifice",
    SEIZE: "a Seizure",
    OFFERING: "an Offering",
    MARTYR: "a Martyr",
  };

/** The Favour of a seat as a viewer knows it (Favour is public). */
export function viewFavourV7(view: PlayerViewV7, playerId: PlayerId): number {
  return favourOfV7(view, playerId);
}

/** The name, chip, and sentence of a Cult command's button. */
export interface CultCommandPresentationV7 {
  /** The button's name: "Sacrifice Initiate", "Seize Knight", "Offering". */
  readonly label: string;
  /** What it pays: "+2 Favour"; an Offering also "−2 population". */
  readonly chip: string;
  /** The card text of the action. */
  readonly tooltip: string;
}

/**
 * The button of an offered `SACRIFICE`, `SEIZE`, or `OFFERING`, or null for
 * any other command (or one that is not offered). The victim is named by
 * its unit, never by an ID or a tile.
 */
export function cultCommandPresentationV7(
  view: PlayerViewV7,
  command: CommandV7,
): CultCommandPresentationV7 | null {
  if (command.kind === "OFFERING") {
    const preview = previewOfferingV7(view, command.cityId);
    return preview === null
      ? null
      : {
          label: OFFERING_LABEL_V7,
          chip: `${favourGainTextV7(preview.favour)} · −${preview.population} population`,
          tooltip: OFFERING_TOOLTIP_V7,
        };
  }
  if (command.kind !== "SACRIFICE" && command.kind !== "SEIZE") return null;
  const preview =
    command.kind === "SACRIFICE"
      ? previewSacrificeV7(view, command.unitId, command.victimUnitId)
      : previewSeizeV7(view, command.unitId, command.victimUnitId);
  const victim = view.units.find((unit) => unit.id === command.victimUnitId);
  if (preview === null || victim === undefined) return null;
  const name = unitRoleRuleV7(view, victim).label;
  return command.kind === "SACRIFICE"
    ? {
        label: `${SACRIFICE_LABEL_V7} ${name}`,
        chip: favourGainTextV7(preview.favour),
        tooltip: SACRIFICE_TOOLTIP_V7,
      }
    : {
        label: `${SEIZE_LABEL_V7} ${name}`,
        chip: favourGainTextV7(preview.favour),
        tooltip: SEIZE_TOOLTIP_V7,
      };
}
