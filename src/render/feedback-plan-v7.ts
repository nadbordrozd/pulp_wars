import {
  NEUTRAL_OWNER_ID_V7,
  PROMOTION_KILLS_V7,
  unitGrowsV7,
  type CityId,
  type CoordV7,
  type FavourSourceV7,
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
  /**
   * Bead pulp_wars-v56v: Road population (section 9.3) that a new Road link
   * brings. The point comes from the other city of the link (`at`) and
   * hops along `path`, the Road tiles from that city to this one, both
   * cities included.
   */
  readonly road?: {
    readonly fromCityId: number;
    readonly path: readonly CoordV7[];
  };
}

/**
 * Bead pulp_wars-v56v: one of the viewer's cities newly linked by Road to
 * the viewer's original capital (RULESET_7_CURRENT.md section 9.3: each
 * gains 1 live population). `path` runs along the visible Road tiles from
 * the capital to the city, both included.
 */
export interface RoadLinkV7 {
  readonly capitalId: number;
  readonly capitalAt: CoordV7;
  readonly cityId: number;
  readonly cityAt: CoordV7;
  readonly path: readonly CoordV7[];
}

/** Bead pulp_wars-v56v: Road population one of the viewer's cities lost. */
export interface RoadUnlinkV7 {
  readonly cityId: number;
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

/**
 * The Cultists (bead pulp_wars-mch9.17, RULESET_7_CULTISTS.md section 3):
 * Favour the viewer's seat gained, from the tile that paid it (the victim's
 * of a Sacrifice or a Seizure, the city's of an Offering, the tile a Chosen
 * died on). Another seat's Favour is public but flies nowhere: it is read
 * off the leaderboard.
 */
export interface FavourGainV7 {
  readonly source: FavourSourceV7;
  /** The tile the Favour comes from. */
  readonly at: CoordV7;
  /** Whole Favour, at least 1. */
  readonly amount: number;
}

/**
 * The Cultists (section 5.3): population a visible city gave up in an
 * Offering. The city's meter drops at once; the pips that went rise and
 * fade from it.
 */
export interface PopulationLossV7 {
  readonly cityId: number;
  readonly at: CoordV7;
  /** Whole population, at least 1. */
  readonly amount: number;
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
  /** Bead pulp_wars-v56v: the viewer's cities newly linked by Road. */
  readonly roadLinks: readonly RoadLinkV7[];
  /** Bead pulp_wars-v56v: the viewer's cities that lost Road population. */
  readonly roadUnlinks: readonly RoadUnlinkV7[];
  /** The Cultists: the Favour the viewer's seat gained, by tile. */
  readonly favour: readonly FavourGainV7[];
  /** The Cultists: the population visible cities gave up in Offerings. */
  readonly populationLosses: readonly PopulationLossV7[];
}

export const EMPTY_FEEDBACK_PLAN_V7: FeedbackPlanV7 = Object.freeze({
  coins: [],
  coinTotal: 0,
  population: [],
  promotionsEarned: [],
  promoted: [],
  roadLinks: [],
  roadUnlinks: [],
  favour: [],
  populationLosses: [],
});

/**
 * The viewer's Road population of one city from a public view: the
 * capital-rooted Road network the view already carries
 * (`naval.networkCityIds`, `landConnectedCityIdsV7` in the engine) read as
 * section 9.3 counts it: +1 for every other city in the capital's network,
 * and +1 to the original capital for each of them; 0 while the original
 * capital is lost.
 */
function roadPopulationOfV7(
  view: PlayerViewV7,
  capitalId: CityId | null,
  cityId: CityId,
): number {
  const network = view.naval.networkCityIds;
  if (capitalId === null || !network.includes(capitalId)) return 0;
  if (cityId === capitalId) return network.length - 1;
  return network.includes(cityId) ? 1 : 0;
}

/**
 * The shortest way along the viewer's capital-linked Road tiles
 * (`naval.networkRoads`, city tiles included) from `from` to `to`,
 * stepping in eight directions with straight steps tried first, both ends
 * included; the direct step when the Roads do not join them.
 */
function roadPathV7(
  view: PlayerViewV7,
  from: CoordV7,
  to: CoordV7,
): readonly CoordV7[] {
  const key = (at: CoordV7): string => `${at.x},${at.y}`;
  const nodes = new Set(view.naval.networkRoads.map(key));
  nodes.add(key(from));
  nodes.add(key(to));
  const previous = new Map<string, CoordV7 | null>([[key(from), null]]);
  const queue: CoordV7[] = [from];
  const steps = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ] as const;
  for (let index = 0; index < queue.length; index += 1) {
    const at = queue[index];
    if (at === undefined) break;
    if (same(at, to)) {
      const path: CoordV7[] = [];
      for (
        let cursor: CoordV7 | null = at;
        cursor !== null;
        cursor = previous.get(key(cursor)) ?? null
      )
        path.unshift(cursor);
      return path;
    }
    for (const [dx, dy] of steps) {
      const near = { x: at.x + dx, y: at.y + dy };
      if (!nodes.has(key(near)) || previous.has(key(near))) continue;
      previous.set(key(near), at);
      queue.push(near);
    }
  }
  return [from, to];
}

