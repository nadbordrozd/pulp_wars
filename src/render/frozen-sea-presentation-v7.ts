import {
  HARPOON_ATTACK2_V7,
  ICE_FORTRESS_RANGE_BONUS_V7,
  ICE_SEA_DOG_UNITS_V7,
  UNDER_THE_ICE_POPULATION_V7,
  queryAlliedV7,
  unitCracksIceV7,
  unitIsFrozenV7,
  unitMayActAfterMoveV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
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
 * `FREEZE` command and Hoarfrost's line are gone), the ice, Glide over
 * Snow and ice (skating is plain movement since `pulp_wars-ecnj`, 7r135:
 * Skate, Runners, the skate trail and its arrows are gone), the Fishing
 * Hole dive (the slip of every other unit before `pulp_wars-y242`, 7r132),
 * who walks on ice, and (the naval branch rebuilt, `pulp_wars-tzk6`, 7r137,
 * in place of Black Ice and Glacier) the swimming Walrus, Harpoons, the Ice
 * Fortress and Under the Ice, shared by the dock, the board plan, Help, the
 * technology cards and the Gallery. Every number is read from the engine's
 * constants, public previews, public unit stats and the view's ice list.
 */

export const FREEZE_LABEL_V7 = "Freeze";
export const ICE_LABEL_V7 = "Ice";
/** Ice Folk movement: Glide (`pulp_wars-ecnj`) and the dive. */
export const GLIDE_LABEL_V7 = "Glide";
export const DIVE_LABEL_V7 = "Dive";
/** The naval branch rebuilt (`pulp_wars-tzk6`, 7r137). */
export const SWIM_LABEL_V7 = "Swim";
export const HARPOONS_LABEL_V7 = "Harpoons";
export const ICE_FORTRESS_LABEL_V7 = "Ice Fortress";
export const UNDER_THE_ICE_LABEL_V7 = "Under the Ice";

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
/**
 * Skating is plain movement (`pulp_wars-ecnj`, 7r135,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.6): Glide's glossary
 * and Help line.
 */
export const GLIDE_RULE_V7 =
  "Between Snow and ice tiles, Ice Folk move at half cost, as on a Road.";
/**
 * The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): the dive needs Under
 * the Ice (it was Rime's).
 */
export const DIVE_RULE_V7 =
  "With Under the Ice, a unit on your Fishing Hole that has not moved may dive to any other free Fishing Hole of yours as its move.";
/**
 * The naval branch rebuilt (`pulp_wars-tzk6`, 7r137,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.4): the glossary's
 * and Help's lines of the rebuilt branch (at most one number each).
 */
export const SWIM_RULE_V7 =
  "The Walrus swims: it moves onto open water (deep water with Pack Ice), one point a tile, and fights there as on land.";
export const HARPOONS_RULE_V7 = `Your units have +${HARPOON_ATTACK2_V7 / 2} Attack against ships and boats.`;
export const ICE_FORTRESS_RULE_V7 = `An upgraded Fishing Hole, one per city: your unit on it is fortified and shoots ${ICE_FORTRESS_RANGE_BONUS_V7} tile further.`;
export const UNDER_THE_ICE_RULE_V7 = `Each Fishing Hole, Ice Fortress and captured dock of yours gives +${UNDER_THE_ICE_POPULATION_V7} population.`;
/**
 * Fishing Hole links (`pulp_wars-vg5l`, 7r127): the Ice Folk sea link.
 * Sea routes over ice only (`pulp_wars-dy2b`, 7r138): only along an
 * unbroken chain of your own ice, of any length (one number at most).
 */
export const HOLE_LINKS_LABEL_V7 = "Hole links";
export const HOLE_LINKS_RULE_V7 =
  "With Rime, an unbroken line of your own ice, of any length, between Fishing Holes of two of your cities links them like a Road: a city joined to your capital gets +1 population. Open water, enemy ice, a Crack or an enemy on a hole breaks the link.";
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
/** The border freeze (`pulp_wars-5ti.31`). */
export const BORDER_ICE_LABEL_V7 = "Border ice";
export const BORDER_ICE_RULE_V7 =
  "With Rime, the water inside your borders turns to ice, and again whenever a city's borders grow.";
export const CRACK_ICE_LABEL_V7 = "Crack Ice";
export const CRACK_ICE_RULE_V7 =
  "Any other land unit or ship next to ice may break one tile of it back into water, unless a unit stands on it or it is built on. Units that fly or stride cross ice instead.";
export const ICE_BUILD_RULE_V7 =
  "The Ice Folk build Fishing Holes, Ice Fortresses, mills, Workshop, Market and Monument on their own ice. They build no harbours; one they capture stays a plain dock.";

/** The frozen sea's rules, in reading order (the Ice Folk tech cards' "?"). */
export const ICE_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [FREEZE_LABEL_V7, FREEZE_RULE_V7],
  [GLIDE_LABEL_V7, GLIDE_RULE_V7],
  [DIVE_LABEL_V7, DIVE_RULE_V7],
  [HOLE_LINKS_LABEL_V7, HOLE_LINKS_RULE_V7],
  [ICE_WALKERS_LABEL_V7, ICE_WALKERS_RULE_V7],
  ["Ice stays", ICE_STAYS_RULE_V7],
  [BORDER_ICE_LABEL_V7, BORDER_ICE_RULE_V7],
  [CRACK_ICE_LABEL_V7, CRACK_ICE_RULE_V7],
  ["Build", ICE_BUILD_RULE_V7],
  ["No ships", NO_SHIPS_RULE_V7],
  [SWIM_LABEL_V7, SWIM_RULE_V7],
  [HARPOONS_LABEL_V7, HARPOONS_RULE_V7],
  [ICE_FORTRESS_LABEL_V7, ICE_FORTRESS_RULE_V7],
  [UNDER_THE_ICE_LABEL_V7, UNDER_THE_ICE_RULE_V7],
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
export const FREEZE_DEEP_UNLOCK_V7 = `${ICE_LABEL_V7}: your freezes make ice on deep water too, and Walruses swim there`;
/**
 * The naval branch rebuilt (`pulp_wars-tzk6`, 7r137,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.4): the card lines of
 * Harpoons, the Ice Fortress and Under the Ice (Black Ice and Glacier
 * before), one number each at most.
 */
export const HARPOONS_UNLOCK_V7 = `${HARPOONS_LABEL_V7}: +${HARPOON_ATTACK2_V7 / 2} Attack against ships and boats`;
export const ICE_FORTRESS_UNLOCK_V7 = `${ICE_FORTRESS_LABEL_V7}: fortify a Fishing Hole: a unit on it is fortified and shoots ${ICE_FORTRESS_RANGE_BONUS_V7} further`;
export const UNDER_THE_ICE_UNLOCK_V7 = `${UNDER_THE_ICE_LABEL_V7}: dive between your Fishing Holes; each hole gives +${UNDER_THE_ICE_POPULATION_V7} population`;
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
 * on it. Null when Crack Ice is offered, for an
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
        tile.improvement !== null,
    );
  if (beside.some((entry) => built(entry.at))) return CRACK_ICE_BUILT_V7;
  return CRACK_ICE_ALREADY_ACTED_V7;
}

