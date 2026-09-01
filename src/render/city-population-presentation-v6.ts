export type CityPopulationSquareStateV6 = "FILLED" | "EMPTY" | "DEFICIT";

export interface CityPopulationPresentationV6 {
  /** Ruleset 6 has no maximum city level, so every valid city has a next layer. */
  readonly maxLevel: false;
  readonly level: number;
  readonly nextLevel: number;
  readonly required: number;
  readonly progress: number;
  readonly accumulated: number;
  readonly remaining: number;
  readonly deficit: number;
  readonly squares: readonly CityPopulationSquareStateV6[];
  readonly accessibleText: string;
}

/**
 * Maps observation-safe city facts to the one incremental population layer.
 *
 * A negative ledger can exceed the current layer width. In that case all N
 * fixed squares are red while `deficit` and `accessibleText` retain the exact
 * uncapped shortfall. Deficit squares occupy the leading positions so gain,
 * loss, and recovery preserve one stable left-to-right reading direction.
 */
export function cityPopulationPresentationV6(city: {
  readonly id: number;
  readonly level: number;
  readonly population: number;
}): CityPopulationPresentationV6 {
  const required = city.level + 1;
  if (!Number.isSafeInteger(required) || required <= 0)
    throw new RangeError(
      "City population layer width must be a positive safe integer",
    );

  const deficit = Math.max(0, -city.population);
  const accumulated = Math.max(0, Math.min(required, city.population));
  const visibleDeficit = Math.min(required, deficit);
  const squares = Array.from({ length: required }, (_, index) =>
    deficit > 0
      ? index < visibleDeficit
        ? "DEFICIT"
        : "EMPTY"
      : index < accumulated
        ? "FILLED"
        : "EMPTY",
  );
  const nextLevel = city.level + 1;
  const remaining = deficit > 0 ? required : required - accumulated;
  const accessibleText =
    deficit > 0
      ? `City ${city.id} population deficit: ${deficit} population below the level ${city.level} baseline; replace ${deficit} population before growth toward level ${nextLevel}. The current level requires ${required} population to advance.`
      : `City ${city.id} population progress: ${accumulated} of ${required} population accumulated since reaching level ${city.level}; ${remaining} population ${remaining === 1 ? "is" : "are"} needed to reach level ${nextLevel}.`;

  return {
    maxLevel: false,
    level: city.level,
    nextLevel,
    required,
    progress: city.population,
    accumulated,
    remaining,
    deficit,
    squares,
    accessibleText,
  };
}
