import {
  CRUMBS_TURNS_V7,
  HOME_SWEET_HOME_RADIUS_V7,
  PEPPERMINT_DAMAGE_V7,
  REBAKE_OVER_CAPACITY_V7,
  REBAKE_REACH_V7,
  SUGAR_RUSH_ATTACK2_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  SUGAR_TOSS_HEAL_V7,
  SUGAR_TOSS_RANGE_V7,
  STUCK_MAX_STEPS_V7,
  THUMP_DAMAGE_V7,
  TOOTHACHE_ATTACK2_V7,
  TOP_UP_HEAL_V7,
  candyActionRejectionV7,
  effectiveRoleRuleV7,
  queryRebakeBlockerV7,
  rebakePriceV7,
  roleMechanicsV7,
  standsByOwnCenterV7,
  sugarRushRejectionV7,
  unitFactionV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicCandyMechanicsV7,
  type PublicUnitStatsV7,
  isNavalRoleV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { ninthUnitHelpRulesV7 } from "./ninth-unit-presentation-v7";

/**
 * Presentation helpers for the Candy faction (docs/product/
 * RULESET_7_CANDY.md section 15, bead pulp_wars-jdb.6). Every helper reads
 * only the public view (`sugarRush`, `crumbs`, `splattedThisTurn`), the
 * public unit stats' flags and `candy` block, the public previews
 * (`previewSugarRushV7`, `previewRebakeV7`, `previewSugarTossV7`,
 * `previewCrumbsEatV7`, `queryCombatPreviewV7`) and projected player events.
 * Every number in a sentence comes from the registry or the engine
 * constants, so the balance bead can retune them without a text going
 * stale. No text names a tile. A match without a Candy seat never reaches a
 * code path that changes its presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Candy. */
export function matchHasCandySeatV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some((player) => player.faction === "CANDY");
}

/** Whether a visible unit is of the Candy kind (`unitFactionV7`). */
export function unitIsCandyV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "CANDY";
}

/** A Candy role's label under the Candy registration. */
export const candyLabelV7 = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "CANDY").label;