/**
 * The board label of a Crack Ice: "Break" (one Crack breaks any ice since
 * the naval branch rebuilt, `pulp_wars-tzk6`, 7r137: no thick ice, no
 * iced-over dock, so every offered Crack Ice has the same outcome).
 */
export function crackIceTargetLabelV7(): string {
  return CRACK_ICE_BREAK_LABEL_V7;
}

/** The sentence of a Crack Ice for the cursor description. */
export function crackIceOutcomeTextV7(): string {
  return `${CRACK_ICE_LABEL_V7}: The ice breaks into open water.`;
}

/** The ice chip of the tile dock: "Ice". */
export function iceChipLabelV7(): string {
  return ICE_LABEL_V7;
}

/**
 * The ice chip's tooltip (the frozen sea redesign, section 4.1): what ice
 * is. No countdown: ice is permanent (thick ice and Black Ice went with the
 * naval branch rebuilt, `pulp_wars-tzk6`, 7r137).
 */
export function iceChipTooltipV7(): string {
  return `${ICE_LABEL_V7}: only Ice Folk units and units that fly or stride go onto it; other units crack it. Ice Folk Glide on it, as on Snow.`;
}

/**
 * Ice Folk movement (`pulp_wars-s55m.2`): the mark of a Fishing Hole dive
 * (the legend and the cursor description). A Move on ice has no mark of
 * its own since `pulp_wars-ecnj` (7r135: the skate trail, its arrows and
 * the skate tiles are gone).
 */
export const DIVE_MOVE_LABEL_V7 =
  "Dive: through your Fishing Holes, as the whole move";

export const ON_ICE_LABEL_V7 = "On ice";
/**
 * Bead pulp_wars-2yc.63: who moves on ice, in the tooltip of a tile's ice
 * chip (a unit card no longer says "On ice"). Glide over ice since
 * `pulp_wars-ecnj` (7r135; skating before).
 */
export const ICE_MOVE_TEXT_V7 =
  "Ice Folk move at half cost between ice and Snow tiles; units that fly or stride cross it like land; no other unit goes onto it.";

/**
 * The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): the preview row of
 * Harpoons (Glacier's ice cover before, in its place).
 */
export const HARPOON_PREVIEW_V7 = `Harpoon +${HARPOON_ATTACK2_V7 / 2}`;

/** The frozen-sea lines of an attack preview: Harpoons. */
export function frozenSeaCombatNotesV7(
  preview: CombatPreviewV7,
): readonly string[] {
  return preview.harpoon ? [HARPOON_PREVIEW_V7] : [];
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
      // The frozen sea redesign (section 4.1): a Crack broke a tile.
      parts.push("The ice broke");
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
