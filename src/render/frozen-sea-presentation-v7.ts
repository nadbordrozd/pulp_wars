import {
  FISHING_HOLE_POPULATION_V7,
  ICE_SEA_DOG_UNITS_V7,
  queryAlliedV7,
  unitCracksIceV7,
  unitIsFrozenV7,
  unitMayActAfterMoveV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type CrackIcePreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicIceTileV7,
  type PublicUnitV7,
} from "../engine/index";
import { playerSubjectV7 } from "./player-names-v7";

/**
 * The frozen sea interface (bead pulp_wars-5ti.7, second part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 8, 14.1 and 14.2): the
 * words of Freeze (the one Freeze effect, `pulp_wars-xv0t`, 7r133: the
 * `FREEZE` command and Hoarfrost's line are gone), the ice, skating,
 * Runners, the Fishing Hole dive (the forced slide before
 * `pulp_wars-s55m.2`; the slip of every other unit before `pulp_wars-y242`,
 * 7r132), who walks on ice, Black Ice and Glacier, shared by
 * the dock, the board plan, Help, the
 * technology cards and the Gallery. Every number is read from the engine's
 * constants, public previews, public unit stats and the view's ice list.
 */

export const FREEZE_LABEL_V7 = "Freeze";
export const ICE_LABEL_V7 = "Ice";
/** Ice Folk movement (`pulp_wars-s55m.2`): skating, Runners, the dive. */
export const SKATE_LABEL_V7 = "Skate";
export const RUNNERS_LABEL_V7 = "Runners";
export const DIVE_LABEL_V7 = "Dive";
export const BLACK_ICE_LABEL_V7 = "Black Ice";
export const GLACIER_LABEL_V7 = "Glacier";
export const ICE_COVER_LABEL_V7 = "Ice cover";

/**
 * One short sentence each (RULESET_7_ICE_REDESIGN.md section 2.2, the
 * frozen sea redesign: the ice stays until it is cracked).
 */
/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.1): the glossary's
 * and Help's line.
 */
export const FREEZE_RULE_V7 =
  "Freezing a tile turns water to ice and open land to Snow; an enemy on it is Frozen for a turn.";
export const SKATE_RULE_V7 =
  "Ice Folk units skate: each step onto ice costs half a move.";
export const RUNNERS_RULE_V7 =
  "Sleds and Snow Hunters glide free in a straight line on ice and may stop anywhere; a Sled glides on past enemies.";
export const DIVE_RULE_V7 = `Fishing Hole: +${FISHING_HOLE_POPULATION_V7} population. A unit on your Fishing Hole that has not moved may dive to any other free Fishing Hole of yours as its move.`;
/**
 * Fishing Hole links (`pulp_wars-vg5l`, 7r127): the Ice Folk sea link.
 */
export const HOLE_LINKS_LABEL_V7 = "Hole links";
export const HOLE_LINKS_RULE_V7 =
  "With Rime, Fishing Holes of two of your cities up to five tiles of water or ice apart link them as Ports do: a city joined to your capital gets +1 population, the capital +1 for each. An enemy on a hole breaks its links.";
/**
 * Only the Ice Folk walk on ice (`pulp_wars-y242`, 7r132; the slip, "Any
 * other unit may walk onto ice, but its Move ends there", before).
 */
export const ICE_WALKERS_LABEL_V7 = "Who walks on ice";
export const ICE_WALKERS_RULE_V7 =
  "Only Ice Folk units and units that fly or stride go onto ice. Every other land unit stops at its edge and may crack it instead.";
export const ICE_STAYS_RULE_V7 =
  "Ice never melts; it is gone only when someone cracks it.";
export const NO_SHIPS_RULE_V7 =
  "Ships cannot enter ice; the Ice Folk have no ships at all.";
export const BLACK_ICE_RULE_V7 = "An enemy that steps onto your ice is Frozen.";
export const GLACIER_RULE_V7 =
  "Your ice is thick: other players must Crack Ice twice to break it, and your freezes mend a crack. Your units on it have cover.";
