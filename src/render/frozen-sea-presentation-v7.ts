import {
  ICE_CRUSH_DAMAGE_V7,
  ICE_SEA_DOG_UNITS_V7,
  isAfloatFormV7,
  seatRoleRuleV7,
  unitIsFrozenV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type FreezePreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicIceTileV7,
  type PublicUnitV7,
} from "../engine/index";

/**
 * The frozen sea interface (bead pulp_wars-5ti.7, second part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 8, 14.1 and 14.2): the
 * words of Freeze, the ice, the slide and the slip, Icebound and the crush,
 * Black Ice and Glacier, shared by the dock, the board plan, Help, the
 * technology cards and the Gallery. Every number is read from the engine's
 * constants, public previews, public unit stats and the view's ice list.
 */

export const FREEZE_LABEL_V7 = "Freeze";
export const ICE_LABEL_V7 = "Ice";
export const SLIDE_LABEL_V7 = "Slide";
export const SLIP_LABEL_V7 = "Slip";
export const ICEBOUND_LABEL_V7 = "Icebound";
export const BLACK_ICE_LABEL_V7 = "Black Ice";
export const GLACIER_LABEL_V7 = "Glacier";
export const ICE_COVER_LABEL_V7 = "Ice cover";

/** Section 8.2, one short sentence each. */
export const FREEZE_RULE_V7 =
  "A unit turns the water next to it to ice, two tiles out in a straight line; the Ice Witch freezes every tile around her.";
export const SLIDE_RULE_V7 =
  "An Ice Folk unit that steps onto ice slides straight on until the ice ends or a unit or an enemy's zone of control stops it.";
export const SLIP_RULE_V7 =
  "Any other unit may walk onto ice, but its Move ends there.";
export const THAW_RULE_V7 =
  "Ice melts after 3 of its owner's turns, but never in its owner's territory and never under a land unit.";
export const NO_SHIPS_RULE_V7 =
  "Ships cannot enter ice; the Ice Folk have no ships at all.";
export const BLACK_ICE_RULE_V7 =
  "Whoever stands on your ice at the start of your turn is frosted.";
export const ICEBOUND_RULE_V7 = `Freeze a ship in place: it cannot sail, shoot or strike back, and the ice crushes it for ${ICE_CRUSH_DAMAGE_V7} each turn.`;
export const GLACIER_RULE_V7 =
  "Your ice lasts 5 turns and your units on it have cover.";

/** Help "On the ice": the Ice Folk viewer's rules, in reading order. */
export const ICE_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [FREEZE_LABEL_V7, FREEZE_RULE_V7],
  [SLIDE_LABEL_V7, SLIDE_RULE_V7],
  ["Thaw", THAW_RULE_V7],
  ["No ships", NO_SHIPS_RULE_V7],
  [BLACK_ICE_LABEL_V7, BLACK_ICE_RULE_V7],
  [ICEBOUND_LABEL_V7, ICEBOUND_RULE_V7],
  [GLACIER_LABEL_V7, GLACIER_RULE_V7],
];

/** Help "At sea", one line for every other faction in a match with ice. */
export const ICE_FOR_SHIPS_HELP_V7: readonly [string, string] = [
  ICE_LABEL_V7,
  "The Ice Folk freeze the sea. Ships cannot enter ice; land units may walk onto it, one tile a turn; it melts after a few turns outside Ice Folk territory.",
];

/** The technology card's lines (no trailing full stop, as its other lines). */
export const FREEZE_SHALLOW_UNLOCK_V7 = `${FREEZE_LABEL_V7}: units turn Shallow Water next to them to ice, two tiles in a line (the Ice Witch: all around her), and slide across it`;
export const FREEZE_DEEP_UNLOCK_V7 = `${FREEZE_LABEL_V7}: Deep Water freezes too`;
export const ICEBOUND_UNLOCK_V7 = `${ICEBOUND_LABEL_V7}: Freeze locks an enemy ship in; it cannot sail, shoot or strike back, and takes ${ICE_CRUSH_DAMAGE_V7} each turn`;
export const BLACK_ICE_UNLOCK_V7 = `${BLACK_ICE_LABEL_V7}: enemies standing on your ice are frosted at the start of your turn`;
export function glacierUnlockTextV7(iceTurns: number): string {
  return `${GLACIER_LABEL_V7}: your ice lasts ${iceTurns} turns and gives your units on it cover`;
}
export const ICE_NO_SHIPS_NOTE_V7 = "The Ice Folk build no ships";

/** The dock's Freeze button and its aiming panel. */
export const FREEZE_LINE_TOOLTIP_V7 =
  "Turn the water next to this unit to ice, two tiles out in a line";
export const FREEZE_RING_TOOLTIP_V7 = "Turn every water tile around her to ice";
export const FREEZE_PICK_V7 = "Choose a highlighted tile to freeze toward";
export const FREEZE_NEEDS_RIME_V7 = "Needs Rime";
export const FREEZE_NEEDS_PACK_ICE_V7 = "Deep Water needs Pack Ice";
export const FREEZE_ALREADY_ACTED_V7 = "Already acted this turn";
export const FREEZE_FROZEN_MOVED_V7 = "Frozen: it moved";
export const FREEZE_NO_TARGET_V7 = "No water here can freeze";

