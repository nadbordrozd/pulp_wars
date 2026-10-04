import {
  CRUMBS_TURNS_V7,
  HOME_SWEET_HOME_RADIUS_V7,
  PEPPERMINT_DAMAGE_V7,
  SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  SUGAR_RUSH_ATTACK2_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  SUGAR_TOSS_HEAL_V7,
  SUGAR_TOSS_RANGE_V7,
  allOwnedUnitsV7,
  candyActionRejectionV7,
  cityUnitCapacityForV7,
  effectiveRoleRuleV7,
  rebakeCrumbsV7,
  rebakePriceV7,
  roleMechanicsV7,
  seatRoleMechanicsV7,
  standsByOwnCenterV7,
  sugarRushRejectionV7,
  unitCapacitySlotsV7,
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
  type UnitRoleIdV7,
} from "../engine/index";

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
const TIMES = ["never", "once", "twice"] as const;
const timesWord = (value: number): string =>
  TIMES[value] ?? `${numberWord(value)} times`;

// ------------------------------------------------ Section 15.2: text ---

export const SUGAR_RUSH_LABEL_V7 = "Sugar Rush";
export const SUGAR_RUSH_TOOLTIP_V7 = `+${SUGAR_RUSH_MOVE_BONUS_V7} Move and +${half(SUGAR_RUSH_ATTACK2_V7)} Attack on its first attack this turn. Next turn it Crashes and can't act`;
export const RUSHED_LABEL_V7 = "Rushed";
export const RUSHED_STATUS_V7 = `Rushed: +${SUGAR_RUSH_MOVE_BONUS_V7} Move, +${half(SUGAR_RUSH_ATTACK2_V7)} Attack on its first attack`;
export const RUSHED_ESCAPE_STATUS_V7 = "Rushed: may move again after attacking";
export const SUGAR_FRENZY_LABEL_V7 = "Sugar Frenzy";
export const SUGAR_FRENZY_STATUS_V7 = `Sugar Frenzy: attacks again after a kill, ${timesWord(SUGAR_FRENZY_MAX_CONTINUATIONS_V7)} at most`;
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
export const REBAKE_TOOLTIP_V7 =
  "Bake the unit in adjacent Crumbs back at half price and half HP. Uses a slot in its city";
export const REBAKE_NO_CRUMBS_V7 = "No Crumbs next to it";
export const REBAKE_NO_COINS_V7 = "Not enough Coins";
export const REBAKE_NO_HOME_V7 = "No home city";
export const REBAKE_BLOCKED_V7 = "The Crumbs are covered";
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

export const FROSTING_LABEL_V7 = "Frosting";
export const FROSTING_TOOLTIP_V7 = `Heal adjacent units by ${SUGAR_TOSS_HEAL_V7}. Cures Plague, bites, and frost`;

export const RUSH_PREVIEW_V7 = `Sugar Rush +${half(SUGAR_RUSH_ATTACK2_V7)}`;
export const SPLAT_PREVIEW_V7 = "Splat: no strike-back this turn";
export const SPLATTED_PREVIEW_V7 = "No strike-back: Splatted";
export const BOUNCES_PREVIEW_V7 = "Bounces back";
export const BOUNCE_BLOCKED_PREVIEW_V7 = "Bounce blocked";
export const BOUNCE_UNKNOWN_PREVIEW_V7 = "May bounce back";
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
  "rushed" | "crashed" | "splatted" | "tossedThisTurn" | "candy"
> {
  return view.unitStats.find((stats) => stats.unitId === unitId) ?? {};
}

/**
 * Section 5.4, the cap as pips: how many Sugar Frenzy continuations a
 * Rushed Gummy Bear still has (of `SUGAR_FRENZY_MAX_CONTINUATIONS_V7`), from
 * its public activation; null for every other unit.
 */
export function sugarFrenzyPipsV7(
  unit: Pick<PublicUnitV7, "form" | "activation">,
  stats: Pick<PublicUnitStatsV7, "rushed" | "candy">,
): { readonly left: number; readonly of: number } | null {
  if (
    unit.form !== "LAND" ||
    stats.rushed !== true ||
    stats.candy?.rushPerk !== "SUGAR_FRENZY"
  )
    return null;
  const used = Math.max(0, unit.activation.attacksUsed - 1);
  return {
    left: Math.max(0, SUGAR_FRENZY_MAX_CONTINUATIONS_V7 - used),
    of: SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  };
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
  readonly id: "rushed" | "home-sweet-home" | "crashed" | "splatted";
  readonly label: string;
  /** The one sentence of section 15.2: the tooltip and accessible name. */
  readonly status: string;
  /** The status icon of the Candy art, or the technology's house. */
  readonly icon:
    | "ICON:STATUS:RUSHED"
    | "ICON:STATUS:CRASHED"
    | "ICON:STATUS:SPLATTED"
    | "ICON:TECH:CANDY:FORTIFICATION";
  /** Sugar Frenzy: the continuations left, drawn as pips. */
  readonly pips?: { readonly left: number; readonly of: number };
}

