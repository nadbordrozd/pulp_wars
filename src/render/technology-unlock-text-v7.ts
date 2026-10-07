import {
  BLAST_MOUNTAIN_COST_V7,
  BLAST_MOUNTAIN_DAMAGE_V7,
  BLAST_MOUNTAIN_POPULATION_V7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
  PILLAGE_COINS_V7,
  technologyCapabilitiesV7,
  type CityId,
  type CombatPreviewV7,
  type PlayerViewV7,
} from "../engine/index";

/**
 * Tunings 1 to 3 (`pulp_wars-w49.3`, identities 7r46 and 7r47;
 * docs/product/RULESET_7_TUNING_1.md): the sentences for the rules those
 * tunings changed or made visible. The browser
 * (`src/render/dom/app-view-v7.ts`, the board renderer) and the text-mode
 * harness (`scripts/play-text-v7.ts`) print the same ones, so this module
 * imports the engine only.
 */

/** Explosives, `MELEE_FIELD_DEMOLITION`. */
export const BREACH_UNLOCK_TEXT_V7 =
  "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense";

/**
 * Explosives, the `BLAST_MOUNTAIN` command. Tuning 3: the blast damages
 * every unit on the Mountain and around it, and may be set off next to an
 * own unit outside the player's territory.
 */
export const BLAST_MOUNTAIN_UNLOCK_TEXT_V7 = `Blast Mountain (${BLAST_MOUNTAIN_COST_V7} Coins): a Mountain in your territory or next to one of your units becomes Grass, and every unit on it or next to it takes ${BLAST_MOUNTAIN_DAMAGE_V7} damage, yours too except the one that sets it; in your territory its city gains +${BLAST_MOUNTAIN_POPULATION_V7} population`;

/** Tuning 3: the short reminder on a Blast Mountain button and preview. */
export const BLAST_MOUNTAIN_DAMAGE_NOTE_V7 = `${BLAST_MOUNTAIN_DAMAGE_V7} damage on and around the tile, to your units too except the one that sets it`;
/**
 * Tuning 5 (`pulp_wars-w49.4`): the unit that sets the charge (the
 * player's weakest land unit next to the Mountain) is not hit.
 */
export const BLAST_MOUNTAIN_SETTER_NOTE_V7 = "sets the charge and is not hit";

/** Tuning 4: the warning on a Blast Mountain of an Ore Mountain. */
export const BLAST_ORE_WARNING_V7 =
  "Ore here: blasting it gives up a Mine (+2 population)";

/** Forestry, `FOREST_COVER` (tuning 3). */
export const FOREST_COVER_UNLOCK_TEXT_V7 =
  "Forest cover: your units in Forest defend at ×1.5";

/** Fieldcraft, `FOREST_MARCH` (tuning 4). */
export const FOREST_MARCH_UNLOCK_TEXT_V7 =
  "Forest march: none of your units stops on entering Forest";

/**
 * Tuning 4: the Barracks and Scouts reward lines. Tuning 5
 * (`pulp_wars-w49.4`): a Barracks no longer drills.
 */
export const BARRACKS_REWARD_TEXT_V7 = "+1 unit in this city";
export const SCOUTS_REWARD_TEXT_V7 = "Reveal the area and a free Raider";
/** The Goblin pass (7r50): the same reward with the faction's own unit. */
export function scoutsRewardTextV7(raiderLabel: string): string {
  return `Reveal the area and a free ${raiderLabel}`;
}

/** Raiding, the `PILLAGE` command (tuning 4). */
export function pillageUnlockTextV7(escaperLabel: string | null): string {
  return `Pillage: destroy an enemy building under your unit for +${PILLAGE_COINS_V7} Coins${escaperLabel === null ? "" : `; a ${escaperLabel} may still move away afterwards`}`;
}

/** Tuning 4: the Human Raider's own rule (role help and unit lines). */
export const RAIDER_SLIPS_TEXT_V7 =
  "Slips past: enemy zones of control do not stop it";

/**
 * Tuning 5 (`pulp_wars-w49.4`): the Human Guard's rule, with its Defense in
 * half-points against an attack from two or more tiles.
 */
export function openToRangedTextV7(rangedDefense2: number): string {
  return `Open to ranged: Defense ${rangedDefense2 / 2} against attacks from 2 or more tiles`;
}
/**
 * The Undead pass (`pulp_wars-w49.13`, 7r51): Bones, the Skeleton's rule:
 * a Defense against attacks from two or more tiles above its own.
 */
export function bonesTextV7(rangedDefense2: number): string {
  return `Bones: Defense ${rangedDefense2 / 2} against attacks from 2 or more tiles`;
}
/**
 * A role's Defense against attacks from two or more tiles, as its rule
 * reads: Open to ranged when it is below the role's Defense (the Human
 * Guard), Bones when it is above (the Undead Skeleton).
 */