/** The role ability's description (unit information, Gallery). */
export function freezeAbilityDescriptionV7(witch: boolean): string {
  return witch
    ? "With Rime, turns every water tile around her to ice."
    : "With Rime, turns the water next to it to ice, two tiles out in a line.";
}

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

function tileAt(view: PlayerViewV7, at: CoordV7) {
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  return tile?.explored === true ? tile : undefined;
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
      tile.improvement !== "PORT" &&
      tile.improvement !== "SHIPYARD" &&
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
  /** Every tile that becomes or stays ice. */
  readonly tiles: number;
  /** The tiles of them in the unit owner's territory: that ice never melts. */
  readonly permanent: number;
  /** The countdown of the others, in the owner's turns. */
  readonly turns: number;
  /** The ships locked in the ice. */
  readonly icebound: number;
}

/**
 * The exact outcome of an offered Freeze, from `previewFreezeV7`, the unit
 * owner's `iceTurns` and the territory of each tile (ice in its owner's
 * territory does not melt, section 8.5).
 */
export function freezeOutcomeV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  preview: FreezePreviewV7,
): FreezeOutcomeV7 {
  return {
    tiles: preview.tiles.length,
    permanent: preview.tiles.filter(
      (at) => tileAt(view, at)?.territoryOwnerId === unit.ownerId,
    ).length,
    turns: unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).iceTurns,
    icebound: preview.icebound.length,
  };
}

/** The board label of a Freeze: "Ice 2 · 3 turns", "Ice 2 · stays". */
export function freezeTargetLabelV7(outcome: FreezeOutcomeV7): string {
  const lasting =
    outcome.permanent === outcome.tiles
      ? "stays"
      : outcome.permanent === 0
        ? `${outcome.turns} turns`
        : `${outcome.turns} turns, ${outcome.permanent} stays`;
  return `${ICE_LABEL_V7} ${outcome.tiles} · ${lasting}`;
}

/** The sentence of a Freeze for the cursor description and the button. */
export function freezeOutcomeTextV7(outcome: FreezeOutcomeV7): string {
  const tiles = `${outcome.tiles} ${outcome.tiles === 1 ? "tile" : "tiles"}`;
  const lasting =
    outcome.permanent === outcome.tiles
      ? "It does not melt in your territory"
      : outcome.permanent === 0
        ? `It melts after ${outcome.turns} of your turns`
        : `${outcome.permanent} in your territory ${outcome.permanent === 1 ? "does" : "do"} not melt; the rest melts after ${outcome.turns} of your turns`;
  const ships =
    outcome.icebound === 0
      ? ""
      : ` ${outcome.icebound} ${outcome.icebound === 1 ? "ship is" : "ships are"} locked in the ice.`;
  return `${FREEZE_LABEL_V7}: ${tiles} of ice. ${lasting}.${ships}`;
}

/** The ice chip of the tile dock: "Ice · 3" or "Ice · stays". */
export function iceChipLabelV7(ice: PublicIceTileV7): string {
  return ice.permanent
    ? `${ICE_LABEL_V7} · stays`
    : `${ICE_LABEL_V7} · ${ice.turnsLeft}`;
}

/** The ice chip's tooltip: what ice is, when it melts, and Black Ice. */
export function iceChipTooltipV7(
  view: PlayerViewV7,
  ice: PublicIceTileV7,
): string {
  const own = ice.ownerId === view.viewer.id;
  const melt = ice.permanent
    ? `It does not melt in ${own ? "your" : "its owner's"} territory`
    : ice.turnsLeft === 0
      ? "It melts when no land unit stands on it"
      : `It melts in ${ice.turnsLeft} of ${own ? "your" : "its owner's"} ${ice.turnsLeft === 1 ? "turn" : "turns"} unless a land unit stands on it`;
  const blackIce =
    own && viewerHasBlackIceV7(view)
      ? ` ${BLACK_ICE_LABEL_V7}: enemies standing here are frosted at the start of your turn.`
      : "";
  return `${ICE_LABEL_V7}: land units stand here and ships cannot enter. ${melt}.${blackIce}`;
}

/** The melting stage of an ice tile: 0 (none) to 3 (wide cracks). */
export function iceCrackStageV7(
  ice: Pick<PublicIceTileV7, "permanent" | "turnsLeft">,
): 0 | 1 | 2 | 3 {
  if (ice.permanent) return 0;
  return ice.turnsLeft >= 3 ? 1 : ice.turnsLeft === 2 ? 2 : 3;
}

/** Whether the viewer's own ice is Black Ice (a seat-level capability). */
export function viewerHasBlackIceV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).blackIce;
}

/** The marks of a Move on ice. */
export const SLIDE_MOVE_LABEL_V7 = "Slide: it stops where the ice ends";
export const SLIP_MOVE_LABEL_V7 = "Ice: your Move ends here";

