import {
  FISHING_HOLE_POPULATION_V7,
  ICE_SEA_DOG_UNITS_V7,
  queryAlliedV7,
  unitCracksIceV7,
  unitIsFrozenV7,
  unitMayActAfterMoveV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type CrackIcePreviewV7,
  type FreezePreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicIceTileV7,
  type PublicUnitV7,
} from "../engine/index";
import { playerSubjectV7 } from "./player-names-v7";

/**
 * The frozen sea interface (bead pulp_wars-5ti.7, second part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 8, 14.1 and 14.2): the
 * words of Freeze, the ice, skating, Runners, the Fishing Hole dive (the
 * forced slide before `pulp_wars-s55m.2`) and the slip, Hoarfrost (Icebound
 * and the crush before `pulp_wars-s55m.1`), Black Ice and Glacier, shared by
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
export const SLIP_LABEL_V7 = "Slip";
/** Ice Folk freeze rework (`pulp_wars-s55m.1`): the node Icebound was. */
export const HOARFROST_LABEL_V7 = "Hoarfrost";
export const BLACK_ICE_LABEL_V7 = "Black Ice";
export const GLACIER_LABEL_V7 = "Glacier";
export const ICE_COVER_LABEL_V7 = "Ice cover";

/**
 * One short sentence each (RULESET_7_ICE_REDESIGN.md section 2.2, the
 * frozen sea redesign: the ice stays until it is cracked).
 */
export const FREEZE_RULE_V7 =
  "A unit turns the water next to it to ice, two tiles out in a straight line; a ship in the way is Frozen instead. The Ice Witch's Cold Snap freezes every tile around her.";
export const SKATE_RULE_V7 =
  "Ice Folk units skate: each step onto ice costs half a move.";
export const RUNNERS_RULE_V7 =
  "Sleds and Snow Hunters glide free in a straight line on ice and may stop anywhere; a Sled glides on past enemies.";
export const DIVE_RULE_V7 = `Fishing Hole: +${FISHING_HOLE_POPULATION_V7} population. A unit on your Fishing Hole that has not moved may dive to any other free Fishing Hole of yours as its move.`;
export const SLIP_RULE_V7 =
  "Any other unit may walk onto ice, but its Move ends there.";
export const ICE_STAYS_RULE_V7 =
  "Ice never melts; it is gone only when someone cracks it.";
export const NO_SHIPS_RULE_V7 =
  "Ships cannot enter ice; the Ice Folk have no ships at all.";
export const BLACK_ICE_RULE_V7 = "An enemy that steps onto your ice is Frozen.";
export const HOARFROST_RULE_V7 =
  "Your units' Freeze reaches three tiles in a line.";
export const GLACIER_RULE_V7 =
  "Your ice is thick: other players must Crack Ice twice to break it, and your Freeze mends a crack. Your units on it have cover.";
/** The border freeze (`pulp_wars-5ti.31`). */
export const BORDER_ICE_LABEL_V7 = "Border ice";
export const BORDER_ICE_RULE_V7 =
  "With Rime, the water inside your borders turns to ice, and again whenever a city's borders grow.";
export const CRACK_ICE_LABEL_V7 = "Crack Ice";
export const CRACK_ICE_RULE_V7 =
  "Any other unit or ship next to ice may break one tile of it back into water, unless a unit stands on it or it is built on (your own iced-over dock you may crack).";
export const ICE_BUILD_RULE_V7 =
  "The Ice Folk build Fishing Holes, mills, Workshop, Market and Monument on their own ice. They build no harbours.";

/** The frozen sea's rules, in reading order (the Ice Folk tech cards' "?"). */
export const ICE_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [FREEZE_LABEL_V7, FREEZE_RULE_V7],
  [SKATE_LABEL_V7, SKATE_RULE_V7],
  [RUNNERS_LABEL_V7, RUNNERS_RULE_V7],
  [DIVE_LABEL_V7, DIVE_RULE_V7],
  ["Ice stays", ICE_STAYS_RULE_V7],
  [BORDER_ICE_LABEL_V7, BORDER_ICE_RULE_V7],
  [CRACK_ICE_LABEL_V7, CRACK_ICE_RULE_V7],
  ["Build", ICE_BUILD_RULE_V7],
  ["No ships", NO_SHIPS_RULE_V7],
  [BLACK_ICE_LABEL_V7, BLACK_ICE_RULE_V7],
  [HOARFROST_LABEL_V7, HOARFROST_RULE_V7],
  [GLACIER_LABEL_V7, GLACIER_RULE_V7],
];

