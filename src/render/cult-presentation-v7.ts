import {
  OFFERING_FAVOUR_V7,
  OFFERING_POPULATION_V7,
  SEIZE_BROKEN_HP_V7,
  arePlayersHostileV7,
  favourOfV7,
  previewOfferingV7,
  previewSacrificeV7,
  previewSeizeV7,
  sacrificeRejectionV7,
  seizeRejectionV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type FavourEntryV7,
  type FavourSourceV7,
  type PlayerEventV7,
  type PlayerId,
  type PlayerViewV7,
  type PublicUnitV7,
  type UnitId,
} from "../engine/index";

/**
 * The Cultists of the Ancient Ones (docs/product/RULESET_7_CULTISTS.md;
 * `pulp_wars-mch9.4`): the words for Favour, Sacrifice, Seize, and Offering.
 * The browser (`src/render/dom/app-view-v7.ts`) and the text-mode harness
 * (`scripts/play-text-v7.ts`) print the same ones, so this module imports
 * the engine only.
 *
 * The text-mode harness lists one line per victim, named by the victim's
 * unit (`cultCommandPresentationV7`). The browser (bead `pulp_wars-mch9.17`,
 * the second half of this module) has one Sacrifice and one Seize button per
 * Summoner and a victim picked on the board (the help mark on own units, the
 * attack mark on enemies, each with its Favour), and Favour in the HUD and
 * the leaderboard.
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

// ------------------------------------------------ The interface (U1) ---
//
// Bead `pulp_wars-mch9.17` (docs/ui/BOARD_TARGETING.md section 3.7): a
// Summoner has one Sacrifice button and one Seize button; each arms its
// aiming and the victim is picked on the board. The words below are the
// buttons' reasons, the marks' labels, the HUD's, and the notices.

/** The instruction of an armed Sacrifice. */
export const SACRIFICE_PICK_V7 = "Choose a unit of yours next to it";
/** The instruction of an armed Seize. */
export const SEIZE_PICK_V7 = "Choose a broken enemy next to it";

export const SUMMONER_ALREADY_ACTED_V7 = "Already acted this turn";
export const SUMMONER_CANNOT_ACT_V7 = "It cannot act now";
export const SUMMONER_EMBARKED_V7 = "It must be on land";
export const SACRIFICE_NO_VICTIM_V7 = "No unit of yours on land next to it";
export const SACRIFICE_AFFLICTED_V7 =
  "A Plagued or Bitten unit cannot be Sacrificed";
export const SACRIFICE_CONTROLLED_V7 =
  "A mind-controlled unit cannot be Sacrificed";
export const SEIZE_NO_HOLDER_V7 =
  "A second cultist must stand next to the enemy";
export const SEIZE_HEALTHY_V7 = `No enemy next to it is at ${SEIZE_BROKEN_HP_V7} HP or less`;
export const SEIZE_IMMUNE_V7 = "This enemy cannot be Seized";

/** The HUD chip's tooltip. */
export const FAVOUR_TOOLTIP_V7 =
  "Favour: the Ancient Ones pay it for Sacrifices, Seizures and Offerings. It pays for summoning";

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * The public Favour pools of a view, one per Cult seat still in the match
 * (a view captured before the Cultists has none).
 */
export function favourEntriesV7(view: PlayerViewV7): readonly FavourEntryV7[] {
  return (
    (view as { readonly cult?: PlayerViewV7["cult"] | undefined }).cult
      ?.favour ?? []
  );
}

/** Whether `playerId` is a Cult seat of the match (it has a Favour pool). */
export function seatHasFavourV7(
  view: PlayerViewV7,
  playerId: PlayerId,
): boolean {
  return favourEntriesV7(view).some((entry) => entry.playerId === playerId);
}

/** "12 Favour", for a label a screen reader reads. */
export function favourCountTextV7(favour: number): string {
  return `${favour} ${FAVOUR_LABEL_V7}`;
}

/** The label at a victim's mark: what it pays. */
export function favourBoardLabelV7(favour: number): string {
  return favourGainTextV7(favour);
}

