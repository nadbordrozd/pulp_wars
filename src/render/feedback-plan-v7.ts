import {
  NEUTRAL_OWNER_ID_V7,
  PROMOTION_KILLS_V7,
  unitGrowsV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "../engine/index";

/**
 * Bead pulp_wars-2yc.29: what a boundary gives the viewer to look at beyond
 * the core presentation steps: Coins gained (each from the tile that earned
 * them), population gained by visible cities (each point from its source
 * tile), and Promotions earned and taken. Built from the two public views
 * and the projected events alone, so it holds nothing the viewer may not
 * know; it changes no state and decides no rule.
 */
export type CoinGainCauseV7 =
  | "INCOME"
  | "REWARD"
  | "PLUNDER"
  | "PILLAGE"
  | "CHEST"
  | "SPOILS"
  | "REFUND"
  | "BOUNTY"
  | "SALVAGE"
  | "HARVEST";

export interface CoinGainV7 {
  readonly cause: CoinGainCauseV7;
  /** The tile the Coins come from. */
  readonly at: CoordV7;
  /** Whole Coins, at least 1. */
  readonly amount: number;
}

export interface PopulationSourceV7 {
  /** The tile the population comes from; the city's own tile for none. */
  readonly at: CoordV7;
  readonly amount: number;
}

export interface PopulationGainV7 {
  readonly cityId: number;
  readonly cityAt: CoordV7;
  /** Total population gained (permanent plus live), at least 1. */
  readonly amount: number;
  /** Where it came from; the amounts add up to `amount`. */
  readonly sources: readonly PopulationSourceV7[];
  readonly leveledUp: boolean;
  /** The city's level and meter before the gain. */
  readonly meterBefore: { readonly level: number; readonly population: number };
}

export interface PromotionCueV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  /** The viewer's own unit. */
  readonly own: boolean;
}

export interface FeedbackPlanV7 {
  readonly coins: readonly CoinGainV7[];
  /** The sum of `coins`. */
  readonly coinTotal: number;
  readonly population: readonly PopulationGainV7[];
  /** Units that reached the kills for a Promotion in this boundary. */
  readonly promotionsEarned: readonly PromotionCueV7[];
  /** Units promoted in this boundary. */
  readonly promoted: readonly PromotionCueV7[];
}

export const EMPTY_FEEDBACK_PLAN_V7: FeedbackPlanV7 = Object.freeze({
  coins: [],
  coinTotal: 0,
  population: [],
  promotionsEarned: [],
  promoted: [],
});

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/**
 * Whether a visible unit waits for its Promotion: the legality of `PROMOTE`
 * (`queryPlayerCommandsV7`) read from the public unit: not embarked, not an
 * Egg, not a veteran, the kills, and not a unit that grows instead. Kills and the
 * veteran flag are public on every visible unit, so this is no secret of
 * its owner. The neutral Monster is never promoted.
 */
export function promotionReadyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.ownerId !== NEUTRAL_OWNER_ID_V7 &&
    unit.hp > 0 &&
    unit.form !== "EMBARKED" &&
    unit.form !== "EGG" &&
    !unit.veteran &&
    unit.kills >= PROMOTION_KILLS_V7 &&
    !unitGrowsV7(view, unit)
  );
}

/** The IDs of the visible units that wait for their Promotion. */
export function promotionReadyUnitIdsV7(
  view: PlayerViewV7,
): ReadonlySet<number> {
  const ids = new Set<number>();
  for (const unit of view.units)
    if (promotionReadyV7(view, unit)) ids.add(unit.id);
  return ids;
}

function cityTotal(city: {
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
}): number {
  return city.permanentPopulation + city.economicPopulation;
}