/** The border freeze (`pulp_wars-5ti.31`). */
export const BORDER_ICE_LABEL_V7 = "Border ice";
export const BORDER_ICE_RULE_V7 =
  "With Rime, the water inside your borders turns to ice, and again whenever a city's borders grow.";
export const CRACK_ICE_LABEL_V7 = "Crack Ice";
export const CRACK_ICE_RULE_V7 =
  "Any other land unit or ship next to ice may break one tile of it back into water, unless a unit stands on it or it is built on (your own iced-over dock you may crack). Units that fly or stride cross ice instead.";
export const ICE_BUILD_RULE_V7 =
  "The Ice Folk build Fishing Holes, mills, Workshop, Market and Monument on their own ice. They build no harbours.";

/** The frozen sea's rules, in reading order (the Ice Folk tech cards' "?"). */
export const ICE_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [FREEZE_LABEL_V7, FREEZE_RULE_V7],
  [SKATE_LABEL_V7, SKATE_RULE_V7],
  [RUNNERS_LABEL_V7, RUNNERS_RULE_V7],
  [DIVE_LABEL_V7, DIVE_RULE_V7],
  [HOLE_LINKS_LABEL_V7, HOLE_LINKS_RULE_V7],
  [ICE_WALKERS_LABEL_V7, ICE_WALKERS_RULE_V7],
  ["Ice stays", ICE_STAYS_RULE_V7],
  [BORDER_ICE_LABEL_V7, BORDER_ICE_RULE_V7],
  [CRACK_ICE_LABEL_V7, CRACK_ICE_RULE_V7],
  ["Build", ICE_BUILD_RULE_V7],
  ["No ships", NO_SHIPS_RULE_V7],
  [BLACK_ICE_LABEL_V7, BLACK_ICE_RULE_V7],
  [GLACIER_LABEL_V7, GLACIER_RULE_V7],
];

/** Help "At sea", one line for every other faction in a match with ice. */
export const ICE_FOR_SHIPS_HELP_V7: readonly [string, string] = [
  ICE_LABEL_V7,
  "The Ice Folk freeze the sea. Only their units and units that fly or stride go onto ice; ships and other land units cannot, and may crack it open from beside it.",
];

/**
 * The technology card's lines (no trailing full stop, as its other lines).
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): Rime and Pack Ice decide
 * what water the seat's freezes (a Cold Snap, a Cold Wake, the border)
 * make ice of.
 */
export const FREEZE_SHALLOW_UNLOCK_V7 = `${ICE_LABEL_V7}: your freezes make ice on shallow water, and the water inside your borders freezes now and whenever they grow`;
/** The border freeze (`pulp_wars-5ti.31`): the Ice Folk Land Grant line. */
export const ICE_LAND_GRANT_UNLOCK_V7 =
  "Land Grant: with Rime, the water inside the city's borders, old and new, freezes";
export const FREEZE_DEEP_UNLOCK_V7 = `${ICE_LABEL_V7}: your freezes make ice on deep water too`;
export const BLACK_ICE_UNLOCK_V7 = `${BLACK_ICE_LABEL_V7}: an enemy that steps onto your ice is Frozen`;
/**
 * The frozen sea redesign (RULESET_7_ICE_REDESIGN.md section 2.5): Glacier
 * makes the ice thick instead of lasting longer. Bead pulp_wars-5ti.30: the
 * line names the other players' Crack Ice, so "thick" is not read as the
 * old melting ice.
 */
export function glacierUnlockTextV7(): string {
  return `${GLACIER_LABEL_V7}: your ice is thick: other players must Crack Ice twice to break it, and your freezes mend a crack; your units on it have cover`;
}
export const ICE_NO_SHIPS_NOTE_V7 = "The Ice Folk build no ships";

/**
 * The reasons a unit cannot act (Crack Ice's; the `FREEZE` button and its
 * aiming panel went with the command, `pulp_wars-xv0t`, 7r133).
 */
export const FREEZE_ALREADY_ACTED_V7 = "Already acted this turn";
export const FREEZE_FROZEN_MOVED_V7 = "Frozen: it cannot act this turn";

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): the board label of a
 * ring freeze (a Cold Snap, a Cold Wake): "Ice 2 · Snow 3", or "" when it
 * freezes no tile.
 */
