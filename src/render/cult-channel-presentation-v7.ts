import {
  CHANNEL_RANGE_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  HORROR_FAVOUR_COST_V7,
  anchorRejectionV7,
  beholdRejectionV7,
  booRejectionV7,
  channelRejectionV7,
  daemonRoleV7,
  favourOfV7,
  previewAnchorV7,
  previewBeholdV7,
  previewBooV7,
  previewChannelV7,
  previewRampageV7,
  previewSummonV7,
  summonHelperLegalV7,
  summonRejectionV7,
  unitIsUnboundV7,
  unitRoleRuleV7,
  type AnchorPreviewV7,
  type BooPreviewEntryV7,
  type BooPreviewV7,
  type ChannelPreviewV7,
  type CommandV7,
  type DisruptionCauseV7,
  type FavourPurposeV7,
  type GripV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicDaemonV7,
  type PublicStrandV7,
  type PublicUnitV7,
  type UnitId,
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
 * The text-mode harness lists one line per command, named by its target
 * (`cultChannelCommandPresentationV7`). The browser (bead
 * `pulp_wars-mch9.18`, the second half of this module;
 * docs/ui/BOARD_TARGETING.md section 3.8) has one button per action: the
 * Horror's tile and the helper, the daemon, and the gripped cultist are
 * picked on the board; strands are drawn as chains with Control pips under
 * each daemon and a candle over each channeller; a raised idol has its
 * ring; Boo! shows where each unit jumps; and End Turn asks once when a
 * daemon is short of its Control.
 */
export const SUMMON_LABEL_V7 = "Summon Horror";
export const CHANNEL_LABEL_V7 = "Channel";
/**
 * Section 6.5 (`pulp_wars-mch9.6`): the same command on an Unbound daemon.
 * A stand-in like the others: U2 (`pulp_wars-mch9.18`) picks the daemon on
 * the board and shows the strands of the turn as pips under it.
 */
export const BIND_LABEL_V7 = "Bind";
export const BEHOLD_LABEL_V7 = "Behold!";
export const ANCHOR_LABEL_V7 = "Grip";
export const BOO_LABEL_V7 = "Boo!";

/** Section 6.1, the card text. */
export const SUMMON_TOOLTIP_V7 = `The Summoner and a cultist beside it summon a Horror for ${HORROR_FAVOUR_COST_V7} Favour. Both channel it this turn`;
/** Section 6.2, the card text. */
export const CHANNEL_TOOLTIP_V7 =
  "A cultist channels a daemon within 3 tiles. At the start of your turn each daemon needs as many unbroken strands as its Control, or it is Unbound";
/** Section 6.5, the card text. */
export const BIND_TOOLTIP_V7 =
  "Channel an Unbound daemon with enough cultists in one turn and it is yours again, but not in the turn it broke loose";
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
      const unbound =
        view.monsters.find((entry) => entry.unitId === command.daemonUnitId)
          ?.unbound !== undefined;
      // "Bind Horror": the daemon's own name, not "Unbound Horror".
      const daemon =
        preview === null
          ? null
          : unbound
            ? CULT_SUMMONED_ROLE_RULES_V7[preview.role].label
            : name(command.daemonUnitId);
      return preview === null || daemon === null
        ? null
        : {
            label: `${unbound ? BIND_LABEL_V7 : CHANNEL_LABEL_V7} ${daemon}`,
            chip: strandsTextV7(preview.strandsAfter, preview.control),
            tooltip: unbound ? BIND_TOOLTIP_V7 : CHANNEL_TOOLTIP_V7,
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

// ------------------------------------------------ The interface (U2) ---
//
// Bead `pulp_wars-mch9.18` (docs/ui/BOARD_TARGETING.md section 3.8): one
// button per action; the helper, the tile, the daemon, and the gripped
// cultist are picked on the board. The words below are the buttons'
// reasons, the marks' labels, the cursor's sentences, the dock's chips, the
// End Turn question, and the notices.

/** The five channel commands the dock aims or casts with its own buttons. */
export const CULT_CHANNEL_KINDS_V7 = [
  "SUMMON",
  "CHANNEL",
  "BEHOLD",
  "ANCHOR",
  "BOO",
] as const;
export type CultChannelKindV7 = (typeof CULT_CHANNEL_KINDS_V7)[number];

/** The Summoner's one button (the Horror is what it summons today). */
export const SUMMON_BUTTON_LABEL_V7 = "Summon";
/** The Thing's one button: the ability's name, as its card lists it. */
export const ANCHOR_BUTTON_LABEL_V7 = "Anchor";
/** The instruction of an armed Summon with several cultists beside it. */
export const SUMMON_PICK_HELPER_V7 = "Choose the cultist that helps";
/** The instruction of an armed Summon once the helper is known. */
export const SUMMON_PICK_TILE_V7 = "Choose a tile next to it for the Horror";
/** The badge on a cultist that may help a summoning. */
export const SUMMON_HELPER_BADGE_V7 = "Helper";
/** The instruction of an armed Channel. */
export const CHANNEL_PICK_V7 = `Choose a daemon within ${CHANNEL_RANGE_V7} tiles`;
/** The instruction of an armed Anchor. */
export const ANCHOR_PICK_V7 = "Choose a channelling cultist next to it";
/** The one confirmation of an aimed Boo!. */
export const BOO_CAST_V7 = "Boo!";
/** The label on a cultist a Behold! would ward. */
export const WARDED_LABEL_V7 = "Warded";

export const CHANNEL_ALREADY_ACTED_V7 = "Already acted this turn";
export const CHANNEL_EMBARKED_V7 = "It must be on land";
export const CHANNEL_HOLDING_V7 = "It channels already";
export const CHANNEL_FURIOUS_V7 = "The daemon is Furious this turn";
export const CHANNEL_OUT_OF_REACH_V7 = `No daemon within ${CHANNEL_RANGE_V7} tiles`;
export const SUMMON_NO_HELPER_V7 =
  "A cultist that has not acted must stand next to it";
export const SUMMON_NO_TILE_V7 = "No free tile next to it";
export const BEHOLD_RAISED_V7 = "The idol is raised";
export const ANCHOR_GRIPPING_V7 = "It grips a cultist already";
export const ANCHOR_NO_CULTIST_V7 = "No channelling cultist next to it";
export const BOO_NOBODY_V7 = "Nobody next to it to scare";

/** "Needs 5 Favour". */
export function summonNeedsFavourTextV7(cost: number): string {
  return `Needs ${cost} Favour`;
}

/** The channel a viewer sees: every list, empty in an older view. */
export interface ChannelViewV7 {
  readonly strands: readonly PublicStrandV7[];
  readonly grips: readonly GripV7[];
  readonly idols: readonly UnitId[];
  readonly daemons: readonly PublicDaemonV7[];
}

/**
 * The channel of a view. A view captured before the channel
 * (`pulp_wars-mch9.5`) has no lists; they read as empty.
 */
export function channelOfV7(view: PlayerViewV7): ChannelViewV7 {
  const cult = (view as { readonly cult?: Partial<PlayerViewV7["cult"]> }).cult;
  return {
    strands: cult?.strands ?? [],
    grips: cult?.grips ?? [],
    idols: cult?.idols ?? [],
    daemons: cult?.daemons ?? [],
  };
}

/** A daemon of the viewer that its next Start Turn check would unbind. */
export interface ShortDaemonV7 {
  readonly unitId: UnitId;
  /** "Horror". */
  readonly name: string;
  readonly strands: number;
  readonly control: number;
}

/**
 * Section 6.2: the viewer's own bound daemons whose holding strands are
 * short of their Control as the board stands: each is Unbound at the
 * viewer's next Start Turn unless it is channelled first. They are what
 * End Turn asks about.
 */
export function daemonsShortV7(view: PlayerViewV7): readonly ShortDaemonV7[] {
  return channelOfV7(view).daemons.flatMap((daemon): ShortDaemonV7[] => {
    const unit = view.units.find((candidate) => candidate.id === daemon.unitId);
    return unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      daemon.strands >= daemon.control
      ? []
      : [
          {
            unitId: daemon.unitId,
            name: unitRoleRuleV7(view, unit).label,
            strands: daemon.strands,
            control: daemon.control,
          },
        ];
  });
}

/** The answers of the End Turn question. */
export const END_TURN_UNBOUND_CONFIRM_V7 = "End turn";
export const END_TURN_UNBOUND_BACK_V7 = "Back";

/**
 * Section 6.2, what End Turn asks once when a daemon is short: "The Horror
 * will be Unbound." (the buttons are the choice). A confirmation, not a
 * protection.
 */
export function endTurnUnboundQuestionV7(
  short: readonly ShortDaemonV7[],
): string {
  const [only] = short;
  return short.length === 1 && only !== undefined
    ? `The ${only.name} will be Unbound.`
    : `${short.length} daemons will be Unbound.`;
}

/** The label at a daemon an armed Channel may pick: its strands after. */
export function channelTargetLabelV7(preview: ChannelPreviewV7): string {
  return strandsTextV7(preview.strandsAfter, preview.control);
}

/**
 * The cursor's sentence for a Channel target. `unbound`: the daemon belongs
 * to nobody, and enough strands in one turn bind it again (section 6.5).
 */
export function channelTargetNameV7(
  daemon: string,
  preview: ChannelPreviewV7,
  unbound = false,
): string {
  const strands = preview.strandsAfter;
  const count = `${strands} ${strands === 1 ? "strand" : "strands"} of the ${preview.control} it needs`;
  return unbound
    ? `${BIND_LABEL_V7} this ${daemon}: ${count}. ${preview.binds ? "It is yours again" : "Still short"}.`
    : `Channel this ${daemon}: ${count}. ${preview.holds ? "It stays bound" : "Still short"}.`;
}

/** The label at a cultist an armed Anchor may grip. */
export function anchorTargetLabelV7(preview: AnchorPreviewV7): string {
  return strandsTextV7(preview.strandsAfter, preview.control);
}

/** The cursor's sentence for an Anchor target. */
export function anchorTargetNameV7(
  cultist: string,
  daemon: string,
  preview: AnchorPreviewV7,
): string {
  return `Grip this ${cultist}: its strand to the ${daemon} counts three (${preview.strandsAfter} of ${preview.control}). Hit that cultist and all three go.`;
}

/** The cursor's sentence for a cultist that may help a summoning. */
export function summonHelperNameV7(helper: string): string {
  return `This ${helper} helps and channels the Horror. Then choose the Horror's tile.`;
}

/** The cursor's sentence for a Summon tile. */
export function summonTileNameV7(favour: number): string {
  return `Summon the Horror here: ${favourCostTextV7(favour)}. Both cultists channel it.`;
}

/**
 * The label over a unit an aimed Boo! reaches, or null for a plain jump
 * (its arrow says it): a unit that cannot jump, a jump the viewer cannot
 * know, and a channeller whose strand the jump breaks.
 */
export function booEntryLabelV7(entry: BooPreviewEntryV7): string | null {
  if (entry.outcome === "STAYS") return "Stays";
  if (entry.holdsStrand) return "Strand breaks";
  return entry.outcome === "UNKNOWN" ? "?" : null;
}

/** "2 jump · 1 stays · 1 strand breaks": what an aimed Boo! would do. */
export function booSummaryV7(preview: BooPreviewV7): string {
  const count = (outcome: BooPreviewEntryV7["outcome"]): number =>
    preview.results.filter((entry) => entry.outcome === outcome).length;
  const breaks = preview.results.filter(
    (entry) => entry.holdsStrand && entry.outcome !== "STAYS",
  ).length;
  const jumps = count("JUMPS");
  const stays = count("STAYS");
  const unknown = count("UNKNOWN");
  return [
    jumps > 0 ? `${jumps} ${jumps === 1 ? "jumps" : "jump"}` : null,
    stays > 0 ? `${stays} ${stays === 1 ? "stays" : "stay"}` : null,
    unknown > 0 ? `${unknown} unknown` : null,
    breaks > 0
      ? `${breaks} ${breaks === 1 ? "strand breaks" : "strands break"}`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

function abilitiesOf(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly string[] {
  return unitRoleRuleV7(view, unit).abilities;
}

/**
 * Why the viewer's unit has no `kind` to use, or null when it is offered or
 * its button should not be shown at all (not its ability, not the viewer's
 * unit, or nothing on the board it could ever apply to). The reason is the
 * engine's own first failing rule.
 */
export function cultChannelUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  kind: CultChannelKindV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    unit.ownerId !== view.viewer.id ||
    !abilitiesOf(view, unit).includes(kind)
  )
    return null;
  const channel = channelOfV7(view);
  switch (kind) {
    case "SUMMON": {
      const helper = view.units.find((candidate) =>
        summonHelperLegalV7(view, unit, candidate),
      );
      // The Summoner's own tile is never a legal one, so the tile facts
      // are not read: every earlier rule answers first.
      const rejection = summonRejectionV7(
        view,
        {
          tile: () => undefined,
          occupied: () => true,
          chest: () => false,
          curiosity: () => false,
          allied: () => false,
        } as unknown as Parameters<typeof summonRejectionV7>[1],
        favourOfV7(view, view.viewer.id),
        unit,
        helper,
        unit.at,
      );
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return CHANNEL_ALREADY_ACTED_V7;
      if (rejection.code === "INSUFFICIENT_FAVOUR")
        return summonNeedsFavourTextV7(rejection.cost);
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      return rejection.reason === "HELPER"
        ? SUMMON_NO_HELPER_V7
        : SUMMON_NO_TILE_V7;
    }
    case "CHANNEL": {
      // A cultist with no daemon of its seat and no Unbound one in sight
      // has nothing to channel: no button.
      const daemons = view.units.filter(
        (candidate) =>
          daemonRoleV7(candidate) !== null &&
          (candidate.ownerId === unit.ownerId || unitIsUnboundV7(candidate)),
      );
      if (daemons.length === 0) return null;
      if (channel.strands.some((strand) => strand.cultistUnitId === unit.id))
        return CHANNEL_HOLDING_V7;
      const rejections = daemons.map((daemon) =>
        channelRejectionV7(view, unit, daemon),
      );
      if (rejections.includes(null)) return null;
      if (rejections.some((entry) => entry?.code === "UNIT_ROLE_INVALID"))
        return null;
      if (rejections.some((entry) => entry?.code === "UNIT_ALREADY_ACTED"))
        return CHANNEL_ALREADY_ACTED_V7;
      const reasons = rejections.flatMap((entry) =>
        entry?.code === "CHANNEL_NOT_LEGAL" ? [entry.reason] : [],
      );
      if (reasons.includes("EMBARKED")) return CHANNEL_EMBARKED_V7;
      // A Furious daemon in reach is the nearer miss than one out of it.
      if (reasons.includes("FURIOUS")) return CHANNEL_FURIOUS_V7;
      return reasons.includes("RANGE") ? CHANNEL_OUT_OF_REACH_V7 : null;
    }
    case "BEHOLD": {
      const rejection = beholdRejectionV7(view, unit);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return channel.idols.includes(unit.id)
          ? BEHOLD_RAISED_V7
          : CHANNEL_ALREADY_ACTED_V7;
      return rejection.reason === "RAISED"
        ? BEHOLD_RAISED_V7
        : CHANNEL_EMBARKED_V7;
    }
    case "ANCHOR": {
      // Nothing to grip while the seat channels nothing: no button.
      if (
        !channel.strands.some((strand) =>
          view.units.some(
            (candidate) =>
              candidate.id === strand.cultistUnitId &&
              candidate.ownerId === unit.ownerId,
          ),
        )
      )
        return null;
      const rejection = anchorRejectionV7(view, unit, undefined);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      return rejection.reason === "GRIPPING"
        ? ANCHOR_GRIPPING_V7
        : ANCHOR_NO_CULTIST_V7;
    }
    case "BOO": {
      const rejection = booRejectionV7(view, view.units, unit);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      return rejection.code === "UNIT_ALREADY_ACTED"
        ? CHANNEL_ALREADY_ACTED_V7
        : BOO_NOBODY_V7;
    }
  }
}

/** A status chip of the selected unit's card. */
export interface CultChannelChipV7 {
  readonly id:
    | "candlelit"
    | "gripped"
    | "gripping"
    | "idol"
    | "control"
    | "unbound"
    | "furious";
  /** The chip's word, or a daemon's "2 / 3". */
  readonly label: string;
  /** Its one sentence (the tooltip and the accessible name). */
  readonly status: string;
  /** The raster asked for; the chip shows its word alone without one. */
  readonly icon:
    | `ICON:STATUS:${"CANDLELIT" | "WARDED" | "UNBOUND" | "FURIOUS"}`
    | `ICON:ACTION:${"ANCHOR" | "CHANNEL"}`;
  /** A daemon short of its Control: the chip takes the loss colour. */
  readonly short?: true;
}

/**
 * The channel's chips on a visible unit's card, any owner's (the channel
 * is public): Candlelit and Gripped on a channeller, the Thing's grip, a
 * raised idol, a daemon's strands against its Control, Unbound and
 * Furious.
 */
export function cultChannelChipsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CultChannelChipV7[] {
  const channel = channelOfV7(view);
  const chips: CultChannelChipV7[] = [];
  if (channel.strands.some((strand) => strand.cultistUnitId === unit.id))
    chips.push({
      id: "candlelit",
      label: "Candlelit",
      status:
        "It channels a daemon, and everyone who has explored its tile sees it. Hurt, move, or hex it and the strand breaks",
      icon: "ICON:STATUS:CANDLELIT",
    });
  if (channel.grips.some((grip) => grip.cultistUnitId === unit.id))
    chips.push({
      id: "gripped",
      label: "Gripped",
      status:
        "The Thing grips it: its strand counts three. Hit it and all three go",
      icon: "ICON:ACTION:ANCHOR",
    });
  if (channel.grips.some((grip) => grip.thingUnitId === unit.id))
    chips.push({
      id: "gripping",
      label: "Grips",
      status:
        "It grips the cultist beside it. Move, freeze, or hex the Thing and the grip fails",
      icon: "ICON:ACTION:ANCHOR",
    });
  if (channel.idols.includes(unit.id))
    chips.push({
      id: "idol",
      label: "Idol raised",
      status:
        "Cultists beside it keep their strands when they lose HP, until someone hits the Idol Bearer",
      icon: "ICON:STATUS:WARDED",
    });
  const daemon = channel.daemons.find((entry) => entry.unitId === unit.id);
  const unbound = unitIsUnboundV7(unit);
  if (daemon !== undefined && !unbound) {
    const short = daemon.strands < daemon.control;
    chips.push({
      id: "control",
      label: strandsTextV7(daemon.strands, daemon.control),
      status: `${daemon.strands} of the ${daemon.control} ${daemon.control === 1 ? "strand" : "strands"} it needs. ${short ? "It will be Unbound at the start of its owner's turn" : "It stays bound"}`,
      icon: "ICON:ACTION:CHANNEL",
      ...(short ? { short: true as const } : {}),
    });
  }
  if (unbound) {
    chips.push({
      id: "unbound",
      label: "Unbound",
      status:
        "It belongs to nobody. It attacks the nearest unit, friend or foe, after every round",
      icon: "ICON:STATUS:UNBOUND",
    });
    const rampage = previewRampageV7(view, unit.id);
    if (rampage?.furious === true)
      chips.push({
        id: "furious",
        label: "Furious",
        status: "It broke loose this turn: nobody can channel it yet",
        icon: "ICON:STATUS:FURIOUS",
      });
    // Bind again (section 6.5): the viewer's strands on it this turn.
    if (rampage !== null && rampage.strands > 0)
      chips.push({
        id: "control",
        label: strandsTextV7(rampage.strands, rampage.control),
        status: `${rampage.strands} of the ${rampage.control} ${rampage.control === 1 ? "strand" : "strands"} that bind it again this turn`,
        icon: "ICON:ACTION:CHANNEL",
      });
  }
  return chips;
}

/**
 * The notice of a boundary's channel events (section 14.3), for what the
 * board alone might not explain: a daemon Unbound (the viewer's own, or one
 * the viewer saw), a daemon the viewer bound again, and the viewer's own
 * strands broken, with the cause of a single one. Null without one. It names no tile and no ID.
 */
export function cultChannelNoticePartsV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): readonly string[] {
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  const broken = events.filter(
    (event): event is Extract<PlayerEventV7, { kind: "STRAND_BROKEN" }> =>
      event.kind === "STRAND_BROKEN" && event.playerId === viewerId,
  );
  const [first] = broken;
  if (broken.length === 1 && first !== undefined)
    parts.push(`Strand broken: ${DISRUPTION_CAUSE_LABELS_V7[first.cause]}`);
  else if (broken.length > 1) parts.push(`${broken.length} strands broken`);
  for (const event of events) {
    if (event.kind === "DAEMON_BOUND" && event.playerId === viewerId) {
      const bound = after.units.find(
        (candidate) => candidate.id === event.unitId,
      );
      if (bound !== undefined)
        parts.push(`${unitRoleRuleV7(after, bound).label} bound again`);
    }
    if (event.kind !== "DAEMON_UNBOUND") continue;
    const unit = before.units.find(
      (candidate) => candidate.id === event.unitId,
    );
    const own = event.summonerPlayerId === viewerId;
    if (unit === undefined && !own) continue;
    const name =
      unit === undefined ? "daemon" : unitRoleRuleV7(before, unit).label;
    parts.push(`${own ? "Your" : "A"} ${name} is Unbound`);
  }
  return parts;
}