/** Half-units as the interface writes them: 3 → "1.5", 2 → "1". */
const half = (value2: number): string => String(value2 / 2);

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function article(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a";
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four"] as const;
const numberWord = (value: number): string =>
  NUMBER_WORDS[value] ?? String(value);

// ------------------------------------------------ Section 15.2: text ---

export const SUGAR_RUSH_LABEL_V7 = "Sugar Rush";
export const SUGAR_RUSH_TOOLTIP_V7 = `+${SUGAR_RUSH_MOVE_BONUS_V7} Move and +${half(SUGAR_RUSH_ATTACK2_V7)} Attack on its first attack this turn. Next turn it Crashes and can't act`;
export const RUSHED_LABEL_V7 = "Rushed";
export const RUSHED_STATUS_V7 = `Rushed: +${SUGAR_RUSH_MOVE_BONUS_V7} Move, +${half(SUGAR_RUSH_ATTACK2_V7)} Attack on its first attack`;
export const HOME_SWEET_HOME_LABEL_V7 = "Home Sweet Home";
export const HOME_SWEET_HOME_STATUS_V7 = "Home Sweet Home: won't Crash here";
export const CRASHED_LABEL_V7 = "Crashed";
export const CRASHED_NOW_STATUS_V7 = "Crashed: can move, can't act this turn";
export const CRASHED_NEXT_STATUS_V7 = "Crashed: can't act on its next turn";
export const SPLATTED_LABEL_V7 = "Splatted";
export const SPLATTED_STATUS_V7 = "Splatted: can't strike back this turn";
export const BOUNCY_LABEL_V7 = "Bouncy";
export const BOUNCY_INFO_V7 = "Bouncy: melee attackers spring back";
export const SUGAR_RUSH_CRASHED_V7 = "Crashed";
export const SUGAR_RUSH_MOVED_V7 = "Already moved";
export const SUGAR_RUSH_ACTED_V7 = "Already acted";
export const SUGAR_RUSH_RUSHED_V7 = "Already rushed";

export const REBAKE_LABEL_V7 = "Re-bake";
export const REBAKE_TOOLTIP_V7 = `Scoop Crumbs within ${numberWord(REBAKE_REACH_V7)} tiles, even from under a unit, and bake the unit back next to it at half price and half HP. Its city may go ${numberWord(REBAKE_OVER_CAPACITY_V7)} over its limit`;
export const REBAKE_NO_CRUMBS_V7 = `No Crumbs within ${numberWord(REBAKE_REACH_V7)} tiles`;
export const REBAKE_NO_COINS_V7 = "Not enough Coins";
export const REBAKE_NO_HOME_V7 = "No home city";
export const REBAKE_BLOCKED_V7 = "No free tile next to it";
/** "{city} is full". */
export function rebakeCityFullTextV7(city: string): string {
  return `${city} is full`;
}
/** "Re-bake {unit}: {n} Coins, {n} HP". */
export function rebakeTargetNameV7(
  role: UnitRoleIdV7,
  cost: number,
  hp: number,
): string {
  return `${REBAKE_LABEL_V7} ${candyLabelV7(role)}: ${plural(cost, "Coin")}, ${hp} HP`;
}
/** The short board label of a Re-bake tile: its price and its HP. */
export function rebakeBoardLabelV7(cost: number, hp: number): string {
  return `${plural(cost, "Coin")} · ${hp} HP`;
}

export const SUGAR_TOSS_LABEL_V7 = "Sugar Toss";
export const SUGAR_TOSS_TOOLTIP_V7 = `Heal an own unit within ${SUGAR_TOSS_RANGE_V7} tiles by ${SUGAR_TOSS_HEAL_V7}. Each unit once a turn`;
export const SUGAR_TOSS_NO_TARGET_V7 = `No wounded unit within ${SUGAR_TOSS_RANGE_V7} tiles`;
/** "Toss to {unit}: +{n}". */
export function sugarTossTargetNameV7(unit: string, amount: number): string {
  return `Toss to ${unit}: +${amount}`;
}

/**
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md, bead
 * `pulp_wars-jdb.12`): the plain names and one-sentence rules of the new
 * Candy abilities. The markers, buttons, cues, and the full Help texts are
 * `pulp_wars-jdb.14`'s.
 */
export const TOP_UP_LABEL_V7 = "Top-Up";
export const TOP_UP_TOOLTIP_V7 = `One adjacent unit stops being Crashed, heals ${TOP_UP_HEAL_V7}, is cured, and thaws if Frozen`;
export const STICKY_TOFFEE_LABEL_V7 = "Sticky Toffee";
export const GLAZE_TRAIL_LABEL_V7 = "Glaze Trail";
export const RICOCHET_LABEL_V7 = "Ricochet";
export const BUNNY_HOP_LABEL_V7 = "Bunny Hop";
export const THUMP_LABEL_V7 = "Thump";
export const TOOTHACHE_LABEL_V7 = "Toothache";

// ------------------------------------- The redesign's UI (jdb.14) ---

/**
 * The Candy redesign's markers, chips, previews and pickers
 * (docs/product/RULESET_7_CANDY_REDESIGN.md section 14, bead
 * `pulp_wars-jdb.14`). Every number comes from the engine constants.
 */
export const STUCK_LABEL_V7 = "Stuck";
/** The Stuck chip: "Stuck: one step". */
export const STUCK_STATUS_V7 = `${STUCK_LABEL_V7}: ${numberWord(STUCK_MAX_STEPS_V7)} step`;
/** The Toothache chip: "Toothache: next attack −1". */
export const TOOTHACHE_STATUS_V7 = `${TOOTHACHE_LABEL_V7}: next attack −${half(TOOTHACHE_ATTACK2_V7)}`;
export const GLAZED_LABEL_V7 = "Glazed";
/** The Glaze of a tile, for the viewer's own turn. */
export const GLAZED_OWN_TILE_V7 =
  "Glazed: your units step onto it at half cost this turn";
/** "Glazed: Player N's units step onto it at half cost this turn". */
export function glazedTileTextV7(view: PlayerViewV7): string {
  const active = view.turnOrder[view.activeSeatIndex];
  if (active === view.viewer.id) return GLAZED_OWN_TILE_V7;
  const player = view.players.find((candidate) => candidate.id === active);
  return `${GLAZED_LABEL_V7}: ${player === undefined ? "the active player's" : `Player ${player.seat + 1}'s`} units step onto it at half cost this turn`;
}
/** The Glaze line of a tile, or an empty list (no text names a tile). */
export function glazeTileLinesV7(
  view: PlayerViewV7,
  at: CoordV7,
): readonly string[] {
  return view.glazedThisTurn.some((tile) => tile.x === at.x && tile.y === at.y)
    ? [glazedTileTextV7(view)]
    : [];
}
/** A Bunny's Move that hops over a tile (the cursor and the dock). */
export const HOP_MOVE_TEXT_V7 = `${BUNNY_HOP_LABEL_V7}: jumps over one tile`;
/** "Top-Up: no unit next to it needs one". */
export const TOP_UP_NO_TARGET_V7 = "No unit next to it needs a Top-Up";
/** The first step of the Re-bake pick: which Crumbs. */
export const REBAKE_PICK_CRUMBS_V7 = `Choose the Crumbs to scoop, within ${numberWord(REBAKE_REACH_V7)} tiles`;
/** The second step: where the copy comes out. */
export const REBAKE_PICK_TILE_V7 = `Choose where it comes out, next to the ${candyLabelV7("CAPTAIN")}`;
/** The Top-Up pick. */
export const TOP_UP_PICK_V7 = "Choose a unit next to it";

/** "+2 · Crash ends · Cures": what a Top-Up target gets. */
export function topUpBoardLabelV7(entry: {
  readonly amount: number;
  readonly crashEnded: boolean;
  readonly cured: boolean;
}): string {
  return [
    ...(entry.amount > 0 ? [`+${entry.amount}`] : []),
    ...(entry.crashEnded ? ["Crash ends"] : []),
    ...(entry.cured ? ["Cures"] : []),
  ].join(" · ");
}
/** "Top-Up {unit}: +2 · Crash ends · Cures". */
export function topUpTargetNameV7(
  unit: string,
  entry: Parameters<typeof topUpBoardLabelV7>[0],
): string {
  return `${TOP_UP_LABEL_V7} ${unit}: ${topUpBoardLabelV7(entry)}`;
}
/** "Scoop {unit} Crumbs: {n} Coins, {n} HP" (the first Re-bake step). */
export function rebakeCrumbsNameV7(
  role: UnitRoleIdV7,
  cost: number,
  hp: number,
): string {
  return `Scoop ${candyLabelV7(role)} Crumbs: ${plural(cost, "Coin")}, ${hp} HP`;
}

export const RUSH_PREVIEW_V7 = `Sugar Rush +${half(SUGAR_RUSH_ATTACK2_V7)}`;
export const SPLAT_PREVIEW_V7 = "Splat: no strike-back this turn";
export const SPLATTED_PREVIEW_V7 = "No strike-back: Splatted";
export const BOUNCES_PREVIEW_V7 = "Bounces back";
export const BOUNCE_BLOCKED_PREVIEW_V7 = "Bounce blocked";
export const BOUNCE_UNKNOWN_PREVIEW_V7 = "May bounce back";
/** The Candy redesign's preview lines (section 14). */
export const STUCK_TARGET_PREVIEW_V7 = `${STICKY_TOFFEE_LABEL_V7}: target Stuck`;
export const STUCK_ATTACKER_PREVIEW_V7 = `${STICKY_TOFFEE_LABEL_V7}: attacker Stuck`;
export const TOOTHACHE_GIVEN_PREVIEW_V7 = `${TOOTHACHE_LABEL_V7}: attacker's next attack −${half(TOOTHACHE_ATTACK2_V7)}`;
export const TOOTHACHE_ATTACK_PREVIEW_V7 = `${TOOTHACHE_LABEL_V7} −${half(TOOTHACHE_ATTACK2_V7)}`;
export const THUMP_UNCERTAIN_PREVIEW_V7 = `${THUMP_LABEL_V7} may hit unseen units`;
/** "Ricochet −2", the gumball's fixed hit on the unit it bounces to. */
export function ricochetPreviewV7(damage: number): string {
  return `${RICOCHET_LABEL_V7} −${damage}`;
}
/** "Thump −2 to 3": the fixed hits of a Chocolate Bunny's Thump. */
export function thumpPreviewV7(
  hits: readonly { readonly damage: number }[],
): string {
  const amounts = [...new Set(hits.map((hit) => hit.damage))];
  return `${THUMP_LABEL_V7} −${amounts.length === 1 ? String(amounts[0]) : amounts.join("/")} to ${hits.length}`;
}
export const EATS_CRUMBS_V7 = "Eats Crumbs";
/** "Eats Crumbs" or "Eats Crumbs: −{n}". */
export function eatsCrumbsTextV7(damage: number): string {
  return damage > 0 ? `${EATS_CRUMBS_V7}: −${damage}` : EATS_CRUMBS_V7;
}

export const CANDY_FIELD_DEFENSE_EXPLANATION_V7 =
  "Candy can't build Field Defense";

/** "{unit} Crumbs: {n} turns left". */
export function crumbsInfoTextV7(
  role: UnitRoleIdV7,
  turnsLeft: number,
): string {
  return `${candyLabelV7(role)} Crumbs: ${plural(turnsLeft, "turn")} left`;
}
/** "Peppermint Surprise: an enemy that eats them takes {n}". */
export function crumbsBiteTextV7(bite: number): string {
  return `Peppermint Surprise: an enemy that eats them takes ${bite}`;
}

/** The lines of a tile's Crumbs (section 15.2), or an empty list. */
export function crumbsTileLinesV7(
  view: PlayerViewV7,
  at: CoordV7,
): readonly string[] {
  const crumbs = view.crumbs.find(
    (entry) => entry.at.x === at.x && entry.at.y === at.y,
  );
  if (crumbs === undefined) return [];
  return [
    crumbsInfoTextV7(crumbs.role, crumbs.turnsLeft),
    ...(crumbs.bite > 0 ? [crumbsBiteTextV7(crumbs.bite)] : []),
  ];
}

// ------------------------------------------------------- Unit status ---

/** The public Candy flags and mechanics of a visible unit. */
export function candyStatsV7(
  view: PlayerViewV7,
  unitId: number,
): Pick<
  PublicUnitStatsV7,
  | "rushed"
  | "crashed"
  | "splatted"
  | "tossedThisTurn"
  | "stuck"
  | "toothache"
  | "candy"
> {
  return view.unitStats.find((stats) => stats.unitId === unitId) ?? {};
}

/**
 * Section 15.1 "Home Sweet Home": on its owner's view, a Rushed unit that
 * will not Crash where it stands (its owner's public capability and the
 * engine's "on or next to an own city center" test).
 */
export function homeSweetHomeChipV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "at">,
  stats: Pick<PublicUnitStatsV7, "rushed" | "candy">,
): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    stats.rushed === true &&
    stats.candy?.homeSweetHome === true &&
    standsByOwnCenterV7(view.cities, unit)
  );
}