/**
 * The Candy chips of a visible unit of any owner (section 15.2): Rushed
 * (by its perk), Home Sweet Home, Crashed (by whose turn it is) and
 * Splatted. Empty in a match without a Candy seat.
 */
export function candyChipsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CandyChipV7[] {
  const stats = candyStatsV7(view, unit.id);
  const chips: CandyChipV7[] = [];
  if (stats.rushed === true) {
    const pips = sugarFrenzyPipsV7(unit, stats);
    chips.push(
      pips !== null
        ? {
            id: "rushed",
            label: SUGAR_FRENZY_LABEL_V7,
            status: SUGAR_FRENZY_STATUS_V7,
            icon: "ICON:STATUS:RUSHED",
            pips,
          }
        : {
            id: "rushed",
            label: RUSHED_LABEL_V7,
            status:
              stats.candy?.rushPerk === "ESCAPE"
                ? RUSHED_ESCAPE_STATUS_V7
                : RUSHED_STATUS_V7,
            icon: "ICON:STATUS:RUSHED",
          },
    );
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
    description: `${chip.status.replace(/^[^:]+: /, "").replace(/^./, (letter) => letter.toUpperCase())}.`,
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
      description: `When it falls it leaves Crumbs for ${numberWord(CRUMBS_TURNS_V7)} turns; a ${candyLabelV7("CAPTAIN")} next to them bakes it back for ${plural(mechanics.rebake.cost, "Coin")} at ${mechanics.rebake.hp} HP.${mechanics.crumbsBite > 0 ? ` An enemy that eats them takes ${mechanics.crumbsBite}.` : ""}`,
    });
  return lines;
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
 * still act has no Re-bake ("Crashed", "No home city", "No Crumbs next to
 * it", "{city} is full", "Not enough Coins"); null when it has one or cannot
 * act at all. Legality is the offered command's; this only names the first
 * reason, read with the engine's own helpers from the public view.
 */
export function rebakeUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
  cityName: (cityId: number) => string,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  const rejection = candyActionRejectionV7(view, unit, "REBAKE");
  if (rejection === "CRASHED") return SUGAR_RUSH_CRASHED_V7;
  if (rejection !== null || unit.activation.handled) return null;
  const home = view.cities.find(
    (city) => city.id === unit.homeCityId && city.ownerId === view.viewer.id,
  );
  if (home === undefined) return REBAKE_NO_HOME_V7;
  const crumbs = rebakeCrumbsV7(view.crumbs, view.viewer.id, unit.at);
  if (crumbs.length === 0) return REBAKE_NO_CRUMBS_V7;
  const capacity = cityUnitCapacityForV7(
    home.level,
    view.viewer.researchedTechs,
    view.viewer.faction,
  );
  const used = allOwnedUnitsV7(view, view.viewer.id)
    .filter((candidate) => candidate.homeCityId === home.id)
    .reduce((sum, candidate) => sum + unitCapacitySlotsV7(view, candidate), 0);
  if (
    crumbs.every(
      (entry) =>
        used +
          seatRoleMechanicsV7(view, view.viewer.id, entry.role).capacitySlots >
        capacity,
    )
  )
    return rebakeCityFullTextV7(capitalized(cityName(home.id)));
  if (
    crumbs.every(
      (entry) => view.viewer.coins < (rebakePriceV7(entry.role) ?? Infinity),
    )
  )
    return REBAKE_NO_COINS_V7;
  return REBAKE_BLOCKED_V7;
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

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 15.2 "Field Defense unavailable": an own Gumdrop or Marshmallow
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
      `the ${candyLabelV7("CAPTAIN")} bakes the unit in adjacent Crumbs back, at half its price and half its HP.`,
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
      FROSTING_LABEL_V7,
      `the ${candyLabelV7("CAPTAIN")} heals adjacent units by ${SUGAR_TOSS_HEAL_V7} and cures Plague, bites, and Chill.`,
    ],
    [
      SUGAR_FRENZY_LABEL_V7,
      `a Rushed ${candyLabelV7("KNIGHT")} attacks again after a kill, up to ${numberWord(SUGAR_FRENZY_MAX_CONTINUATIONS_V7 + 1)} attacks in a turn.`,
    ],
    [
      candyLabelV7("RAIDER"),
      `a Rushed ${candyLabelV7("RAIDER")} may move again after attacking.`,
    ],
    [
      HOME_SWEET_HOME_LABEL_V7,
      `a Rushed unit that ends its turn on or ${HOME_SWEET_HOME_RADIUS_V7 === 1 ? "next to" : `within ${HOME_SWEET_HOME_RADIUS_V7} tiles of`} your city center doesn't Crash.`,
    ],
    [
      "Peppermint Surprise",
      `an enemy that eats your Crumbs takes ${PEPPERMINT_DAMAGE_V7} damage.`,
    ],
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
    case "TEND_WOUNDED":
      return FROSTING_LABEL_V7;
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
    case "TEND_WOUNDED":
      return `${FROSTING_TOOLTIP_V7}.`;
    default:
      return null;
  }
}