export function feedbackPlanV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  after: PlayerViewV7,
): FeedbackPlanV7 {
  const viewer = after.viewer.id;
  const cityAt = (cityId: number): CoordV7 | null =>
    after.cities.find((city) => city.id === cityId)?.at ??
    before.cities.find((city) => city.id === cityId)?.at ??
    null;
  const unitAt = (unitId: number): CoordV7 | null =>
    before.units.find((unit) => unit.id === unitId)?.at ??
    after.units.find((unit) => unit.id === unitId)?.at ??
    null;
  const home =
    after.cities.find((city) => city.ownerId === viewer && city.isCapital)
      ?.at ??
    after.cities.find((city) => city.ownerId === viewer)?.at ??
    null;

  const coins: CoinGainV7[] = [];
  const gain = (
    cause: CoinGainCauseV7,
    at: CoordV7 | null,
    amount: number,
  ): void => {
    const source = at ?? home;
    if (source === null || !Number.isSafeInteger(amount) || amount <= 0) return;
    const merged = coins.findIndex(
      (entry) => entry.cause === cause && same(entry.at, source),
    );
    const prior = merged === -1 ? undefined : coins[merged];
    if (prior === undefined) coins.push({ cause, at: source, amount });
    else coins[merged] = { ...prior, amount: prior.amount + amount };
  };
  // Hostile deaths so far, newest last: a Plunder comes from its kills.
  const fallen: CoordV7[] = [];
  for (const event of envelope.events) {
    switch (event.kind) {
      case "UNIT_DIED": {
        const unit = before.units.find((item) => item.id === event.unitId);
        if (unit !== undefined && unit.ownerId !== viewer) fallen.push(unit.at);
        break;
      }
      case "INCOME_AWARDED": {
        if (event.playerId !== viewer) break;
        let paid = 0;
        for (const city of event.cities) {
          if (city.coins <= 0) continue;
          paid += city.coins;
          gain("INCOME", cityAt(city.cityId), city.coins);
        }
        // Income no city accounts for comes from the capital.
        if (event.totalCoins > paid)
          gain("INCOME", home, event.totalCoins - paid);
        break;
      }
      case "CITY_REWARD_CHOSEN":
        if (event.playerId === viewer)
          gain("REWARD", cityAt(event.cityId), event.coinDelta);
        break;
      case "CITY_REWARD_AUTOMATICALLY_GRANTED":
        if (event.playerId === viewer)
          gain("REWARD", cityAt(event.cityId), event.coins);
        break;
      case "PLUNDER_AWARDED": {
        if (event.playerId !== viewer) break;
        const kills = fallen.splice(
          Math.max(0, fallen.length - Math.max(1, event.kills)),
        );
        if (kills.length === 0) {
          gain("PLUNDER", null, event.coins);
          break;
        }
        // Whole Coins per kill; the first kills take the remainder.
        const share = Math.floor(event.coins / kills.length);
        let extra = event.coins - share * kills.length;
        for (const at of kills) {
          gain("PLUNDER", at, share + (extra > 0 ? 1 : 0));
          extra -= 1;
        }
        break;
      }
      case "IMPROVEMENT_PILLAGED":
        if (event.playerId === viewer)
          gain("PILLAGE", event.at, event.coinDelta);
        break;
      case "TREASURE_CAPTURED":
        if (event.playerId === viewer) gain("CHEST", event.at, event.coinDelta);
        break;
      case "SPOILS_AWARDED":
        if (event.playerId === viewer)
          gain("SPOILS", cityAt(event.cityId), event.coins);
        break;
      case "UNIT_DISBANDED":
        if (event.playerId === viewer)
          gain("REFUND", unitAt(event.unitId), event.coinDelta);
        break;
      case "MONSTER_BOUNTY_AWARDED":
        if (event.playerId === viewer)
          gain("BOUNTY", unitAt(event.unitId), event.coins);
        break;
      case "WRECK_SALVAGED":
        if (event.playerId === viewer) gain("SALVAGE", event.at, event.coins);
        break;
      case "PEARLS_GATHERED":
        if (event.playerId === viewer)
          gain("HARVEST", event.at, event.coinDelta);
        break;
      case "FOREST_CLEARED":
      case "FOREST_REPLANTED":
        if (event.playerId === viewer)
          gain("HARVEST", event.at, event.coinDelta);
        break;
      default:
        break;
    }
  }

  const population: PopulationGainV7[] = [];
  const explored = (at: CoordV7): boolean =>
    after.board.tiles.some((tile) => tile.explored && same(tile.at, at));
  for (const city of after.cities) {
    const prior = before.cities.find((item) => item.id === city.id);
    if (prior === undefined || prior.ownerId !== city.ownerId) continue;
    const amount = cityTotal(city) - cityTotal(prior);
    if (amount <= 0) continue;
    const candidates: PopulationSourceV7[] = [];
    if (city.ownerId === viewer) {
      // The viewer's own ledger names every source and its amount.
      const priorAmounts = new Map(
        before.populationContributions
          .filter((entry) => entry.cityId === city.id)
          .map((entry) => [entry.id, entry.amount] as const),
      );
      for (const entry of after.populationContributions) {
        if (entry.cityId !== city.id) continue;
        const delta = entry.amount - (priorAmounts.get(entry.id) ?? 0);
        if (delta > 0) candidates.push({ at: entry.source.at, amount: delta });
      }
    } else {
      // Another player's city: only what the projected events show.
      for (const event of envelope.events) {
        if (
          (event.kind === "FRUIT_HARVESTED" ||
            event.kind === "GAME_HUNTED" ||
            event.kind === "FISH_HARVESTED") &&
          event.cityId === city.id
        )
          candidates.push({
            at: event.at,
            amount: event.permanentPopulationAdded,
          });
        else if (
          event.kind === "ECONOMIC_BUILDING_BUILT" &&
          event.cityId === city.id &&
          event.populationContribution > 0
        )
          candidates.push({
            at: event.at,
            amount: event.populationContribution,
          });
        else if (
          (event.kind === "PORT_BUILT" ||
            event.kind === "SHIPYARD_BUILT" ||
            event.kind === "MONUMENT_BUILT") &&
          event.cityId === city.id
        )
          candidates.push({ at: event.at, amount: event.populationAdded });
      }
    }
    const sources: PopulationSourceV7[] = [];
    let left = amount;
    for (const candidate of candidates) {
      if (left <= 0) break;
      if (!explored(candidate.at)) continue;
      const taken = Math.min(left, candidate.amount);
      left -= taken;
      const merged = sources.findIndex((entry) => same(entry.at, candidate.at));
      const priorSource = merged === -1 ? undefined : sources[merged];
      if (priorSource === undefined)
        sources.push({ at: candidate.at, amount: taken });
      else
        sources[merged] = {
          ...priorSource,
          amount: priorSource.amount + taken,
        };
    }
    // Population with no visible source appears at the city itself.
    if (left > 0) {
      const merged = sources.findIndex((entry) => same(entry.at, city.at));
      const priorSource = merged === -1 ? undefined : sources[merged];
      if (priorSource === undefined)
        sources.push({ at: city.at, amount: left });
      else
        sources[merged] = { ...priorSource, amount: priorSource.amount + left };
    }
    population.push({
      cityId: city.id,
      cityAt: city.at,
      amount,
      sources,
      leveledUp: city.level > prior.level,
      meterBefore: { level: prior.level, population: prior.population },
    });
  }

  const promotionsEarned: PromotionCueV7[] = [];
  for (const unit of after.units) {
    if (!promotionReadyV7(after, unit)) continue;
    const prior = before.units.find((item) => item.id === unit.id);
    if (prior === undefined || promotionReadyV7(before, prior)) continue;
    promotionsEarned.push({
      unitId: unit.id,
      at: unit.at,
      own: unit.ownerId === viewer,
    });
  }
  const promoted: PromotionCueV7[] = [];
  for (const event of envelope.events) {
    if (event.kind !== "UNIT_PROMOTED") continue;
    const unit = after.units.find((item) => item.id === event.unitId);
    if (unit === undefined || promoted.some((cue) => cue.unitId === unit.id))
      continue;
    promoted.push({
      unitId: unit.id,
      at: unit.at,
      own: unit.ownerId === viewer,
    });
  }

  return {
    coins,
    coinTotal: coins.reduce((sum, entry) => sum + entry.amount, 0),
    population,
    promotionsEarned,
    promoted,
  };
}
