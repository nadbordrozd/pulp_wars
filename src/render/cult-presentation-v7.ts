import {
  FAVOUR_CAP_V7,
  HERALD_FAVOUR_COST_V7,
  MASS_FAVOUR_COST_V7,
  OFFERING_FAVOUR_V7,
  OFFERING_POPULATION_V7,
  SEIZE_BROKEN_HP_V7,
  SWITCHEROO_RANGE_V7,
  arePlayersHostileV7,
  favourForfeitedV7,
  favourOfV7,
  heraldHungerDueV7,
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
import {
  cultChannelCommandPresentationV7,
  cultChannelNoticePartsV7,
} from "./cult-channel-presentation-v7";
import { cultTrickNoticePartsV7 } from "./cult-ritual-presentation-v7";
import { playerSubjectV7 } from "./player-names-v7";

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
  "Summoners Sacrifice your own units and Seize badly hurt enemies for Favour, and Summon Horrors with it";
/** Explosives (shown as The Stars Are Right), `GREAT_SUMMONING`. */
export const GREAT_SUMMONING_UNLOCK_TEXT_V7 = `The Great Summoning: a Summoner and three cultists beside it call the Herald for ${HERALD_FAVOUR_COST_V7} Favour. It arrives next turn`;
/** Scouting (shown as Familiars), `SWITCHEROO` (`pulp_wars-mch9.8`). */
export const SWITCHEROO_UNLOCK_TEXT_V7 = `Switcheroo: a Familiar swaps places with a unit within ${SWITCHEROO_RANGE_V7} tiles, never on a city or village center`;
/**
 * Chivalry (shown as Tentacles), `TENTACLES` (the Cult redesign,
 * `pulp_wars-mch9.31`): the Summoner's Tentacle.
 */
export const TENTACLES_UNLOCK_TEXT_V7 =
  "Tentacle: a Summoner calls up a Tentacle that belongs to nobody and slaps whoever is weakest beside it";
/**
 * Metallurgy (shown as Gibbering Masses), `SUMMON_MASS` (the Cult redesign,
 * `pulp_wars-mch9.37`): the Summoner's Summon a Gibbering Mass.
 */
export const SUMMON_MASS_UNLOCK_TEXT_V7 = `Gibbering Mass: a Summoner and a cultist beside it summon a slow wall of mouths for ${MASS_FAVOUR_COST_V7} Favour. Enemies beside it can move only one tile`;
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
    DAEMON_KILL: "a daemon's kill",
    CONSUMPTION: "the Great Summoning's meal",
    TRICKLE: "the Summoners' channelling",
    // Themed naval branches (`pulp_wars-5ti.22`).
    DEEP_OFFERING: "an Offering to the Deep",
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
  // The channel (`pulp_wars-mch9.5`): Summon, Channel, Behold!, Anchor, and
  // Boo! (src/render/cult-channel-presentation-v7.ts).
  const channel = cultChannelCommandPresentationV7(view, command);
  if (channel !== null) return channel;
  if (command.kind === "OFFERING") {
    const preview = previewOfferingV7(view, command.cityId);
    return preview === null
      ? null
      : {
          label: OFFERING_LABEL_V7,
          chip: `${favourGainLossTextV7(preview.favour, preview.forfeited)} · −${preview.population} population`,
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
        chip: favourGainLossTextV7(preview.favour, preview.forfeited),
        tooltip: SACRIFICE_TOOLTIP_V7,
      }
    : {
        label: `${SEIZE_LABEL_V7} ${name}`,
        chip: favourGainLossTextV7(preview.favour, preview.forfeited),
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
export const FAVOUR_TOOLTIP_V7 = `Favour: the Ancient Ones pay it for Sacrifices, Seizures and Offerings, up to ${FAVOUR_CAP_V7}. It pays for summoning`;

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

// ------------------------------- The cap, the trickle, Hunger (U-R1) ---
//
// The Cult redesign (`pulp_wars-mch9.42`,
// docs/product/RULESET_7_CULT_REDESIGN.md sections 6, 7.6 and 13): Favour
// stops at its cap and a gain above it is lost (shown, never banked); a
// bound Herald eats Favour at each Start Turn.

/** "/ 30": the cap, after the HUD chip's number. */
export const FAVOUR_CAP_TEXT_V7 = `/ ${FAVOUR_CAP_V7}`;

/** "12 / 30": the HUD chip's number against the cap. */
export function favourChipTextV7(favour: number): string {
  return `${favour} ${FAVOUR_CAP_TEXT_V7}`;
}

/** Whether Favour stands at the cap (anything more is lost). */
export function favourAtCapV7(favour: number): boolean {
  return favour >= FAVOUR_CAP_V7;
}

/**
 * The Favour the viewer's bound Heralds eat at its next Start Turn
 * (`HERALD_HUNGER_FAVOUR_V7` each), read from the public view.
 */
export function viewerHungerDueV7(view: PlayerViewV7): number {
  return heraldHungerDueV7(view.units, view.viewer.id);
}

/** "Hunger −2 a turn". */
export function hungerDueTextV7(hunger: number): string {
  return `Hunger −${hunger} a turn`;
}

/**
 * The HUD chip's tooltip: the card text, "Full" at the cap, and the Hunger
 * the viewer's Heralds eat. No formula.
 */
export function favourChipTooltipV7(favour: number, hunger: number): string {
  return [
    FAVOUR_TOOLTIP_V7,
    ...(favourAtCapV7(favour) ? ["Full: anything more is lost"] : []),
    ...(hunger > 0 ? [hungerDueTextV7(hunger)] : []),
  ].join(". ");
}

/** "12 of 30 Favour. Hunger −2 a turn", for a screen reader. */
export function favourChipLabelV7(favour: number, hunger: number): string {
  return [
    `${favour} of ${FAVOUR_CAP_V7} ${FAVOUR_LABEL_V7}${favourAtCapV7(favour) ? ", full" : ""}`,
    ...(hunger > 0 ? [hungerDueTextV7(hunger)] : []),
  ].join(". ");
}

/**
 * The part of a gain of `amount` Favour the viewer would lose above the cap
 * (0 when it all fits): what a preview's "lost" says.
 */
export function viewerFavourForfeitV7(
  view: PlayerViewV7,
  amount: number,
): number {
  return favourForfeitedV7(favourOfV7(view, view.viewer.id), amount);
}

/** "3 lost": the part of a gain above the cap. */
export function favourLostTextV7(forfeited: number): string {
  return `${forfeited} lost`;
}

/** "Favour full: 3 lost": a gain cut by the cap that no notice names. */
export function favourFullTextV7(forfeited: number): string {
  return `${FAVOUR_LABEL_V7} full: ${favourLostTextV7(forfeited)}`;
}

/** "+12 Favour", or "+12 Favour (3 lost)" when part of it is above the cap. */
export function favourGainLossTextV7(
  amount: number,
  forfeited: number,
): string {
  return forfeited > 0
    ? `${favourGainTextV7(amount)} (${favourLostTextV7(forfeited)})`
    : favourGainTextV7(amount);
}

/** The label at a victim's mark: what it pays, and what is lost of it. */
export function favourBoardLabelV7(favour: number, forfeited = 0): string {
  return forfeited > 0
    ? `+${favour} (${favourLostTextV7(forfeited)})`
    : favourGainTextV7(favour);
}

/** The cursor's sentence for a Sacrifice target. */
export function sacrificeTargetNameV7(
  unit: string,
  favour: number,
  forfeited = 0,
): string {
  return `${SACRIFICE_LABEL_V7} this ${unit}: ${favourGainLossTextV7(favour, forfeited)}. It is gone for good.`;
}

/** The cursor's sentence for a Seize target (`holder`: who holds it down). */
export function seizeTargetNameV7(
  unit: string,
  favour: number,
  holder: string | null,
  forfeited = 0,
): string {
  return `${SEIZE_LABEL_V7} this ${unit}: ${favourGainLossTextV7(favour, forfeited)}.${holder === null ? "" : ` Your ${holder} holds it down.`}`;
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
  return playerSubjectV7(view, playerId);
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
 * own Sacrifice, Seizure, or Offering paid ("Offering: +6 Favour, −2
 * population"), with the part lost above the cap ("+6 Favour (2 lost)"; any
 * other gain cut by the cap reads "Favour full: 2 lost"), and a Seizure of
 * one of the viewer's units. Another seat's Favour is not announced. Null
 * without one. It names no tile and no ID.
 */
export function cultBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  // The viewer's own gain whose `FAVOUR_GAINED` (with the part above the
  // cap) follows it: its part and the words of its gain.
  let gain: { readonly index: number; readonly amount: number } | null = null;
  for (const event of events) {
    if (event.kind === "UNIT_SACRIFICED") {
      if (event.playerId !== viewerId) continue;
      gain = { index: parts.length, amount: event.favour };
      parts.push(
        `${victimNameV7(before, event.victimUnitId)} Sacrificed: ${favourGainTextV7(event.favour)}`,
      );
    } else if (event.kind === "UNIT_SEIZED") {
      if (event.playerId === viewerId) {
        gain = { index: parts.length, amount: event.favour };
        parts.push(
          `${victimNameV7(before, event.victimUnitId)} Seized: ${favourGainTextV7(event.favour)}`,
        );
      } else if (event.victimOwnerId === viewerId)
        parts.push(
          `${seatName(after, event.playerId)} Seized your ${victimNameV7(before, event.victimUnitId)}`,
        );
    } else if (event.kind === "OFFERING_MADE") {
      if (event.playerId !== viewerId) continue;
      gain = { index: parts.length, amount: event.favour };
      parts.push(
        `${OFFERING_LABEL_V7}: ${favourGainTextV7(event.favour)}, −${event.population} population`,
      );
    } else if (event.kind === "FAVOUR_GAINED" && event.playerId === viewerId) {
      const paid = gain;
      gain = null;
      if (event.forfeited <= 0) continue;
      const part = paid === null ? undefined : parts[paid.index];
      if (
        paid !== null &&
        part !== undefined &&
        paid.amount === event.amount &&
        (event.source === "SACRIFICE" ||
          event.source === "SEIZE" ||
          event.source === "OFFERING")
      )
        parts[paid.index] = part.replace(
          favourGainTextV7(paid.amount),
          favourGainLossTextV7(paid.amount, event.forfeited),
        );
      else parts.push(favourFullTextV7(event.forfeited));
    }
  }
  // The channel (bead pulp_wars-mch9.18): the viewer's strands broken and a
  // daemon Unbound.
  parts.push(...cultChannelNoticePartsV7(events, before, after));
  // Rituals, hexes and tricks (bead pulp_wars-mch9.19).
  parts.push(...cultTrickNoticePartsV7(events, before, after));
  return parts.length === 0 ? null : { text: parts.join(" · "), toast: true };
}