/** Candy command labels: Sugar Rush, Re-bake, Sugar Toss and Frosting. */
export function candyCommandNameV7(
  kind: CommandV7["kind"],
  faction: FactionIdV7,
): string | null {
  if (kind === "SUGAR_RUSH") return SUGAR_RUSH_LABEL_V7;
  if (kind === "REBAKE") return REBAKE_LABEL_V7;
  if (kind === "SUGAR_TOSS") return SUGAR_TOSS_LABEL_V7;
  if (kind === "TEND_WOUNDED" && faction === "CANDY") return FROSTING_LABEL_V7;
  return null;
}

/**
 * The technology unlock text of a Candy role (section 4): "Confectioner
 * (Frosting, Re-bake)", "Gummy Bear (Sugar Frenzy while Rushed)", from the
 * role's registered abilities and mechanics.
 */
export function candyRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "CANDY")
    .abilities as readonly string[];
  const perk = roleMechanicsV7(role, "CANDY").rushPerk;
  const notes = [
    ...(abilities.includes("TEND_WOUNDED") ? [FROSTING_LABEL_V7] : []),
    ...(abilities.includes("REBAKE") ? [REBAKE_LABEL_V7] : []),
    ...(abilities.includes("SUGAR_TOSS") ? [SUGAR_TOSS_LABEL_V7] : []),
    ...(abilities.includes("SPLAT") ? ["Splat"] : []),
    ...(abilities.includes("BOUNCE") ? ["Bounce"] : []),
    ...(perk === "SUGAR_FRENZY"
      ? [`${SUGAR_FRENZY_LABEL_V7} while Rushed`]
      : []),
  ];
  const label = candyLabelV7(role);
  return notes.length === 0
    ? `Train ${label}`
    : `Train ${label} (${notes.join(", ")})`;
}

/** The Candy technology unlock texts of section 4. */
export const CONFECTIONER_SUPPORT_UNLOCK_TEXT_V7 = `${candyLabelV7("CAPTAIN")}s Frost nearby troops or Re-bake a fallen unit from its Crumbs`;
export const HOME_SWEET_HOME_UNLOCK_TEXT_V7 =
  "Rushed units that end the turn on or next to your city centers don't Crash";
export const PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7 = `Enemies that eat your Crumbs take ${PEPPERMINT_DAMAGE_V7}`;

/** Recruit-help notes of a Candy role, from its registration. */
export function candyRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "CANDY" || role === "PATROL_BOAT" || role === "BATTLESHIP")
    return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.rushPerk === "ESCAPE"
      ? ["Rushed, it may move again after attacking."]
      : []),
    ...(mechanics.rushPerk === "SUGAR_FRENZY"
      ? [
          `Rushed, it attacks again after a kill, ${timesWord(SUGAR_FRENZY_MAX_CONTINUATIONS_V7)} at most.`,
        ]
      : []),
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

/** The Candy lines of one attack preview (section 15.1). */
export interface CandyCombatLinesV7 {
  /** "Sugar Rush +1", "Splat: ...", "No strike-back: Splatted", the Bounce. */
  readonly notes: readonly string[];
  /** The attacker's tile after the Bounce, or that the Bounce is blocked. */
  readonly bounce: {
    readonly to: CoordV7 | null;
    readonly blocked: boolean;
  } | null;
}

/**
 * Section 15.1 "previews", from the public combat preview only. Empty for
 * an exchange without any of them.
 */
export function candyCombatLinesV7(
  preview: Pick<
    CombatPreviewV7,
    | "sugarRushApplied"
    | "splatApplied"
    | "noRetaliationReason"
    | "bounce"
    | "bounceTo"
  >,
): CandyCombatLinesV7 {
  const notes: string[] = [];
  if (preview.sugarRushApplied) notes.push(RUSH_PREVIEW_V7);
  if (preview.splatApplied) notes.push(SPLAT_PREVIEW_V7);
  if (preview.noRetaliationReason === "SPLATTED")
    notes.push(SPLATTED_PREVIEW_V7);
  if (preview.bounce === "WILL_BOUNCE") notes.push(BOUNCES_PREVIEW_V7);
  else if (preview.bounce === "BLOCKED") notes.push(BOUNCE_BLOCKED_PREVIEW_V7);
  else if (preview.bounce === "UNKNOWN_BEHIND_FOG")
    notes.push(BOUNCE_UNKNOWN_PREVIEW_V7);
  return {
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
 * stale, a Sugar Toss, a Splat and a Bounce. A match without a Candy seat
 * never emits these, so its notices are unchanged.
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