/** One Candy chip of a unit's dock. */
export interface CandyChipV7 {
  readonly id:
    | "rushed"
    | "home-sweet-home"
    | "crashed"
    | "splatted"
    | "stuck"
    | "toothache";
  readonly label: string;
  /** The one sentence of section 15.2: the tooltip and accessible name. */
  readonly status: string;
  /** The status icon of the Candy art, or the technology's house. */
  readonly icon:
    | "ICON:STATUS:RUSHED"
    | "ICON:STATUS:CRASHED"
    | "ICON:STATUS:SPLATTED"
    | "ICON:STATUS:STUCK"
    | "ICON:STATUS:TOOTHACHE"
    | "ICON:TECH:CANDY:FORTIFICATION";
}

/**
 * The Candy chips of a visible unit of any owner (section 15.2): Rushed,
 * Home Sweet Home, Crashed (by whose turn it is) and Splatted; and the
 * Candy redesign's Stuck ("Stuck: one step") and Toothache ("Toothache:
 * next attack −1", RULESET_7_CANDY_REDESIGN.md section 14). Empty in a
 * match without a Candy seat.
 */
export function candyChipsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CandyChipV7[] {
  const stats = candyStatsV7(view, unit.id);
  const chips: CandyChipV7[] = [];
  if (stats.rushed === true) {
    chips.push({
      id: "rushed",
      label: RUSHED_LABEL_V7,
      status: RUSHED_STATUS_V7,
      icon: "ICON:STATUS:RUSHED",
    });
    if (homeSweetHomeChipV7(view, unit, stats))
      chips.push({
        id: "home-sweet-home",
        label: HOME_SWEET_HOME_LABEL_V7,
        status: HOME_SWEET_HOME_STATUS_V7,
        icon: "ICON:TECH:CANDY:FORTIFICATION",
      });
  }
  if (stats.crashed === true)
    chips.push({
      id: "crashed",
      label: CRASHED_LABEL_V7,
      status:
        view.turnOrder[view.activeSeatIndex] === unit.ownerId
          ? CRASHED_NOW_STATUS_V7
          : CRASHED_NEXT_STATUS_V7,
      icon: "ICON:STATUS:CRASHED",
    });
  if (stats.splatted === true)
    chips.push({
      id: "splatted",
      label: SPLATTED_LABEL_V7,
      status: SPLATTED_STATUS_V7,
      icon: "ICON:STATUS:SPLATTED",
    });
  if (stats.stuck === true)
    chips.push({
      id: "stuck",
      label: STUCK_LABEL_V7,
      status: STUCK_STATUS_V7,
      icon: "ICON:STATUS:STUCK",
    });
  if (stats.toothache === true)
    chips.push({
      id: "toothache",
      label: TOOTHACHE_LABEL_V7,
      status: TOOTHACHE_STATUS_V7,
      icon: "ICON:STATUS:TOOTHACHE",
    });
  return chips;
}