export function freezeRingLabelV7(tiles: number, snow: number): string {
  return [
    ...(tiles > 0 ? [`${ICE_LABEL_V7} ${tiles}`] : []),
    ...(snow > 0 ? [`Snow ${snow}`] : []),
  ].join(" · ");
}

/** Whether the unit is the Ice Witch (the role with the Blizzard). */
export function freezesRingV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
    "BLIZZARD",
  );
}

/** The ice entry of a tile the viewer has explored, or undefined. */
export function iceOnTileV7(
  view: Pick<PlayerViewV7, "ice">,
  at: CoordV7,
): PublicIceTileV7 | undefined {
  return view.ice.find((entry) => entry.at.x === at.x && entry.at.y === at.y);
}

/**
 * Crack Ice (the frozen sea redesign, RULESET_7_ICE_REDESIGN.md sections
 * 2.9 and 4.1): the dock's one button of every unit and ship of another
 * faction that stands next to ice, its aiming, its targets' labels and its
 * reasons.
 */
export const CRACK_ICE_TOOLTIP_V7 =
  "Break the ice next to this unit back into open water";
export const CRACK_ICE_PICK_V7 = "Choose a highlighted ice tile to crack";
export const CRACK_ICE_BREAK_LABEL_V7 = "Break";
export const CRACK_ICE_CRACK_LABEL_V7 = "Crack · 1 more breaks it";
/** Ice Folk freeze rework (`pulp_wars-s55m.1`): an own iced-over dock. */
export const CRACK_ICE_DOCK_LABEL_V7 = "Open the dock";
export const CRACK_ICE_DOCK_LATER_LABEL_V7 = "Crack · 1 more opens it";
export const CRACK_ICE_FROZEN_V7 = FREEZE_FROZEN_MOVED_V7;
export const CRACK_ICE_ALREADY_ACTED_V7 = FREEZE_ALREADY_ACTED_V7;
export const CRACK_ICE_MOVED_V7 = "It moved this turn";
export const CRACK_ICE_OCCUPIED_V7 = "A unit stands on that ice";
export const CRACK_ICE_BUILT_V7 = "Built on: Pillage it instead";

/**
 * Whether the unit cracks ice: not an Ice Folk unit, and no walker or flyer
 * (those cross the ice, `pulp_wars-y242`).
 */
export function unitHasCrackIceV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unitCracksIceV7(view, unit);
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * The ice tiles beside a unit it could crack but for what stands on them:
 * explored ice that is the viewer's own or not an ally's.
 */
function crackableIceBesideV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly PublicIceTileV7[] {
  return view.ice.filter(
    (entry) =>
      chebyshev(entry.at, unit.at) === 1 &&
      (entry.ownerId === view.viewer.id ||
        !queryAlliedV7(view, view.viewer.id, entry.ownerId)),
  );
}

/**
 * Why an own unit next to crackable ice has no Crack Ice to use, from the
 * rejection rows of section 2.9 in order: Frozen, already acted (or moved,
 * for a role that cannot act after moving), a unit on the ice, a building
 * on it (but an own or allied dock). Null when Crack Ice is offered, for an
 * Ice Folk unit, off the viewer's turn, and for a unit with no such ice
 * beside it (no button is shown then).
 */