/**
 * Bead pulp_wars-v56v: the Road links a boundary made and broke for the
 * viewer. Road population is a live value with no event of its own, so it
 * is read by comparing the viewer's capital-rooted Road network before and
 * after: a city that joins the capital's network (a Road built, a city
 * captured onto the Roads, the capital won back) is linked; a city of the
 * viewer whose Road population fell (a Road cut, a linked city or the
 * capital lost) is unlinked. Both views are the viewer's own, so this holds
 * nothing the viewer may not know, in their turn or another player's.
 */
export function roadLinkChangesV7(
  before: PlayerViewV7,
  after: PlayerViewV7,
): {
  readonly linked: readonly RoadLinkV7[];
  readonly unlinked: readonly RoadUnlinkV7[];
} {
  const viewer = after.viewer.id;
  const capitalId =
    after.players.find((player) => player.id === viewer)
      ?.originalCapitalCityId ?? null;
  const linked: RoadLinkV7[] = [];
  const capital = after.cities.find(
    (city) => city.id === capitalId && city.ownerId === viewer,
  );
  const networkBefore = new Set(
    capitalId !== null && before.naval.networkCityIds.includes(capitalId)
      ? before.naval.networkCityIds
      : [],
  );
  if (capital !== undefined && after.naval.networkCityIds.includes(capital.id))
    for (const city of after.cities) {
      if (
        city.id === capital.id ||
        city.ownerId !== viewer ||
        !after.naval.networkCityIds.includes(city.id) ||
        (networkBefore.has(city.id) && networkBefore.has(capital.id))
      )
        continue;
      linked.push({
        capitalId: capital.id,
        capitalAt: capital.at,
        cityId: city.id,
        cityAt: city.at,
        path: roadPathV7(after, capital.at, city.at),
      });
    }
  // The nearest link first: when several land at once they follow outward.
  linked.sort(
    (left, right) =>
      left.path.length - right.path.length || left.cityId - right.cityId,
  );
  const unlinked: RoadUnlinkV7[] = [];
  for (const city of after.cities) {
    if (city.ownerId !== viewer) continue;
    const amount =
      roadPopulationOfV7(before, capitalId, city.id) -
      roadPopulationOfV7(after, capitalId, city.id);
    if (amount > 0) unlinked.push({ cityId: city.id, at: city.at, amount });
  }
  return { linked, unlinked };
}

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
  // The Cultists: Favour is paid right after what earned it (a victim
  // offered, a city's Offering, a death), so each gain comes from the tile
  // of the latest of those; `FAVOUR_GAINED` itself names no tile.
  const favour: FavourGainV7[] = [];
  const populationLosses: PopulationLossV7[] = [];
  let favourAt: CoordV7 | null = null;
  for (const event of envelope.events) {
    switch (event.kind) {
      case "UNIT_DIED": {
        const unit = before.units.find((item) => item.id === event.unitId);
        if (unit !== undefined && unit.ownerId !== viewer) fallen.push(unit.at);
        if (unit !== undefined) favourAt = unit.at;
        break;
      }
      case "UNIT_SACRIFICED":
      case "UNIT_SEIZED":
        favourAt = event.at;
        break;
      case "OFFERING_MADE": {
        favourAt = event.at;
        if (
          event.population > 0 &&
          after.cities.some((city) => city.id === event.cityId)
        )
          populationLosses.push({
            cityId: event.cityId,
            at: event.at,
            amount: event.population,
          });
        break;
      }
      case "FAVOUR_GAINED": {
        const source = favourAt ?? home;
        if (
          event.playerId !== viewer ||
          source === null ||
          !Number.isSafeInteger(event.amount) ||
          event.amount <= 0
        )
          break;
        favour.push({ source: event.source, at: source, amount: event.amount });
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
  const roads = roadLinkChangesV7(before, after);
  for (const city of after.cities) {
    const prior = before.cities.find((item) => item.id === city.id);
    if (prior === undefined || prior.ownerId !== city.ownerId) continue;
    const amount = cityTotal(city) - cityTotal(prior);
    if (amount <= 0) continue;
    const candidates: PopulationSourceV7[] = [];
    // Bead pulp_wars-v56v: a new Road link's point comes along the Road
    // from the other city of the link.
    for (const link of roads.linked)
      if (link.cityId === city.id)
        candidates.push({
          at: link.capitalAt,
          amount: 1,
          road: { fromCityId: link.capitalId, path: link.path },
        });
      else if (link.capitalId === city.id)
        candidates.push({
          at: link.cityAt,
          amount: 1,
          road: { fromCityId: link.cityId, path: [...link.path].reverse() },
        });
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
      if (candidate.road !== undefined) {
        sources.push({ ...candidate, amount: taken });
        continue;
      }
      const merged = sources.findIndex(
        (entry) => entry.road === undefined && same(entry.at, candidate.at),
      );
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
      const merged = sources.findIndex(
        (entry) => entry.road === undefined && same(entry.at, city.at),
      );
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
    roadLinks: roads.linked,
    roadUnlinks: roads.unlinked,
    favour,
    populationLosses,
  };
}