/** One line of Candy unit information. */
export interface CandyUnitInfoLineV7 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines that are not abilities: the unit's Candy statuses (any
 * owner) and, for a Candy unit, what its Crumbs cost to Re-bake and what
 * they do to an enemy that eats them.
 */
export function candyUnitInfoLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CandyUnitInfoLineV7[] {
  const lines: CandyUnitInfoLineV7[] = candyChipsV7(view, unit).map((chip) => ({
    id: chip.id,
    name: chip.label,
    description:
      chip.id === "stuck" || chip.id === "toothache"
        ? candyStatusDescriptionV7(view, unit, chip.id)
        : `${chip.status.replace(/^[^:]+: /, "").replace(/^./, (letter) => letter.toUpperCase())}.`,
  }));
  const mechanics: PublicCandyMechanicsV7 | undefined = candyStatsV7(
    view,
    unit.id,
  ).candy;
  if (mechanics === undefined || unit.form !== "LAND") return lines;
  if (mechanics.rebake !== null)
    lines.push({
      id: "crumbs",
      name: "Crumbs",
      description: `When it falls it leaves Crumbs for ${numberWord(CRUMBS_TURNS_V7)} turns; a ${candyLabelV7("CAPTAIN")} within ${numberWord(REBAKE_REACH_V7)} tiles bakes it back for ${plural(mechanics.rebake.cost, "Coin")} at ${mechanics.rebake.hp} HP.${mechanics.crumbsBite > 0 ? ` An enemy that eats them takes ${mechanics.crumbsBite}.` : ""}`,
    });
  return lines;
}

/**
 * When a Stuck or Toothache entry of a visible unit wears off, from its
 * public `endsLeft`: "this turn" on its owner's turn with one End Turn
 * left, otherwise "its next turn".
 */
export function candyStatusWearsOffV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
  status: "stuck" | "toothache",
): string {
  const entry = view[status].find((candidate) => candidate.unitId === unit.id);
  const ownersTurn = view.turnOrder[view.activeSeatIndex] === unit.ownerId;
  return ownersTurn && entry?.endsLeft === 1 ? "this turn" : "its next turn";
}

/** The unit information sentence of a Stuck or Toothache unit. */
function candyStatusDescriptionV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  status: "stuck" | "toothache",
): string {
  const until = candyStatusWearsOffV7(view, unit, status);
  return status === "stuck"
    ? `It can move only ${numberWord(STUCK_MAX_STEPS_V7)} tile until the end of ${until}.`
    : `Its next attack is ${half(TOOTHACHE_ATTACK2_V7)} weaker; unused, it wears off at the end of ${until}.`;
}

// --------------------------------------------- Unavailable reasons ---

/**
 * Section 15.2 "Sugar Rush unavailable": why an own Candy unit that is not
 * done for the turn has no Sugar Rush ("Crashed", "Already moved", "Already
 * rushed"), from the engine's own legality test; null when it has one, is
 * not a Candy land unit, or is done.
 */
export function sugarRushUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  const rejection = sugarRushRejectionV7(view, unit);
  if (rejection === null || rejection.code === "UNIT_ROLE_INVALID") return null;
  if (rejection.code === "UNIT_CRASHED") return SUGAR_RUSH_CRASHED_V7;
  if (rejection.code === "SUGAR_RUSH_NOT_LEGAL")
    return rejection.reason === "RUSHED" ? SUGAR_RUSH_RUSHED_V7 : null;
  if (unit.activation.handled) return null;
  return unit.activation.moved ? SUGAR_RUSH_MOVED_V7 : SUGAR_RUSH_ACTED_V7;
}

/**
 * Section 15.2 "Re-bake unavailable": why an own Confectioner that could
 * still act has no Re-bake ("Crashed", "No home city", "No Crumbs within
 * two tiles", "No free tile next to it", "{city} is full", "Not enough
 * Coins"); null when it has one or cannot act at all. The Candy redesign
 * (`pulp_wars-jdb.12`, absorbing `pulp_wars-jdb.9`): the reason is the
 * engine's public "why not" query `queryRebakeBlockerV7`.
 */