/** The cursor's sentence for a Sacrifice target. */
export function sacrificeTargetNameV7(unit: string, favour: number): string {
  return `${SACRIFICE_LABEL_V7} this ${unit}: ${favourGainTextV7(favour)}. It is gone for good.`;
}

/** The cursor's sentence for a Seize target (`holder`: who holds it down). */
export function seizeTargetNameV7(
  unit: string,
  favour: number,
  holder: string | null,
): string {
  return `${SEIZE_LABEL_V7} this ${unit}: ${favourGainTextV7(favour)}.${holder === null ? "" : ` Your ${holder} holds it down.`}`;
}

/** The own units next to `summoner` (any form): the Sacrifice candidates. */
function ownNeighboursV7(
  view: PlayerViewV7,
  summoner: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.id !== summoner.id &&
      unit.ownerId === summoner.ownerId &&
      chebyshev(unit.at, summoner.at) === 1,
  );
}

/** The hostile units next to `summoner` that the viewer sees. */
function hostileNeighboursV7(
  view: PlayerViewV7,
  summoner: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.ownerId !== summoner.ownerId &&
      chebyshev(unit.at, summoner.at) === 1 &&
      arePlayersHostileV7(view, summoner.ownerId, unit.ownerId),
  );
}

/**
 * The grey reason on an own unit next to an aiming Summoner that cannot be
 * Sacrificed ("Plagued", "Bitten", "Mind-controlled"), from the engine's own
 * rule; null for a legal victim and for a unit that is no candidate at all.
 */
export function sacrificeBlockTextV7(
  view: PlayerViewV7,
  summoner: PublicUnitV7,
  victim: PublicUnitV7,
): string | null {
  const rejection = sacrificeRejectionV7(view, summoner, victim);
  if (rejection?.code !== "SACRIFICE_NOT_LEGAL") return null;
  switch (rejection.reason) {
    case "PLAGUED":
      return "Plagued";
    case "BITTEN":
      return "Bitten";
    case "CONTROLLED":
      return "Mind-controlled";
    default:
      return null;
  }
}

/**
 * The grey reason on a hostile unit next to an aiming Summoner that cannot
 * be Seized ("Above 5 HP", "Nobody holds it", "Cannot be Seized"), from the
 * engine's own rule; null for a legal victim.
 */
export function seizeBlockTextV7(
  view: PlayerViewV7,
  summoner: PublicUnitV7,
  victim: PublicUnitV7,
): string | null {
  const rejection = seizeRejectionV7(view, view.units, summoner, victim);
  if (rejection?.code !== "SEIZE_NOT_LEGAL") return null;
  switch (rejection.reason) {
    case "HEALTHY":
      return `Above ${SEIZE_BROKEN_HP_V7} HP`;
    case "NO_HOLDER":
      return "Nobody holds it";
    case "IMMUNE":
      return "Cannot be Seized";
    default:
      return null;
  }
}

/**
 * Why the viewer's Summoner has no Sacrifice to aim, or null when one is
 * offered or the button should not be shown at all (not a Summoner of the
 * viewer's, or no own unit stands next to it).
 */
export function sacrificeUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    unit.ownerId !== view.viewer.id ||
    !(unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "SACRIFICE",
    )
  )
    return null;
  const neighbours = ownNeighboursV7(view, unit);
  if (neighbours.length === 0) return null;
  const rejections = neighbours.map((victim) =>
    sacrificeRejectionV7(view, unit, victim),
  );
  if (rejections.includes(null)) return SUMMONER_CANNOT_ACT_V7;
  if (rejections.some((entry) => entry?.code === "UNIT_ALREADY_ACTED"))
    return SUMMONER_ALREADY_ACTED_V7;
  const reasons = rejections.flatMap((entry) =>
    entry?.code === "SACRIFICE_NOT_LEGAL" ? [entry.reason] : [],
  );
  if (reasons.includes("EMBARKED")) return SUMMONER_EMBARKED_V7;
  if (reasons.includes("PLAGUED") || reasons.includes("BITTEN"))
    return SACRIFICE_AFFLICTED_V7;
  if (reasons.includes("CONTROLLED")) return SACRIFICE_CONTROLLED_V7;
  return reasons.includes("VICTIM")
    ? SACRIFICE_NO_VICTIM_V7
    : SUMMONER_CANNOT_ACT_V7;
}

