import {
  CHANNEL_RANGE_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  bindingStrandsV7,
  holdingStrandsV7,
  previewAnchorV7,
  previewBeholdV7,
  previewBooV7,
  previewChannelV7,
  previewRampageV7,
  previewSummonV7,
  unitIsUnboundV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  ANCHOR_PICK_V7,
  CHANNEL_PICK_V7,
  SUMMON_HELPER_BADGE_V7,
  SUMMON_PICK_TILE_V7,
  WARDED_LABEL_V7,
  anchorTargetLabelV7,
  anchorTargetNameV7,
  booEntryLabelV7,
  channelOfV7,
  channelTargetLabelV7,
  channelTargetNameV7,
  summonHelperNameV7,
  summonTileNameV7,
} from "../cult-channel-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The channel's part of the board plan (bead `pulp_wars-mch9.18`;
 * docs/product/RULESET_7_CULTISTS.md section 14.3, docs/ui/BOARD_TARGETING.md
 * section 3.8).
 *
 * **Always on the board, for every viewer:** a strand from each channeller
 * to its daemon, a candle over every Candlelit unit, the Control pips under
 * every daemon, the Anchor tentacle, the chalk ring of a raised idol, and
 * the marks of an Unbound daemon. **While the unit is selected:** the ring a
 * Behold! would draw and the cultists it would ward. **While aimed:** the
 * helper and the tile of a Summon, the daemon of a Channel inside its
 * reach, the cultist of an Anchor, and where a Boo! sends each unit.
 *
 * Everything is read from the public view, the offered commands and the
 * public previews; whether a strand or a grip counts is asked of the
 * engine's own `holdingStrandsV7`.
 */

/** UNIT only: the channel marks of a visible unit (any owner). */
export interface CultUnitMarkersV7 {
  /** Candlelit: it holds a strand, or grips a channeller. */
  readonly candle?: true;
  /**
   * A daemon's holding strands against its Control: the pips under it.
   * `binding`: an Unbound daemon, whose pips are the viewer's strands on it
   * this turn (it is bound again when they fill; section 6.5).
   */
  readonly control?: {
    readonly control: number;
    readonly strands: number;
    readonly binding?: true;
  };
  /** An Unbound daemon: the broken collar. */
  readonly unbound?: true;
  /** A daemon that broke loose this turn: steam. */
  readonly furious?: true;
  /** The unit a loose daemon (or one that would break now) goes for. */
  readonly eye?: true;
}

/** LINK only: a line of the channel between two tiles. */
export type CultLinkV7 =
  | {
      readonly kind: "STRAND";
      /** False when the cultist is out of reach: it counts for nothing. */
      readonly holds: boolean;
    }
  | {
      readonly kind: "GRIP";
      /** False when the Thing no longer stands beside its cultist. */
      readonly holds: boolean;
    }
  | {
      /** An aimed Boo!: from a scared unit to the tile behind it. */
      readonly kind: "BOO_JUMP";
      readonly outcome: "JUMPS" | "STAYS" | "UNKNOWN";
    };

/** A channel action being aimed on the board. */
export type CultChannelPickV7 =
  | {
      readonly kind: "SUMMON";
      readonly unitId: UnitId;
      /** The cultist that helps; null while it is being chosen. */
      readonly helperUnitId: UnitId | null;
    }
  | { readonly kind: "CHANNEL"; readonly unitId: UnitId }
  | { readonly kind: "ANCHOR"; readonly unitId: UnitId }
  | { readonly kind: "BOO"; readonly unitId: UnitId };

const key = (at: CoordV7): string => `${at.x},${at.y}`;

type SummonCommandV7 = Extract<CommandV7, { kind: "SUMMON" }>;

/** The offered Summons of a Summoner. */
function summonCommandsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly SummonCommandV7[] {
  return commands.filter(
    (command): command is SummonCommandV7 =>
      command.kind === "SUMMON" && command.unitId === unitId,
  );
}

/** The cultists that may help the Summoner (each once, in command order). */
export function summonHelpersV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly UnitId[] {
  return [
    ...new Set(
      summonCommandsV7(commands, unitId).map((command) => command.helperUnitId),
    ),
  ];
}

/**
 * The channel marks of every visible unit that has one, by unit ID: one
 * pass over the view's channel lists (so a board without the Cult costs
 * four empty loops).
 */