/** Help "At sea", one line for every other faction in a match with ice. */
export const ICE_FOR_SHIPS_HELP_V7: readonly [string, string] = [
  ICE_LABEL_V7,
  "The Ice Folk freeze the sea. Ships cannot enter ice; land units may walk onto it, one tile a turn; any unit or ship beside it may crack it open.",
];

/** The technology card's lines (no trailing full stop, as its other lines). */
export const FREEZE_SHALLOW_UNLOCK_V7 = `${FREEZE_LABEL_V7}: units turn Shallow Water next to them to ice, two tiles in a line (the Ice Witch's Cold Snap: all around her), and skate across it; a ship in the way is Frozen; the water inside your borders freezes now and whenever they grow`;
/** The border freeze (`pulp_wars-5ti.31`): the Ice Folk Land Grant line. */
export const ICE_LAND_GRANT_UNLOCK_V7 =
  "Land Grant: with Rime, the water inside the city's borders, old and new, freezes";
export const FREEZE_DEEP_UNLOCK_V7 = `${FREEZE_LABEL_V7}: Deep Water freezes too`;
export const HOARFROST_UNLOCK_V7 = `${HOARFROST_LABEL_V7}: a Freeze reaches three tiles in a line`;
export const BLACK_ICE_UNLOCK_V7 = `${BLACK_ICE_LABEL_V7}: an enemy that steps onto your ice is Frozen`;
/**
 * The frozen sea redesign (RULESET_7_ICE_REDESIGN.md section 2.5): Glacier
 * makes the ice thick instead of lasting longer. Bead pulp_wars-5ti.30: the
 * line names the other players' Crack Ice, so "thick" is not read as the
 * old melting ice.
 */
export function glacierUnlockTextV7(): string {
  return `${GLACIER_LABEL_V7}: your ice is thick: other players must Crack Ice twice to break it, and your Freeze mends a crack; your units on it have cover`;
}
export const ICE_NO_SHIPS_NOTE_V7 = "The Ice Folk build no ships";

/** The dock's Freeze button and its aiming panel. */
export const FREEZE_LINE_TOOLTIP_V7 =
  "Turn the water next to this unit to ice, two tiles out in a line";
export const FREEZE_PICK_V7 = "Choose a highlighted tile to freeze toward";
export const FREEZE_NEEDS_RIME_V7 = "Needs Rime";
export const FREEZE_NEEDS_PACK_ICE_V7 = "Deep Water needs Pack Ice";
export const FREEZE_ALREADY_ACTED_V7 = "Already acted this turn";
export const FREEZE_FROZEN_MOVED_V7 = "Frozen: it cannot act this turn";
export const FREEZE_NO_TARGET_V7 = "No water here can freeze";

/** Whether the unit is the Ice Witch (the role with the Blizzard). */
export function freezesRingV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
    "BLIZZARD",
  );
}

/** Whether the unit's role has Freeze at all (a land role of the Ice Folk). */
export function unitHasFreezeV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "LAND" &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "FREEZE",
    )
  );
}

/** The ice entry of a tile the viewer has explored, or undefined. */
export function iceOnTileV7(
  view: Pick<PlayerViewV7, "ice">,
  at: CoordV7,
): PublicIceTileV7 | undefined {
  return view.ice.find((entry) => entry.at.x === at.x && entry.at.y === at.y);
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * Why an own unit with Freeze that stands next to water has no Freeze to
 * use, from the engine's rejection rows of section 8.4 in order: no Rime
 * (row 3), already acted or Frozen and moved (row 4), nothing freezable
 * (row 6; Deep Water without Pack Ice is named). Null when Freeze is
 * offered, for a unit without Freeze, off the viewer's turn, and for a unit
 * with no explored water next to it (no button is shown then).
 */
export function freezeUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    unit.ownerId !== view.viewer.id ||
    !unitHasFreezeV7(view, unit) ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id
  )
    return null;
  const water = view.board.tiles.filter(
    (tile) =>
      tile.explored &&
      (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER") &&
      chebyshev(tile.at, unit.at) === 1,
  );
  if (water.length === 0) return null;
  const depth = unitCapabilitiesV7(
    view,
    unit,
    view.viewer.researchedTechs,
  ).freezeWater;
  if (depth === "NONE") return FREEZE_NEEDS_RIME_V7;
  if (unitIsFrozenV7(view, unit)) return FREEZE_FROZEN_MOVED_V7;
  if (
    unit.activation.handled ||
    unit.activation.attacked ||
    unit.activation.specialActed ||
    unit.activation.recovered ||
    unit.activation.captured
  )
    return FREEZE_ALREADY_ACTED_V7;
  return depth === "SHALLOW" &&
    water.every(
      (tile) => tile.explored === true && tile.terrain === "DEEP_WATER",
    )
    ? FREEZE_NEEDS_PACK_ICE_V7
    : FREEZE_NO_TARGET_V7;
}