export function crackIceUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    view.ice.length === 0 ||
    unit.ownerId !== view.viewer.id ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    !unitHasCrackIceV7(view, unit)
  )
    return null;
  const beside = crackableIceBesideV7(view, unit);
  if (beside.length === 0) return null;
  if (unitIsFrozenV7(view, unit)) return CRACK_ICE_FROZEN_V7;
  // `handled` alone (a Wait, a Move) leaves the primary action unused.
  if (
    unit.activation.attacked ||
    unit.activation.specialActed ||
    unit.activation.recovered ||
    unit.activation.captured
  )
    return CRACK_ICE_ALREADY_ACTED_V7;
  if (unit.activation.moved && !unitMayActAfterMoveV7(view, unit))
    return CRACK_ICE_MOVED_V7;
  const occupied = (at: CoordV7): boolean =>
    view.units.some(
      (other) => other.hp > 0 && other.at.x === at.x && other.at.y === at.y,
    );
  if (beside.some((entry) => occupied(entry.at))) return CRACK_ICE_OCCUPIED_V7;
  const built = (at: CoordV7): boolean =>
    view.board.tiles.some(
      (tile) =>
        tile.at.x === at.x &&
        tile.at.y === at.y &&
        tile.explored &&
        tile.improvement !== null &&
        !(
          (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
          tile.territoryOwnerId !== null &&
          (tile.territoryOwnerId === view.viewer.id ||
            queryAlliedV7(view, view.viewer.id, tile.territoryOwnerId))
        ),
    );
  if (beside.some((entry) => built(entry.at))) return CRACK_ICE_BUILT_V7;
  return CRACK_ICE_ALREADY_ACTED_V7;
}

/** What an offered Crack Ice does, for its board label and its sentence. */
export interface CrackIceOutcomeV7 {
  /** The ice breaks into open water (else thick ice takes its first crack). */
  readonly broken: boolean;
  /**
   * Ice Folk freeze rework (`pulp_wars-s55m.1`): the tile is an own or
   * allied dock a hostile Freeze iced over: the target wears the Help mark
   * (opened now, or by the next crack of thick ice).
   */
  readonly dock: boolean;
}

/** The exact outcome of an offered Crack Ice (`previewCrackIceV7`). */
export function crackIceOutcomeV7(
  view: PlayerViewV7,
  preview: CrackIcePreviewV7,
): CrackIceOutcomeV7 {
  const tile = view.board.tiles.find(
    (candidate) =>
      candidate.at.x === preview.at.x && candidate.at.y === preview.at.y,
  );
  const dock =
    tile?.explored === true &&
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD");
  return { broken: preview.broken, dock };
}

/**
 * The board label of a Crack Ice: "Break", "Crack · 1 more breaks it", and
 * over an own or allied iced-over dock "Open the dock" or "Crack · 1 more
 * opens it".
 */
export function crackIceTargetLabelV7(outcome: CrackIceOutcomeV7): string {
  if (outcome.dock)
    return outcome.broken
      ? CRACK_ICE_DOCK_LABEL_V7
      : CRACK_ICE_DOCK_LATER_LABEL_V7;
  return outcome.broken ? CRACK_ICE_BREAK_LABEL_V7 : CRACK_ICE_CRACK_LABEL_V7;
}

/** The sentence of a Crack Ice for the cursor description. */
export function crackIceOutcomeTextV7(outcome: CrackIceOutcomeV7): string {
  const result = outcome.broken
    ? "The ice breaks into open water"
    : "The thick ice cracks; one more Crack breaks it";
  const dock = outcome.dock && outcome.broken ? ": the dock is open again" : "";
  return `${CRACK_ICE_LABEL_V7}: ${result}${dock}.`;
}

/** The ice chip of the tile dock: "Ice", "Ice · thick" or "Ice · cracked". */
export function iceChipLabelV7(ice: PublicIceTileV7): string {
  return ice.cracked
    ? `${ICE_LABEL_V7} · cracked`
    : ice.thick
      ? `${ICE_LABEL_V7} · thick`
      : ICE_LABEL_V7;
}

/**
 * The ice chip's tooltip (the frozen sea redesign, section 4.1): what ice
 * is, how thick it is, and Black Ice. No countdown: ice is permanent.
 */
export function iceChipTooltipV7(
  view: PlayerViewV7,
  ice: PublicIceTileV7,
): string {
  const own = ice.ownerId === view.viewer.id;
  const thickness = ice.cracked
    ? " Cracked: one more Crack breaks it."
    : ice.thick
      ? " Thick: two Cracks break it."
      : "";
  const blackIce =
    own && viewerHasBlackIceV7(view)
      ? ` ${BLACK_ICE_LABEL_V7}: an enemy that steps onto it is Frozen.`
      : "";
  return `${ICE_LABEL_V7}: only Ice Folk units and units that fly or stride go onto it; other units crack it. Ice Folk skate (half a move).${thickness}${blackIce}`;
}