export function rebakeUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
  cityName: (cityId: number) => string,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  if (unit.activation.handled && !unitIsCrashedForTextV7(view, unit))
    return null;
  switch (queryRebakeBlockerV7(view, unit.id)) {
    case "CRASHED":
      return SUGAR_RUSH_CRASHED_V7;
    case "NO_HOME":
      return REBAKE_NO_HOME_V7;
    case "NO_CRUMBS":
      return REBAKE_NO_CRUMBS_V7;
    case "TILE":
      return REBAKE_BLOCKED_V7;
    case "CITY_CAPACITY_FULL":
      return unit.homeCityId === null
        ? REBAKE_NO_HOME_V7
        : rebakeCityFullTextV7(capitalized(cityName(unit.homeCityId)));
    case "INSUFFICIENT_COINS":
      return REBAKE_NO_COINS_V7;
    default:
      return null;
  }
}

function unitIsCrashedForTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return candyActionRejectionV7(view, unit, "REBAKE") === "CRASHED";
}

/**
 * Section 15.2 "Sugar Toss unavailable": why an own Gunner that could still
 * act has no Sugar Toss ("Crashed", "No wounded unit within 2 tiles"); null
 * when it has one or cannot act at all.
 */
export function sugarTossUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  const rejection = candyActionRejectionV7(view, unit, "SUGAR_TOSS");
  if (rejection === "CRASHED") return SUGAR_RUSH_CRASHED_V7;
  if (rejection !== null || unit.activation.handled) return null;
  return SUGAR_TOSS_NO_TARGET_V7;
}

/**
 * The Candy redesign (section 8.2): why an own Confectioner that could
 * still act has no Top-Up ("Crashed", "No unit next to it needs a
 * Top-Up"); null when it has one or cannot act at all.
 */
export function topUpUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  const rejection = candyActionRejectionV7(view, unit, "TOP_UP");
  if (rejection === "CRASHED") return SUGAR_RUSH_CRASHED_V7;
  if (rejection !== null || unit.activation.handled) return null;
  return TOP_UP_NO_TARGET_V7;
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 15.2 "Field Defense unavailable": an own Toffee Trooper or Marshmallow
 * where a Human Fighter or Guard would be offered Build Field Defense. A
 * Candy viewer's Fortification is Home Sweet Home, so this explains the gap.
 */
export function candyFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  if (view.viewer.faction !== "CANDY") return false;
  let cached = FIELD_DEFENSE_BLOCK_CACHE.get(view);
  if (cached === undefined) {
    cached = new Set(
      view.units
        .filter((candidate) => {
          const activation = candidate.activation;
          const tile = view.board.tiles.find(
            (item) =>
              item.at.x === candidate.at.x && item.at.y === candidate.at.y,
          );
          return (
            candidate.ownerId === view.viewer.id &&
            candidate.form === "LAND" &&
            roleMechanicsV7(candidate.role, "ORIGINAL").buildsFieldDefense &&
            !roleMechanicsV7(candidate.role, "CANDY").buildsFieldDefense &&
            !activation.moved &&
            !activation.attacked &&
            !activation.recovered &&
            !activation.captured &&
            !activation.specialActed &&
            view.viewer.researchedTechs.includes("FORTIFICATION") &&
            tile?.explored === true &&
            tile.biome !== null &&
            tile.territoryOwnerId === view.viewer.id &&
            !tile.fieldDefense &&
            view.viewer.coins >= 3
          );
        })
        .map((candidate) => candidate.id),
    );
    FIELD_DEFENSE_BLOCK_CACHE.set(view, cached);
  }
  return cached.has(unitId);
}

// ------------------------------------------------- Section 15.3: Help ---

/**
 * Section 15.3: one sentence per rule, shown in Help for every viewer of a
 * match with a Candy seat. Labels and numbers come from the registry and
 * the engine constants; with the contract values these are the spec's
 * sentences.
 */