export function cultUnitMarkersV7(
  view: PlayerViewV7,
): ReadonlyMap<UnitId, CultUnitMarkersV7> {
  const channel = channelOfV7(view);
  const markers = new Map<UnitId, CultUnitMarkersV7>();
  const mark = (unitId: UnitId, added: CultUnitMarkersV7): void => {
    markers.set(unitId, { ...markers.get(unitId), ...added });
  };
  for (const strand of channel.strands)
    mark(strand.cultistUnitId, { candle: true });
  // Section 6.2: a Thing that grips a channeller is Candlelit too.
  for (const grip of channel.grips) mark(grip.thingUnitId, { candle: true });
  // Section 6.4, "Public": the unit a daemon goes for as the board stands,
  // from the engine's rampage preview.
  const eye = (target: UnitId | null | undefined): void => {
    if (
      target !== null &&
      target !== undefined &&
      view.units.some((unit) => unit.id === target)
    )
      mark(target, { eye: true });
  };
  for (const daemon of channel.daemons) {
    mark(daemon.unitId, {
      control: { control: daemon.control, strands: daemon.strands },
    });
    // Section 6.4: a bound daemon that would break now shows its target.
    if (daemon.strands < daemon.control)
      eye(previewRampageV7(view, daemon.unitId)?.targetUnitId);
  }
  // An Unbound daemon is a neutral unit with an entry of its own
  // (`view.monsters`): only a board that has one asks for its rampage.
  for (const entry of view.monsters) {
    if (entry.unbound === undefined) continue;
    const rampage = previewRampageV7(view, entry.unitId);
    if (rampage === null) continue;
    mark(entry.unitId, {
      unbound: true,
      ...(rampage.furious ? { furious: true as const } : {}),
      // The pips of a binding: shown once the viewer holds a strand to it.
      ...(rampage.strands > 0
        ? {
            control: {
              control: rampage.control,
              strands: rampage.strands,
              binding: true as const,
            },
          }
        : {}),
    });
    eye(rampage.targetUnitId);
  }
  return markers;
}