/**
 * Why the viewer's Summoner has no Seizure to aim, or null when one is
 * offered or the button should not be shown at all (not a Summoner of the
 * viewer's, or no enemy the viewer sees stands next to it).
 */
export function seizeUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    unit.ownerId !== view.viewer.id ||
    !(unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "SEIZE",
    )
  )
    return null;
  const neighbours = hostileNeighboursV7(view, unit);
  if (neighbours.length === 0) return null;
  const rejections = neighbours.map((victim) =>
    seizeRejectionV7(view, view.units, unit, victim),
  );
  if (rejections.includes(null)) return SUMMONER_CANNOT_ACT_V7;
  if (rejections.some((entry) => entry?.code === "UNIT_ALREADY_ACTED"))
    return SUMMONER_ALREADY_ACTED_V7;
  const reasons = rejections.flatMap((entry) =>
    entry?.code === "SEIZE_NOT_LEGAL" ? [entry.reason] : [],
  );
  if (reasons.includes("EMBARKED")) return SUMMONER_EMBARKED_V7;
  // The reason nearest to a Seizure first: a broken enemy nobody holds.
  if (reasons.includes("NO_HOLDER")) return SEIZE_NO_HOLDER_V7;
  if (reasons.includes("HEALTHY")) return SEIZE_HEALTHY_V7;
  return reasons.includes("IMMUNE") ? SEIZE_IMMUNE_V7 : SEIZE_HEALTHY_V7;
}

function seatName(view: PlayerViewV7, playerId: PlayerId): string {
  if (playerId === view.viewer.id) return "You";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "An enemy" : `Player ${player.seat + 1}`;
}

/**
 * The name of a unit that is gone after the boundary, as the viewer knew it
 * before ("Knight", "Initiate"; a mind-controlled unit keeps its kind).
 */
function victimNameV7(before: PlayerViewV7, unitId: UnitId): string {
  const unit = before.units.find((candidate) => candidate.id === unitId);
  return unit === undefined ? "Unit" : unitRoleRuleV7(before, unit).label;
}

/**
 * The notice of a boundary's Cult events (section 14.3): what the viewer's
 * own Sacrifice, Seizure, Offering, or Martyr paid ("Offering: +3 Favour,
 * −2 population"), and a Seizure of one of the viewer's units. Another
 * seat's Favour is read off the leaderboard, not announced. Null without
 * one. It names no tile and no ID.
 */
export function cultBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  for (const event of events) {
    if (event.kind === "UNIT_SACRIFICED") {
      if (event.playerId !== viewerId) continue;
      parts.push(
        `${victimNameV7(before, event.victimUnitId)} Sacrificed: ${favourGainTextV7(event.favour)}`,
      );
    } else if (event.kind === "UNIT_SEIZED") {
      if (event.playerId === viewerId)
        parts.push(
          `${victimNameV7(before, event.victimUnitId)} Seized: ${favourGainTextV7(event.favour)}`,
        );
      else if (event.victimOwnerId === viewerId)
        parts.push(
          `${seatName(after, event.playerId)} Seized your ${victimNameV7(before, event.victimUnitId)}`,
        );
    } else if (event.kind === "OFFERING_MADE") {
      if (event.playerId !== viewerId) continue;
      parts.push(
        `${OFFERING_LABEL_V7}: ${favourGainTextV7(event.favour)}, −${event.population} population`,
      );
    } else if (event.kind === "FAVOUR_GAINED") {
      if (event.playerId !== viewerId || event.source !== "MARTYR") continue;
      parts.push(`Martyr: ${favourGainTextV7(event.amount)}`);
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast: true };
}