export function candyHelpRulesV7(): readonly (readonly [string, string])[] {
  const bouncers = (["GUARD", "JUGGERNAUT"] as const).map(candyLabelV7);
  return [
    [
      SUGAR_RUSH_LABEL_V7,
      `before it moves, a Candy unit may Rush: +${SUGAR_RUSH_MOVE_BONUS_V7} Move and +${half(SUGAR_RUSH_ATTACK2_V7)} Attack on its first attack this turn, but next turn it is Crashed and can't act.`,
    ],
    [
      CRASHED_LABEL_V7,
      "this unit can move but can't attack, capture, or use abilities this turn; it still strikes back.",
    ],
    [
      "Crumbs",
      `a fallen Candy unit leaves Crumbs for ${numberWord(CRUMBS_TURNS_V7)} turns; enemies that walk onto them eat them.`,
    ],
    [
      REBAKE_LABEL_V7,
      `the ${candyLabelV7("CAPTAIN")} scoops Crumbs within ${numberWord(REBAKE_REACH_V7)} tiles, even from under a unit, and bakes the unit back next to itself at half its price and half its HP; its city may go ${numberWord(REBAKE_OVER_CAPACITY_V7)} over its limit.`,
    ],
    [
      "Splat",
      `a unit hit by a ${candyLabelV7("CATAPULT")} can't strike back for the rest of the Candy turn.`,
    ],
    [
      "Bounce",
      `a melee attacker that hits a ${bouncers[0]} or a ${bouncers[1]} and survives is bounced one tile back.`,
    ],
    [
      SUGAR_TOSS_LABEL_V7,
      `the ${candyLabelV7("MARKSMAN")} heals an own unit within ${SUGAR_TOSS_RANGE_V7} tiles by ${SUGAR_TOSS_HEAL_V7}, once per unit per turn.`,
    ],
    [
      TOP_UP_LABEL_V7,
      `the ${candyLabelV7("CAPTAIN")} gives one neighbour a sugar top-up: it stops being Crashed, heals ${TOP_UP_HEAL_V7}, is cured, and thaws if Frozen.`,
    ],
    [
      STICKY_TOFFEE_LABEL_V7,
      `whatever a ${candyLabelV7("FIGHTER")} hits is Stuck until the end of its next turn: it can move only one tile.`,
    ],
    [
      GLAZE_TRAIL_LABEL_V7,
      `the tiles a ${candyLabelV7("RAIDER")} rolls off are Glazed for the rest of the turn, and your units move onto them at half cost.`,
    ],
    [
      RICOCHET_LABEL_V7,
      `a ${candyLabelV7("MARKSMAN")}'s shot from two tiles bounces on to the weakest enemy next to its target for half the damage.`,
    ],
    [
      BUNNY_HOP_LABEL_V7,
      `a ${candyLabelV7("KNIGHT")} can hop over one tile in its Move.`,
    ],
    [
      THUMP_LABEL_V7,
      `every attack a ${candyLabelV7("KNIGHT")} makes thumps ${THUMP_DAMAGE_V7} into every other enemy around it.`,
    ],
    [
      TOOTHACHE_LABEL_V7,
      `a unit that bites a ${candyLabelV7("SWORDSMAN")} gets Toothache: its next attack is ${half(TOOTHACHE_ATTACK2_V7)} weaker.`,
    ],
    [
      HOME_SWEET_HOME_LABEL_V7,
      `a Rushed unit that ends its turn on or ${HOME_SWEET_HOME_RADIUS_V7 === 1 ? "next to" : `within ${HOME_SWEET_HOME_RADIUS_V7} tiles of`} your city center doesn't Crash.`,
    ],
    [
      "Peppermint Surprise",
      `an enemy that eats your Crumbs takes ${PEPPERMINT_DAMAGE_V7} damage.`,
    ],
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the Jawbreaker's Rock Hard.
    ...ninthUnitHelpRulesV7("CANDY"),
  ];
}

export const CANDY_HELP_RULES_V7: readonly (readonly [string, string])[] =
  candyHelpRulesV7();

// ------------------------------------------- Abilities and commands ---

/** Candy ability names; other factions' names are unchanged. */
export function candyAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "CANDY") return null;
  switch (ability) {
    case "SUGAR_RUSH":
      return SUGAR_RUSH_LABEL_V7;
    case "BOUNCE":
      return BOUNCY_LABEL_V7;
    case "SPLAT":
      return "Splat";
    case "REBAKE":
      return REBAKE_LABEL_V7;
    case "SUGAR_TOSS":
      return SUGAR_TOSS_LABEL_V7;
    case "TOP_UP":
      return TOP_UP_LABEL_V7;
    case "STICKY":
      return STICKY_TOFFEE_LABEL_V7;
    case "GLAZE_TRAIL":
      return GLAZE_TRAIL_LABEL_V7;
    case "RICOCHET":
      return RICOCHET_LABEL_V7;
    case "HOP":
      return BUNNY_HOP_LABEL_V7;
    case "THUMP":
      return THUMP_LABEL_V7;
    case "TOOTHACHE":
      return TOOTHACHE_LABEL_V7;
    default:
      return null;
  }
}

/** One-sentence descriptions of the Candy abilities (unit information). */
export function candyAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "CANDY") return null;
  switch (ability) {
    case "SUGAR_RUSH":
      return `Before it moves: ${SUGAR_RUSH_TOOLTIP_V7}.`;
    case "BOUNCE":
      return "A melee attacker that hits it and survives springs one tile back.";
    case "SPLAT":
      return "A unit it hits can't strike back for the rest of the turn.";
    case "REBAKE":
      return `${REBAKE_TOOLTIP_V7}.`;
    case "SUGAR_TOSS":
      return `${SUGAR_TOSS_TOOLTIP_V7}.`;
    case "TOP_UP":
      return `${TOP_UP_TOOLTIP_V7}.`;
    case "STICKY":
      return "A unit it hits, or strikes back at, can move only one tile until the end of its next turn.";
    case "GLAZE_TRAIL":
      return "The tiles it rolls off are Glazed for the rest of the turn; your units move onto them at half cost.";
    case "RICOCHET":
      return "A shot from two tiles bounces on to the weakest enemy next to the target for half the damage.";
    case "HOP":
      return "Its Move may hop over one tile: a unit, a Forest, a Mountain, or a Rift, never water.";
    case "THUMP":
      return `Every attack it makes deals ${THUMP_DAMAGE_V7} to each other enemy around it.`;
    case "TOOTHACHE":
      return `A unit that attacks it from the next tile has its next attack ${half(TOOTHACHE_ATTACK2_V7)} weaker.`;
    default:
      return null;
  }
}

/** Candy command labels: Sugar Rush, Re-bake, Sugar Toss and Top-Up. */
export function candyCommandNameV7(kind: CommandV7["kind"]): string | null {
  if (kind === "SUGAR_RUSH") return SUGAR_RUSH_LABEL_V7;
  if (kind === "REBAKE") return REBAKE_LABEL_V7;
  if (kind === "SUGAR_TOSS") return SUGAR_TOSS_LABEL_V7;
  if (kind === "TOP_UP") return TOP_UP_LABEL_V7;
  return null;
}