/** The chips and warnings of an icebound unit. */
export const ICEBOUND_TOOLTIP_V7 = `${ICEBOUND_LABEL_V7}: cannot sail, shoot, board or strike back`;
export const ICEBOUND_BLOCKED_V7 = "Icebound: it cannot sail, shoot or board";
export const ICEBOUND_PREVIEW_V7 = "Icebound: no strike-back";
export const ICE_COVER_PREVIEW_V7 = ICE_COVER_LABEL_V7;
export const ICE_COVER_TOOLTIP_V7 = `${ICE_COVER_LABEL_V7}: light cover on its own ice (${GLACIER_LABEL_V7})`;
export const ON_ICE_LABEL_V7 = "On ice";

/** The crush an icebound unit takes next: its amount and whose turn. */
export interface CrushWarningV7 {
  readonly damage: number;
  readonly lethal: boolean;
  /** "−3 HP" (or "Sinks") for the board and the chip. */
  readonly label: string;
  /** The whole sentence, for the tooltip and assistive text. */
  readonly text: string;
}

/**
 * Section 8.9: the crush an icebound unit takes at the next Start Turn of
 * the owner of its ice (`ICE_CRUSH_DAMAGE_V7`, capped at its HP), or null
 * for a unit that is not icebound.
 */
export function crushWarningV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): CrushWarningV7 | null {
  if (
    !isAfloatFormV7(unit.form) ||
    view.unitStats.find((entry) => entry.unitId === unit.id)?.icebound !== true
  )
    return null;
  const ice = iceOnTileV7(view, unit.at);
  if (ice === undefined) return null;
  const damage = Math.min(unit.hp, ICE_CRUSH_DAMAGE_V7);
  const lethal = damage >= unit.hp;
  const whose =
    ice.ownerId === view.viewer.id
      ? "your"
      : `${playerName(view, ice.ownerId)}'s`;
  return {
    damage,
    lethal,
    label: lethal ? "Sinks" : `−${damage} HP`,
    text: lethal
      ? `The ice crushes it at the start of ${whose} turn: it sinks`
      : `The ice crushes it for ${damage} at the start of ${whose} turn`,
  };
}

/** The frozen-sea lines of an attack preview: cover on ice, a frozen target. */
export function frozenSeaCombatNotesV7(
  preview: CombatPreviewV7,
): readonly string[] {
  return [
    ...(preview.iceCover ? [ICE_COVER_PREVIEW_V7] : []),
    ...(preview.icebound && !preview.defenderDies ? [ICEBOUND_PREVIEW_V7] : []),
  ];
}

/** The Ice Folk goal of Sea Dog (section 8.11). */
export const ICE_SEA_DOG_GOAL_V7 = `Hold the ice with ${ICE_SEA_DOG_UNITS_V7} units at once.`;

function playerName(view: PlayerViewV7, playerId: number): string {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}`;
}

function subject(view: PlayerViewV7, playerId: number): string {
  return playerId === view.viewer.id ? "You" : playerName(view, playerId);
}

function possessive(view: PlayerViewV7, playerId: number): string {
  return playerId === view.viewer.id
    ? "your"
    : `${playerName(view, playerId)}'s`;
}

/**
 * The notice of a boundary's frozen-sea events: a Freeze (with the ships
 * it locked in), ice melting (with the ships that float free), the crush,
 * and a Move that slipped to a stop on ice the unit did not know of. Null
 * without one. No text names a tile.
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
  const shipName = (id: number): string => {
    const unit = unitById(id);
    return unit === undefined
      ? "a ship"
      : `${possessive(after, unit.ownerId)} ${seatRoleRuleV7(after, unit.ownerId, unit.role).label}`;
  };
  for (const event of events) {
    if (event.kind === "WATER_FROZEN") {
      const tiles = `${event.tiles.length} ${event.tiles.length === 1 ? "tile" : "tiles"}`;
      parts.push(
        `${subject(after, event.playerId)} froze ${tiles}${
          event.icebound.length === 0
            ? ""
            : `: ${event.icebound.map(shipName).join(" and ")} ${event.icebound.length === 1 ? "is" : "are"} icebound`
        }`,
      );
      if (
        event.icebound.some((id) => unitById(id)?.ownerId === after.viewer.id)
      )
        toast = true;
    } else if (event.kind === "ICE_MELTED") {
      const tiles = `${event.tiles.length} ${event.tiles.length === 1 ? "tile" : "tiles"}`;
      parts.push(
        `Ice melted on ${tiles}${
          event.freed.length === 0
            ? ""
            : `: ${event.freed.map(shipName).join(" and ")} ${event.freed.length === 1 ? "floats" : "float"} free`
        }`,
      );
    } else if (event.kind === "UNITS_CRUSHED") {
      for (const result of event.results) {
        const hit = result.damage + result.shieldDamage;
        parts.push(
          `The ice crushed ${shipName(result.unitId)} for ${hit}${result.hpAfter <= 0 ? ": it sank" : ""}`,
        );
        if (unitById(result.unitId)?.ownerId === after.viewer.id) toast = true;
      }
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