/**
 * The cracks of an ice tile (the frozen sea redesign, section 4.1): 0 for
 * sound ice, 2 for cracked thick ice (no melting stages: ice is permanent).
 */
export function iceCrackStageV7(
  ice: Pick<PublicIceTileV7, "cracked">,
): 0 | 1 | 2 | 3 {
  return ice.cracked ? 2 : 0;
}

/** Whether the viewer's own ice is Black Ice (a seat-level capability). */
export function viewerHasBlackIceV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).blackIce;
}

/** The marks of a Move on ice (Ice Folk movement, `pulp_wars-s55m.2`). */
export const SKATE_TRAIL_LABEL_V7 = "Skate: across the ice";
/**
 * Ice Folk movement (`pulp_wars-s55m.2`; Glacier's +1 Move before): the
 * mark of a tile only skating or a Runners glide reaches, and of a Fishing
 * Hole dive (the legend and the cursor description).
 */
export const SKATE_MOVE_LABEL_V7 = "Skate: ice costs half a move";
export const DIVE_MOVE_LABEL_V7 =
  "Dive: through your Fishing Holes, as the whole move";

export const ICE_COVER_PREVIEW_V7 = ICE_COVER_LABEL_V7;
export const ICE_COVER_TOOLTIP_V7 = `${ICE_COVER_LABEL_V7}: light cover on its own ice (${GLACIER_LABEL_V7})`;
export const ON_ICE_LABEL_V7 = "On ice";
/**
 * Bead pulp_wars-2yc.63: who slides on ice, in the tooltip of a tile's ice
 * chip (a unit card no longer says "On ice").
 */
export const ICE_MOVE_TEXT_V7 =
  "Ice Folk skate across ice at half a move a tile; units that fly or stride cross it like land; no other unit goes onto it.";

/** The frozen-sea lines of an attack preview: cover on ice. */
export function frozenSeaCombatNotesV7(
  preview: CombatPreviewV7,
): readonly string[] {
  return preview.iceCover ? [ICE_COVER_PREVIEW_V7] : [];
}

/** The Ice Folk goal of Sea Dog (section 8.11). */
export const ICE_SEA_DOG_GOAL_V7 = `Hold the ice with ${ICE_SEA_DOG_UNITS_V7} units at once.`;

function subject(view: PlayerViewV7, playerId: number): string {
  return playerSubjectV7(view, playerId);
}

/**
 * The notice of a boundary's frozen-sea events: a Freeze, a Crack, and a
 * Move stopped at the edge of ice the unit did not know of (it may not go
 * onto it, `pulp_wars-y242`; it slipped onto it before). Null without
 * one (a ship a Freeze Froze is told by the `UNITS_FROZEN` notice). No
 * text names a tile.
 */
export function frozenSeaBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id);
  for (const event of events) {
    if (event.kind === "TILES_FROZEN") {
      // The one Freeze effect (`pulp_wars-xv0t`): the water iced and the
      // land snowed (`WATER_FROZEN` before).
      const count = event.tiles.length + event.snow.length;
      const tiles = `${count} ${count === 1 ? "tile" : "tiles"}`;
      parts.push(`${subject(after, event.playerId)} froze ${tiles}`);
    } else if (event.kind === "ICE_CRACKED") {
      // The frozen sea redesign (section 4.1): a Crack broke or cracked a
      // tile.
      parts.push(event.broken ? "The ice broke" : "The ice cracked");
      const owner = before.ice.find(
        (entry) => entry.at.x === event.at.x && entry.at.y === event.at.y,
      )?.ownerId;
      if (owner === after.viewer.id && event.playerId !== after.viewer.id)
        toast = true;
    } else if (
      event.kind === "UNIT_MOVE_INTERRUPTED" &&
      event.reason === "ICE"
    ) {
      const unit = unitById(event.unitId);
      if (unit?.ownerId === after.viewer.id) {
        parts.push("Ice: the Move stopped at its edge");
        toast = true;
      }
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