/**
 * The technology unlock text of a Candy role (section 4, as the Candy
 * redesign changed it, RULESET_7_CANDY_REDESIGN.md section 8.3):
 * "Confectioner (Re-bake, Top-Up)", "Chocolate Bunny (Bunny Hop, Thump)",
 * from the role's registered abilities.
 */
export function candyRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "CANDY")
    .abilities as readonly string[];
  const named: readonly (readonly [string, string])[] = [
    ["STICKY", STICKY_TOFFEE_LABEL_V7],
    ["GLAZE_TRAIL", GLAZE_TRAIL_LABEL_V7],
    ["RICOCHET", RICOCHET_LABEL_V7],
    ["REBAKE", REBAKE_LABEL_V7],
    ["TOP_UP", TOP_UP_LABEL_V7],
    ["SUGAR_TOSS", SUGAR_TOSS_LABEL_V7],
    ["SPLAT", "Splat"],
    ["BOUNCE", "Bounce"],
    ["HOP", BUNNY_HOP_LABEL_V7],
    ["THUMP", THUMP_LABEL_V7],
    ["TOOTHACHE", TOOTHACHE_LABEL_V7],
  ];
  const notes = named
    .filter(([ability]) => abilities.includes(ability))
    .map(([, label]) => label);
  const label = candyLabelV7(role);
  return notes.length === 0
    ? `Train ${label}`
    : `Train ${label} (${notes.join(", ")})`;
}

/** The Candy technology unlock texts of section 4. */
export const CONFECTIONER_SUPPORT_UNLOCK_TEXT_V7 = `${candyLabelV7("CAPTAIN")}s Re-bake a fallen unit from its Crumbs or Top Up a neighbour`;
export const HOME_SWEET_HOME_UNLOCK_TEXT_V7 =
  "Rushed units that end the turn on or next to your city centers don't Crash";
export const PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7 = `Enemies that eat your Crumbs take ${PEPPERMINT_DAMAGE_V7}`;

/** Recruit-help notes of a Candy role, from its registration. */
export function candyRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "CANDY" || isNavalRoleV7(role)) return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.leavesCrumbs
      ? [
          `Leaves Crumbs: Re-bake for ${plural(rebakePriceV7(role) ?? 0, "Coin")}.`,
        ]
      : []),
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense &&
    !mechanics.buildsFieldDefense
      ? [`${CANDY_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

// ------------------------------------------------- Attack previews ---

/** One unit an attack's Ricochet or Thump also hits, by its unit ID. */
export interface CandyCombatHitV7 {
  readonly unitId: number;
  readonly kind: "RICOCHET" | "THUMP";
  /** "−2" (with what a Shield takes: "−1 +1 sh"). */
  readonly label: string;
  readonly lethal: boolean;
}

/** The Candy lines of one attack preview (section 15.1). */
export interface CandyCombatLinesV7 {
  /**
   * "Sugar Rush +1", "Splat: ...", "No strike-back: Splatted", the Bounce;
   * the Candy redesign's Sticky Toffee, Toothache, Ricochet and Thump.
   */
  readonly notes: readonly string[];
  /** The attacker's tile after the Bounce, or that the Bounce is blocked. */
  readonly bounce: {
    readonly to: CoordV7 | null;
    readonly blocked: boolean;
  } | null;
  /** The Candy redesign: the other units the Ricochet or Thump hits. */
  readonly hits: readonly CandyCombatHitV7[];
}

function hitLabel(entry: {
  readonly damage: number;
  readonly shieldDamage: number;
}): string {
  return `−${entry.damage}${entry.shieldDamage > 0 ? ` +${entry.shieldDamage} sh` : ""}`;
}

/**
 * Section 15.1 "previews", from the public combat preview only. Empty for
 * an exchange without any of them. The Candy redesign (section 14) adds
 * "Sticky Toffee: target Stuck" (or the attacker), the Toothache the
 * attacker gets or uses, "Ricochet −n" and "Thump −2 to n", each hit unit
 * named in `hits`.
 */
export function candyCombatLinesV7(
  preview: Pick<
    CombatPreviewV7,
    | "sugarRushApplied"
    | "splatApplied"
    | "noRetaliationReason"
    | "bounce"
    | "bounceTo"
  > &
    Partial<
      Pick<
        CombatPreviewV7,
        | "stuckApplied"
        | "toothacheApplied"
        | "toothacheAttack"
        | "ricochet"
        | "thump"
        | "thumpUncertain"
      >
    >,
): CandyCombatLinesV7 {
  const notes: string[] = [];
  if (preview.sugarRushApplied) notes.push(RUSH_PREVIEW_V7);
  if (preview.toothacheAttack === true) notes.push(TOOTHACHE_ATTACK_PREVIEW_V7);
  if (preview.splatApplied) notes.push(SPLAT_PREVIEW_V7);
  if (preview.noRetaliationReason === "SPLATTED")
    notes.push(SPLATTED_PREVIEW_V7);
  if (preview.stuckApplied === "TARGET" || preview.stuckApplied === "BOTH")
    notes.push(STUCK_TARGET_PREVIEW_V7);
  if (preview.stuckApplied === "ATTACKER" || preview.stuckApplied === "BOTH")
    notes.push(STUCK_ATTACKER_PREVIEW_V7);
  if (preview.toothacheApplied === true) notes.push(TOOTHACHE_GIVEN_PREVIEW_V7);
  if (preview.bounce === "WILL_BOUNCE") notes.push(BOUNCES_PREVIEW_V7);
  else if (preview.bounce === "BLOCKED") notes.push(BOUNCE_BLOCKED_PREVIEW_V7);
  else if (preview.bounce === "UNKNOWN_BEHIND_FOG")
    notes.push(BOUNCE_UNKNOWN_PREVIEW_V7);
  const hits: CandyCombatHitV7[] = [];
  const ricochet = preview.ricochet ?? null;
  if (ricochet !== null) {
    notes.push(ricochetPreviewV7(ricochet.damage + ricochet.shieldDamage));
    hits.push({
      unitId: ricochet.unitId,
      kind: "RICOCHET",
      label: hitLabel(ricochet),
      lethal: ricochet.dies,
    });
  }
  const thump = preview.thump ?? [];
  if (thump.length > 0) {
    notes.push(
      thumpPreviewV7(
        thump.map((hit) => ({ damage: hit.damage + hit.shieldDamage })),
      ),
    );
    for (const hit of thump)
      hits.push({
        unitId: hit.unitId,
        kind: "THUMP",
        label: hitLabel(hit),
        lethal: hit.dies,
      });
  }
  if (preview.thumpUncertain === true) notes.push(THUMP_UNCERTAIN_PREVIEW_V7);
  return {
    hits,
    notes,
    bounce:
      preview.bounce === "WILL_BOUNCE"
        ? { to: preview.bounceTo, blocked: false }
        : preview.bounce === "BLOCKED"
          ? { to: null, blocked: true }
          : null,
  };
}

// ------------------------------------------------------- Log lines ---

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy's" : `Player ${player.seat + 1}'s`;
}

