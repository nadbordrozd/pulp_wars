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
export const BLAST_MOUNTAIN_UNLOCK_TEXT_V7 = `Blast Mountain (${BLAST_MOUNTAIN_COST_V7} Coins): a Mountain in your territory or next to one of your units becomes Grass, and every unit on it or next to it takes ${BLAST_MOUNTAIN_DAMAGE_V7} damage, yours too; in your territory its city gains +${BLAST_MOUNTAIN_POPULATION_V7} population`;

/** Tuning 3: the short reminder on a Blast Mountain button and preview. */
export const BLAST_MOUNTAIN_DAMAGE_NOTE_V7 = `${BLAST_MOUNTAIN_DAMAGE_V7} damage on and around the tile, to your units too`;

/** Tuning 4: the warning on a Blast Mountain of an Ore Mountain. */
export const BLAST_ORE_WARNING_V7 =
  "Ore here: blasting it gives up a Mine (+2 population)";

/** Forestry, `FOREST_COVER` (tuning 3). */
export const FOREST_COVER_UNLOCK_TEXT_V7 =
  "Forest cover: your units in Forest defend at ×1.5";

/** Fieldcraft, `FOREST_MARCH` (tuning 4). */
export const FOREST_MARCH_UNLOCK_TEXT_V7 =
  "Forest march: none of your units stops on entering Forest";

/** Tuning 4: the Barracks and Scouts reward lines. */
export const BARRACKS_REWARD_TEXT_V7 =
  "+1 unit in this city; units on its center can Drill";
/** The Drill button's label and tooltip (`DRILL_UNIT`). */
export function drillLabelV7(cost: number): string {
  return `Drill (${cost} Coins)`;
}
export function drillTooltipV7(cost: number, hp: number): string {
  return `Drill: for ${cost} Coins the unit becomes a veteran, +${hp} HP and maximum HP, and its turn ends`;
}
export const SCOUTS_REWARD_TEXT_V7 = "Reveal the area and a free Raider";

/** Raiding, the `PILLAGE` command (tuning 4). */
export function pillageUnlockTextV7(escaperLabel: string | null): string {
  return `Pillage: destroy an enemy building under your unit for +${PILLAGE_COINS_V7} Coins${escaperLabel === null ? "" : `; a ${escaperLabel} may still move away afterwards`}`;
}

/** Tuning 4: the Human Raider's own rule (role help and unit lines). */
export const RAIDER_SLIPS_TEXT_V7 =
  "Slips past: enemy zones of control do not stop it";

/** Tuning 4: the unit-line reminders of two role rules. */
export const NO_MOVE_AND_ATTACK_TEXT_V7 =
  "cannot move and attack in the same turn";
export const OVERRUN_BUDGET_TEXT_V7 =
  "Overrun: one more attack after every kill, with no limit; an attack that does not kill ends it";

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