/** The outline of a block of cells: each cell with its outer edges. */
function outlineEntries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  cells: readonly CoordV7[],
  style: "IDOL_RING" | "CHANNEL_RANGE" | "WARD_PREVIEW",
  prefix: string,
): void {
  const inside = cells.filter(
    (at) =>
      at.x >= 0 &&
      at.y >= 0 &&
      at.x < view.board.width &&
      at.y < view.board.height,
  );
  const area = new Set(inside.map(key));
  for (const at of inside)
    entries.push({
      key: `${prefix}:${key(at)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at,
      abilityStyle: style,
      targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
        (edge) =>
          !area.has(
            key({
              x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
              y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
            }),
          ),
      ),
    });
}

function square(centre: CoordV7, radius: number): CoordV7[] {
  const cells: CoordV7[] = [];
  for (let dy = -radius; dy <= radius; dy += 1)
    for (let dx = -radius; dx <= radius; dx += 1)
      cells.push({ x: centre.x + dx, y: centre.y + dy });
  return cells;
}

/**
 * The entries every viewer sees whatever is selected: each strand whose
 * daemon the viewer sees (a strand to an unseen daemon is its cultist's
 * candle alone), each grip, and the chalk ring of each raised idol.
 */
export function addCultChannelEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
): void {
  const channel = channelOfV7(view);
  if (
    channel.strands.length === 0 &&
    channel.grips.length === 0 &&
    channel.idols.length === 0
  )
    return;
  const unitById = new Map(view.units.map((unit) => [unit.id, unit]));
  for (const strand of channel.strands) {
    const cultist = unitById.get(strand.cultistUnitId);
    const daemon =
      strand.daemonUnitId === null
        ? undefined
        : unitById.get(strand.daemonUnitId);
    if (cultist === undefined || daemon === undefined) continue;
    // Whether this one strand counts, by the engine's own rule: for the
    // check of a bound daemon, or for the binding of an Unbound one.
    const alone = {
      ...view,
      cult: { ...view.cult, strands: [strand], grips: [] },
    };
    const holds =
      (unitIsUnboundV7(daemon)
        ? bindingStrandsV7(alone, view.units, daemon, cultist.ownerId)
        : holdingStrandsV7(alone, view.units, daemon)) > 0;
    entries.push({
      key: `cult-strand:${cultist.id}`,
      kind: "LINK",
      layer: 6,
      at: cultist.at,
      linkTo: daemon.at,
      label: CULT_LINK_LABEL_V7,
      cultLink: { kind: "STRAND", holds },
    });
  }
  for (const grip of channel.grips) {
    const thing = unitById.get(grip.thingUnitId);
    const cultist = unitById.get(grip.cultistUnitId);
    if (thing === undefined || cultist === undefined) continue;
    const strand = channel.strands.find(
      (entry) => entry.cultistUnitId === cultist.id,
    );
    const daemon =
      strand === undefined || strand.daemonUnitId === null
        ? undefined
        : unitById.get(strand.daemonUnitId);
    // The grip counts when it adds to its cultist's one strand.
    const gripped =
      strand === undefined
        ? undefined
        : {
            ...view,
            cult: { ...view.cult, strands: [strand], grips: [grip] },
          };
    const holds =
      daemon === undefined ||
      gripped === undefined ||
      (unitIsUnboundV7(daemon)
        ? bindingStrandsV7(gripped, view.units, daemon, cultist.ownerId)
        : holdingStrandsV7(gripped, view.units, daemon)) > 1;
    entries.push({
      key: `cult-grip:${thing.id}`,
      kind: "LINK",
      layer: 6,
      at: thing.at,
      linkTo: cultist.at,
      label: CULT_LINK_LABEL_V7,
      cultLink: { kind: "GRIP", holds },
    });
  }
  for (const unitId of channel.idols) {
    const bearer = unitById.get(unitId);
    if (bearer !== undefined)
      outlineEntries(
        entries,
        view,
        square(bearer.at, 1),
        "IDOL_RING",
        `cult-idol:${unitId}`,
      );
  }
}

/** The `label` of every Cult LINK entry (its `cultLink` says which). */
export const CULT_LINK_LABEL_V7 = "CULT_LINK";

/**
 * Previews of the selected unit with nothing aimed: the ring an offered
 * Behold! would raise and each cultist it would ward (the broken Help ring
 * of an area support: marked, not picked).
 */
export function addCultChannelPreviewsV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number,
): void {
  const bearer = view.units.find((unit) => unit.id === selectedUnitId);
  // A cultist with exactly one daemon in reach channels it from its button
  // (nothing to pick): the daemon is marked, with its strands after.
  const channels = commands.filter(
    (command): command is Extract<CommandV7, { kind: "CHANNEL" }> =>
      command.kind === "CHANNEL" && command.unitId === selectedUnitId,
  );
  const [only] = channels;
  if (channels.length === 1 && only !== undefined) {
    const daemon = view.units.find((unit) => unit.id === only.daemonUnitId);
    const preview = previewChannelV7(view, only.unitId, only.daemonUnitId);
    if (daemon !== undefined && preview !== null)
      entries.push({
        key: `ability-target:CHANNEL_ONLY:${daemon.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: daemon.at,
        abilityStyle: "RALLY",
        areaSupport: "QUIET",
        label: channelTargetLabelV7(preview),
      });
  }
  if (
    bearer === undefined ||
    !commands.some(
      (command) => command.kind === "BEHOLD" && command.unitId === bearer.id,
    )
  )
    return;
  const preview = previewBeholdV7(view, bearer.id);
  if (preview === null) return;
  outlineEntries(
    entries,
    view,
    square(bearer.at, 1),
    "WARD_PREVIEW",
    `ability-area:WARD_PREVIEW:${selectedUnitId}`,
  );
  for (const unitId of preview.wardedUnitIds) {
    const cultist = view.units.find((unit) => unit.id === unitId);
    if (cultist !== undefined)
      entries.push({
        key: `ability-target:WARD_PREVIEW:${unitId}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: cultist.at,
        abilityStyle: "WARD_PREVIEW",
        areaSupport: "QUIET",
        label: WARDED_LABEL_V7,
      });
  }
}

/** The map targets of an aimed channel action: offered commands only. */
export function cultChannelPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: CultChannelPickV7,
): MapCommandTargetV7[] {
  const unitById = (id: UnitId) => view.units.find((unit) => unit.id === id);
  const name = (id: UnitId): string => {
    const unit = unitById(id);
    return unit === undefined ? "unit" : unitRoleRuleV7(view, unit).label;
  };
  // "Horror", also for an Unbound one (its unit reads "Unbound Horror").
  const daemonName = (daemon: PlayerViewV7["units"][number]): string =>
    daemon.summoned === undefined
      ? name(daemon.id)
      : CULT_SUMMONED_ROLE_RULES_V7[daemon.summoned].label;
  if (pick.kind === "SUMMON") {
    const summons = summonCommandsV7(commands, pick.unitId);
    if (pick.helperUnitId === null)
      return summonHelpersV7(commands, pick.unitId).flatMap(
        (id): MapCommandTargetV7[] => {
          const helper = unitById(id);
          const command = summons.find((entry) => entry.helperUnitId === id);
          return helper === undefined || command === undefined
            ? []
            : [
                {
                  at: helper.at,
                  command,
                  family: "SUMMON_HELPER",
                  previewLabel: SUMMON_HELPER_BADGE_V7,
                  semanticLabel: summonHelperNameV7(name(id)),
                },
              ];
        },
      );
    return summons
      .filter((command) => command.helperUnitId === pick.helperUnitId)
      .flatMap((command): MapCommandTargetV7[] => {
        const preview = previewSummonV7(
          view,
          command.unitId,
          command.helperUnitId,
          command.at,
        );
        return preview === null
          ? []
          : [
              {
                at: command.at,
                command,
                family: "SUMMON",
                // No label per tile: the button carries the price.
                semanticLabel: `${summonTileNameV7(preview.favour)} ${SUMMON_PICK_TILE_V7}`,
              },
            ];
      });
  }
  if (pick.kind === "CHANNEL")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "CHANNEL" || command.unitId !== pick.unitId)
        return [];
      const daemon = unitById(command.daemonUnitId);
      const preview = previewChannelV7(
        view,
        command.unitId,
        command.daemonUnitId,
      );
      return daemon === undefined || preview === null
        ? []
        : [
            {
              at: daemon.at,
              command,
              family: "CHANNEL",
              previewLabel: channelTargetLabelV7(preview),
              semanticLabel: `${channelTargetNameV7(daemonName(daemon), preview, unitIsUnboundV7(daemon))} ${CHANNEL_PICK_V7}`,
            },
          ];
    });
  if (pick.kind === "ANCHOR")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "ANCHOR" || command.unitId !== pick.unitId)
        return [];
      const cultist = unitById(command.cultistUnitId);
      const preview = previewAnchorV7(
        view,
        command.unitId,
        command.cultistUnitId,
      );
      return cultist === undefined || preview === null
        ? []
        : [
            {
              at: cultist.at,
              command,
              family: "ANCHOR",
              previewLabel: anchorTargetLabelV7(preview),
              semanticLabel: `${anchorTargetNameV7(name(cultist.id), daemonName(unitById(preview.daemonUnitId) ?? cultist), preview)} ${ANCHOR_PICK_V7}`,
            },
          ];
    });
  // Boo! has no target: its one confirmation is in the dock.
  return [];
}

/**
 * Preview entries of an aimed channel action that are not targets: the
 * reach of a Channel (the tiles within `CHANNEL_RANGE_V7`), the chosen
 * helper of a Summon, and a Boo!'s jumps: an arrow per scared unit and a
 * label on each that stays, is unknown, or loses its strand.
 */
export function addCultChannelPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  pick: CultChannelPickV7,
): void {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return;
  if (pick.kind === "CHANNEL") {
    outlineEntries(
      entries,
      view,
      square(actor.at, CHANNEL_RANGE_V7),
      "CHANNEL_RANGE",
      `ability-area:CHANNEL_RANGE:${actor.id}`,
    );
    return;
  }
  if (pick.kind === "SUMMON") {
    const helper =
      pick.helperUnitId === null
        ? undefined
        : view.units.find((unit) => unit.id === pick.helperUnitId);
    if (helper !== undefined)
      entries.push({
        key: `ability-target:SUMMON_HELPER:${helper.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: helper.at,
        abilityStyle: "RALLY",
        areaSupport: "PROMINENT",
        label: SUMMON_HELPER_BADGE_V7,
      });
    return;
  }
  if (pick.kind !== "BOO") return;
  const preview = previewBooV7(view, actor.id);
  if (preview === null) return;
  for (const result of preview.results) {
    entries.push({
      key: `cult-boo:${result.unitId}`,
      kind: "LINK",
      layer: 7.5,
      at: result.from,
      linkTo: result.to,
      label: CULT_LINK_LABEL_V7,
      cultLink: { kind: "BOO_JUMP", outcome: result.outcome },
    });
    const label = booEntryLabelV7(result);
    if (label !== null)
      entries.push({
        key: `ability-target:BOO:${result.unitId}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: result.from,
        // Grey for a unit that stays, the warning stripes for a strand the
        // jump breaks, the pale cream of an unowned cue for an unknown.
        abilityStyle:
          result.outcome === "STAYS"
            ? "MARTIAN_BLOCKED"
            : result.holdsStrand
              ? "BLAST_FRIENDLY"
              : "BLAST",
        label,
      });
  }
}