/** "You" for the viewer, otherwise "Player N". */
function subject(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "You";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "An enemy" : `Player ${player.seat + 1}`;
}

/**
 * Section 15.2 log lines of one projected boundary: a Rush, the Crash (a
 * count), a Re-bake, Crumbs eaten (with the Peppermint damage), Crumbs gone
 * stale, a Sugar Toss, a Splat and a Bounce; the Candy redesign's (section
 * 14) "{unit} is stuck in toffee", "{unit} has a toothache", "{unit}
 * ricocheted onto {unit} (−n)", "{unit} thumped n units" and "{owner}
 * Confectioner topped up a {unit}". A match without a Candy seat never
 * emits these, so its notices are unchanged.
 */
export function candyBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasCandySeatV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id);
  const nameOf = (id: number | null): string => {
    const unit = id === null ? undefined : unitById(id);
    return unit === undefined ? "unit" : unitRoleRuleV7(after, unit).label;
  };
  const owner = (playerId: number): string =>
    capitalized(possessive(after, playerId));
  for (const event of events) {
    if (event.kind === "UNIT_SUGAR_RUSHED") {
      parts.push(
        `${owner(event.playerId)} ${nameOf(event.unitId)} went on a Sugar Rush`,
      );
    } else if (event.kind === "UNITS_CRASHED") {
      if (event.crashedUnitIds.length === 0) continue;
      parts.push(
        `${subject(after, event.playerId)}: ${plural(event.crashedUnitIds.length, "unit")} crashed`,
      );
    } else if (event.kind === "UNIT_REBAKED") {
      const name = candyLabelV7(event.role);
      parts.push(
        `${owner(event.playerId)} ${candyLabelV7("CAPTAIN")} re-baked ${article(name)} ${name}`,
      );
    } else if (event.kind === "CRUMBS_EATEN") {
      const eater = nameOf(event.unitId);
      if (event.playerId === viewerId) toast = true;
      parts.push(
        `${capitalized(eater)} ate ${possessive(after, event.playerId)} Crumbs${event.damage !== null && event.damage > 0 ? `; Peppermint Surprise: ${eater} −${event.damage}` : ""}`,
      );
    } else if (event.kind === "CRUMBS_STALE") {
      parts.push(`${owner(event.playerId)} Crumbs went stale`);
    } else if (event.kind === "SUGAR_TOSSED") {
      const name = nameOf(event.targetUnitId);
      parts.push(
        `${owner(event.playerId)} ${candyLabelV7("MARKSMAN")} tossed sugar to ${article(name)} ${name} (+${event.amount})`,
      );
    } else if (event.kind === "UNIT_STUCK") {
      parts.push(`${capitalized(nameOf(event.unitId))} is stuck in toffee`);
    } else if (event.kind === "TOOTHACHE_GIVEN") {
      parts.push(`${capitalized(nameOf(event.unitId))} has a toothache`);
    } else if (event.kind === "RICOCHETED") {
      parts.push(
        `${capitalized(nameOf(event.unitId))} ricocheted onto ${nameOf(event.targetUnitId)} (−${event.damage + event.shieldDamage})`,
      );
    } else if (event.kind === "THUMPED") {
      if (event.hits.length > 0)
        parts.push(
          `${capitalized(nameOf(event.unitId))} thumped ${plural(event.hits.length, "unit")}`,
        );
    } else if (event.kind === "UNIT_TOPPED_UP") {
      const name = nameOf(event.targetUnitId);
      parts.push(
        `${owner(event.playerId)} ${candyLabelV7("CAPTAIN")} topped up ${article(name)} ${name}`,
      );
    } else if (event.kind === "COMBAT_RESOLVED") {
      if (event.preview.splatApplied)
        parts.push(
          `${capitalized(nameOf(event.preview.targetUnitId))} was Splatted`,
        );
      if (event.preview.bounce === "WILL_BOUNCE")
        parts.push(
          `${capitalized(nameOf(event.preview.attackerId))} bounced back`,
        );
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