export function rangedDefenseTextV7(
  rangedDefense2: number,
  defense2: number,
): string {
  return rangedDefense2 > defense2
    ? bonesTextV7(rangedDefense2)
    : openToRangedTextV7(rangedDefense2);
}
/** The Undead pass: the short word of the same rule on a combat line. */
export function rangedDefenseWordV7(
  rangedDefense2: number,
  defense2: number,
): string {
  return rangedDefense2 > defense2 ? "bones" : "open to ranged";
}
/**
 * The Undead pass, correction (`pulp_wars-w49.13`): Carrion, the Ghoul's
 * rule, with its bonus in half-points.
 */
export function carrionTextV7(carrionBonus2: number): string {
  return `Carrion: +${carrionBonus2 / 2} Attack against a Bitten or Plagued unit`;
}
/** The Undead pass, correction: a Lich plagues only with Pestilence. */
export const PLAGUE_NEEDS_TEXT_V7 = "Plague needs Pestilence";
/**
 * The Undead pass, correction: why a unit with a low Attack strikes back
 * hard (a Guard deals a Skeleton 3 attacking and 8 striking back), with the
 * Defense in half-points. For the unit line of a role whose Defense is
 * above its Attack.
 */
export function strikesBackTextV7(defense2: number): string {
  return `strikes back with its Defense ${defense2 / 2}, not its Attack`;
}
/** Tuning 5: when a Charge applies, on the unit line of a charging unit. */
export const CHARGE_CONDITION_TEXT_V7 =
  "Charge: +1 Attack after a move of 2 tiles (needs Raiding)";

/** Tuning 4: the unit-line reminders of two role rules. */
export const NO_MOVE_AND_ATTACK_TEXT_V7 =
  "cannot move and attack in the same turn";
export const OVERRUN_BUDGET_TEXT_V7 =
  "Overrun: after a kill it advances onto the victim's tile and may attack again from there, with no limit; a hit that does not kill ends it, and so does a kill it cannot advance after (a tile it cannot enter, a victim that rises in place)";

/**
 * Tuning 4: a Land Grant the city could take but the player cannot pay
 * for yet (the offer and its price stay visible).
 */
export function landGrantUnaffordableTextV7(
  cost: number,
  tiles: number,
): string {
  return `Land grant: ${cost} Coins for ${tiles} ${tiles === 1 ? "tile" : "tiles"}. Not enough Coins`;
}

/** Commerce, the `HIRE` command (tuning 3). */
export const HIRE_UNLOCK_TEXT_V7 =
  "Hire: each Market hires one extra unit a turn on its tile, at 1.5× the price; its city may hold 1 unit above its limit";

/** Fortification, the `BUILD_FIELD_DEFENSE` command. */
export const FIELD_DEFENSE_UNLOCK_TEXT_V7 = `Build Field Defense: +${FIELD_DEFENSE_FORTIFICATION_LEVELS_V7} Defense for the unit on it; the builder keeps its move and attack`;

/**
 * Commerce, `LAND_TRADE_INCOME`. Tuning 3: every city that a Road links to
 * another city of the player earns it, the first capital included (the
 * capital rule of tuning 2 is gone).
 */
export function landTradeUnlockTextV7(coins: number): string {
  return `Each city linked by Road to another of your cities: +${coins} ${coins === 1 ? "Coin" : "Coins"} each turn`;
}

/**
 * Tuning 2 (7r47): the note of an attack preview that kills, for every
 * faction: whether the surviving attacker takes the killed unit's tile (a
 * ranged unit never does).
 */
export const ADVANCES_PREVIEW_V7 = "Advances";
export const STAYS_PREVIEW_V7 = "Stays";
export function advanceCombatNotesV7(
  preview: Pick<CombatPreviewV7, "advances" | "defenderDies" | "attackerDies">,
): readonly string[] {
  if (!preview.defenderDies || preview.attackerDies) return [];
  return [preview.advances ? ADVANCES_PREVIEW_V7 : STAYS_PREVIEW_V7];
}

/** Tuning 2: why a city with a unit on its center shows no training. */
export const TRAINING_BLOCKED_CENTER_V7 =
  "Training blocked: a unit is on the city center";

/**
 * How Commerce's land trade stands for one of the viewer's cities, as the
 * engine pays it (`landTradeCityIdsV7`; tuning 3): a city earns while a Road
 * links it to at least one other city of the viewer. `null` without the
 * land trade capability (no Commerce; Goblins).
 */
export type LandTradeStatusV7 =
  | { readonly kind: "PAYS"; readonly coins: number }
  | { readonly kind: "NOT_LINKED" };

export function landTradeStatusV7(
  view: PlayerViewV7,
  cityId: CityId,
): LandTradeStatusV7 | null {
  const coins = technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).landTradeIncomeCoins;
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (coins === 0 || city?.ownerId !== view.viewer.id) return null;
  return view.naval.landTradeCityIds.includes(cityId)
    ? { kind: "PAYS", coins }
    : { kind: "NOT_LINKED" };
}

/** The short line of a land trade status (city panel and text harness). */
export function landTradeStatusTextV7(status: LandTradeStatusV7): string {
  return status.kind === "PAYS"
    ? `Land trade +${status.coins}: linked by Road to another of your cities`
    : "No land trade: no Road link to another of your cities";
}