/** What a Freeze does, tile by tile, for labels and assistive text. */
export interface FreezeOutcomeV7 {
  /** Every tile that becomes the unit owner's sound ice. */
  readonly tiles: number;
  /** The owner's cracked tiles of them, mended. */
  readonly mended: number;
  /** Another player's ice of them, taken for the unit's owner. */
  readonly taken: number;
  /** The ships (and embarked units) Frozen on open water. */
  readonly frozenUnits: number;
}

/**
 * The exact outcome of an offered Freeze, counted from `previewFreezeV7`.
 * The frozen sea redesign (RULESET_7_ICE_REDESIGN.md section 4.1): ice is
 * permanent, so there is no countdown to show.
 */
export function freezeOutcomeV7(preview: FreezePreviewV7): FreezeOutcomeV7 {
  return {
    tiles: preview.tiles.length,
    mended: preview.mended.length,
    taken: preview.taken.length,
    frozenUnits: preview.frozenUnits.length,
  };
}

/**
 * The board label of a Freeze: "Ice 2", "Ice 1 · mends 1", "Ice 2 · takes
 * 1", "Ice 1 · Freezes ship", "Freezes ship".
 */
export function freezeTargetLabelV7(outcome: FreezeOutcomeV7): string {
  const extra = [
    ...(outcome.taken > 0 ? [`takes ${outcome.taken}`] : []),
    ...(outcome.mended > 0 ? [`mends ${outcome.mended}`] : []),
    ...(outcome.frozenUnits > 0
      ? [outcome.frozenUnits === 1 ? "Freezes ship" : "Freezes ships"]
      : []),
  ];
  return [
    ...(outcome.tiles > 0 ? [`${ICE_LABEL_V7} ${outcome.tiles}`] : []),
    ...extra,
  ].join(" · ");
}

/** The sentence of a Freeze for the cursor description and the button. */
export function freezeOutcomeTextV7(outcome: FreezeOutcomeV7): string {
  const tiles = `${outcome.tiles} ${outcome.tiles === 1 ? "tile" : "tiles"}`;
  const mended =
    outcome.mended === 0
      ? ""
      : ` ${outcome.mended} cracked ${outcome.mended === 1 ? "tile is" : "tiles are"} mended.`;
  const taken =
    outcome.taken === 0
      ? ""
      : ` ${outcome.taken} ${outcome.taken === 1 ? "tile" : "tiles"} of another player's ice ${outcome.taken === 1 ? "becomes" : "become"} yours.`;
  const ships =
    outcome.frozenUnits === 0
      ? ""
      : ` ${outcome.frozenUnits} ${outcome.frozenUnits === 1 ? "ship is" : "ships are"} Frozen through their next turn.`;
  const ice =
    outcome.tiles === 0
      ? ""
      : ` ${tiles} of ice. It stays until it is cracked.`;
  return `${FREEZE_LABEL_V7}:${ice}${taken}${mended}${ships}`;
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

/** Whether the unit is of a kind that cracks ice (not an Ice Folk unit). */
export function unitHasCrackIceV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unitCracksIceV7(view, unit);
}

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
  return `${ICE_LABEL_V7}: land units stand here; ships cannot enter. Ice Folk skate (half a move); others stop here.${thickness}${blackIce}`;
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
export const SLIP_MOVE_LABEL_V7 = "Ice: your Move ends here";
/**
 * The frozen sea redesign (section 4.1): the slip's legend when the ice's
 * owner is known to have Black Ice (its freeze has been seen this match).
 */
export const SLIP_BLACK_ICE_MOVE_LABEL_V7 = `${SLIP_MOVE_LABEL_V7} (${BLACK_ICE_LABEL_V7} freezes)`;

export const ICE_COVER_PREVIEW_V7 = ICE_COVER_LABEL_V7;
export const ICE_COVER_TOOLTIP_V7 = `${ICE_COVER_LABEL_V7}: light cover on its own ice (${GLACIER_LABEL_V7})`;
export const ON_ICE_LABEL_V7 = "On ice";
/**
 * Bead pulp_wars-2yc.63: who slides on ice, in the tooltip of a tile's ice
 * chip (a unit card no longer says "On ice").
 */
export const ICE_MOVE_TEXT_V7 =
  "Ice Folk skate across ice at half a move a tile; every other unit stops when it steps onto it.";

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
 * Move that slipped to a stop on ice the unit did not know of. Null without
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
    if (event.kind === "WATER_FROZEN") {
      const tiles = `${event.tiles.length} ${event.tiles.length === 1 ? "tile" : "tiles"}`;
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
        parts.push("Ice: the Move ended there");
        toast = true;
      }
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
