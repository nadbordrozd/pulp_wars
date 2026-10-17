import type {
  PublicUnitStatBreakdownV7,
  PublicUnitStatTermV7,
  PublicUnitStatsV7,
  PublicUnitStatValueV7,
} from "../engine/index";
import {
  GROUND_MODIFIER_SOURCES_V7,
  presentedModifierV7,
} from "./unit-glossary-v7";

/**
 * The compact unit card (bead `pulp_wars-2yc.86`). The dock's main view of
 * a unit is its portrait, its name, its HP, its action buttons and a row of
 * status chips; everything else (role, faction, the six stats, ability
 * sentences) is behind its details button. A status chip that changes the
 * unit's numbers says how when it is tapped: "+1 Attack" and the stat's sum
 * "Attack 3 + 1 = 4", read from the engine's public stat terms, so the
 * numbers are exact.
 */

/**
 * The stat terms each status chip (`data-unit-status`) stands for. A chip
 * not listed changes no stat on the card (its effect lands in combat, or
 * it is not about numbers); its popover is its one sentence.
 */
const STATUS_MODIFIER_SOURCES: Readonly<Record<string, readonly string[]>> = {
  inspired: ["INSPIRED"],
  gore: ["RUN_UP"],
  rushed: ["SUGAR_RUSH"],
  berserk: ["BERSERK"],
  cracked: ["CRACKED"],
  "dug-in": ["DIG_IN"],
  planted: ["PLANTED"],
  "ray-power": ["HALF_POWER"],
  cooling: ["HALF_POWER"],
  shield: ["FORCE_FIELD"],
  growth: ["GROWTH", "ALPHA"],
  // Chips the card adds for a stat term no other chip shows.
  veteran: ["PROMOTION"],
  charge: ["CHARGE"],
  alpha: ["ALPHA"],
  "half-power": ["HALF_POWER"],
  "force-field": ["FORCE_FIELD"],
  "sugar-rush": ["SUGAR_RUSH"],
  "dig-in": ["DIG_IN"],
};

/** The stat terms the chip of `status` stands for (empty: none). */
export function statusModifierSourcesV7(status: string): readonly string[] {
  return STATUS_MODIFIER_SOURCES[status] ?? [];
}

/** The status ID of the chip the card adds for a term no chip shows. */
function modifierStatusId(source: string): string {
  return source === "PROMOTION"
    ? "veteran"
    : source.toLowerCase().replaceAll("_", "-");
}

/** A stat's name in an effect or a sum: the HP term is maximum HP. */
function statName(stat: PublicUnitStatBreakdownV7): string {
  return stat.id === "HP" ? "Max HP" : stat.label;
}

function number(value: PublicUnitStatValueV7): number {
  return value.numerator / value.denominator;
}

/** A number as the card writes it: at most two decimals. */
export function cardNumberTextV7(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * The terms of a stat the card counts: the unit's own (bead
 * `pulp_wars-2yc.63`: cover, Snow, Walls, Field Defense and high ground
 * are the tile's), and none of a stat shown as its base only.
 */
export function cardModifiersV7(
  stat: PublicUnitStatBreakdownV7,
): readonly PublicUnitStatTermV7[] {
  if (stat.visibility === "BASE_ONLY") return [];
  return stat.modifiers.filter(
    (term) => !GROUND_MODIFIER_SOURCES_V7.includes(term.source),
  );
}

/**
 * The sum of a stat with its card terms, "Attack 3 + 1 = 4" (a term that
 * takes away is "− 1"), or null when the stat has no card term.
 */
export function statSumTextV7(stat: PublicUnitStatBreakdownV7): string | null {
  const terms = cardModifiersV7(stat);
  if (terms.length === 0) return null;
  const base = number(stat.base.value);
  let total = base;
  let sum = `${statName(stat)} ${cardNumberTextV7(base)}`;
  for (const term of terms) {
    const value = number(term.value);
    total += value;
    sum += ` ${value < 0 ? "−" : "+"} ${cardNumberTextV7(Math.abs(value))}`;
  }
  return `${sum} = ${cardNumberTextV7(total)}`;
}

/** One stat change of a status: "+1 Attack" and "Attack 3 + 1 = 4". */
export interface StatusEffectV7 {
  readonly stat: string;
  readonly effect: string;
  readonly sum: string;
}

/**
 * What the chip of `status` does to the unit's numbers now, one entry per
 * stat it changes, from the public stat terms. Empty for a chip that
 * changes no stat on the card.
 */
export function statusEffectsV7(
  stats: Pick<PublicUnitStatsV7, "stats"> | undefined,
  status: string,
): readonly StatusEffectV7[] {
  const sources = statusModifierSourcesV7(status);
  if (stats === undefined || sources.length === 0) return [];
  const effects: StatusEffectV7[] = [];
  for (const stat of stats.stats) {
    const terms = cardModifiersV7(stat).filter((term) =>
      sources.includes(term.source),
    );
    if (terms.length === 0) continue;
    const value = terms.reduce((sum, term) => sum + number(term.value), 0);
    const sum = statSumTextV7(stat);
    if (sum === null) continue;
    effects.push({
      stat: stat.id,
      effect: `${value < 0 ? "−" : "+"}${cardNumberTextV7(Math.abs(value))} ${statName(stat)}`,
      sum,
    });
  }
  return effects;
}

/** A chip the card adds for a stat term that no status chip shows. */
export interface ModifierChipV7 {
  readonly id: string;
  readonly label: string;
  readonly text: string;
}

/**
 * The chips of the unit's card terms that no chip in `shown` (status IDs)
 * stands for: Veteran for a promotion's HP, Charge, Alpha, and any other
 * term, each once, so every number the card's details add to a stat has a
 * chip in the main view.
 */
export function modifierChipsV7(
  stats: Pick<PublicUnitStatsV7, "stats"> | undefined,
  shown: readonly string[],
): readonly ModifierChipV7[] {
  if (stats === undefined) return [];
  const covered = new Set(shown.flatMap(statusModifierSourcesV7));
  const chips: ModifierChipV7[] = [];
  for (const stat of stats.stats)
    for (const term of cardModifiersV7(stat)) {
      if (covered.has(term.source)) continue;
      covered.add(term.source);
      const presented = presentedModifierV7(term);
      chips.push({
        id: modifierStatusId(term.source),
        label: term.source === "PROMOTION" ? "Veteran" : presented.sourceLabel,
        text: presented.description,
      });
    }
  return chips;
}

/** The contents of a status chip's popover. */
export interface StatusPopoverV7 {
  readonly title: string;
  readonly effects: readonly StatusEffectV7[];
  readonly text: string | null;
}

/**
 * A status chip's popover: its name, what it does to the numbers (exact,
 * with the stat's sum), and its one plain sentence (`text`, from the
 * glossary or the chip's own tooltip; null when it has none).
 */
export function statusPopoverV7(
  stats: Pick<PublicUnitStatsV7, "stats"> | undefined,
  status: string,
  title: string,
  text: string | null,
): StatusPopoverV7 {
  return {
    title,
    effects: statusEffectsV7(stats, status),
    text: text === null || text.trim() === "" ? null : text,
  };
}
