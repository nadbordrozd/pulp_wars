import type {
  CoordV7,
  FactionIdV7,
  MatchSetupV7,
  PlayerEventV7,
  PlayerViewV7,
  PublicCityV7,
} from "../engine/index";
import { createInitialMapStateV7 } from "../engine/v7/map";
import {
  CITY_NAME_LISTS_V7,
  CITY_NAMES_PER_FACTION_V7,
} from "./city-name-lists-v7";

/**
 * City names (bead `pulp_wars-2yc.30`): presentation only. Nothing here is
 * engine state; a name is derived from the match setup, which is fixed for
 * the match and part of every player's public view, so every viewer, a
 * reload, a save and a replay show the same names.
 *
 * The rule. The setup rebuilds the match's first position (the same pure
 * function the engine uses), which gives every settlement site of the board:
 * the cities that exist at the start, with their owners, and the neutral
 * villages. A site belongs to the faction that owns its city at the start;
 * a neutral village belongs to the faction of the nearest starting capital
 * (its home ground, and in practice its first owner). Each faction's list is
 * shuffled with the match seed and dealt to that faction's sites in board
 * order, so no name appears twice in a match; past the end of a list the
 * names repeat with a numeral ("Aldmere II"). The name is keyed by the
 * site's tile, which never changes, so a captured city keeps its name.
 *
 * A neutral village shows no name: it is "Village" until someone takes it.
 *
 * The engine does not record who first owned a captured village. If it ever
 * does (a founding faction on the city, in the public view), the faction
 * choice here becomes that field and nothing else changes.
 */
export interface CityNameSiteV7 {
  readonly at: CoordV7;
  readonly faction: FactionIdV7;
}

export interface CityNameEntryV7 {
  readonly name: string;
  /** The faction whose list the name comes from. */
  readonly faction: FactionIdV7;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** FNV-1a over a string, as an unsigned 32-bit integer. */
function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: a small deterministic generator, private to city names. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A faction's list in this match's order (a seeded shuffle). */
export function shuffledCityNamesV7(
  seed: number,
  faction: FactionIdV7,
): readonly string[] {
  const names = [...CITY_NAME_LISTS_V7[faction]];
  const random = generator(hash32(`city-names:${seed}:${faction}`));
  for (let index = names.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = names[index] as string;
    names[index] = names[other] as string;
    names[other] = held;
  }
  return names;
}

const NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/** The `index`-th name of a shuffled list; a numeral once the list is used. */
function nthName(names: readonly string[], index: number): string {
  const name = names[index % names.length] as string;
  const round = Math.floor(index / names.length) + 1;
  return round === 1 ? name : `${name} ${NUMERALS[round] ?? String(round)}`;
}

/**
 * Deals names to sites: each faction's shuffled list goes to that faction's
 * sites in board order (rows, then columns). No name repeats; a faction
 * with more sites than names continues with "II", "III".
 */
export function assignCityNamesV7(
  seed: number,
  sites: readonly CityNameSiteV7[],
): ReadonlyMap<string, CityNameEntryV7> {
  const ordered = [...sites].sort(
    (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
  );
  const dealt = new Map<FactionIdV7, number>();
  const lists = new Map<FactionIdV7, readonly string[]>();
  const names = new Map<string, CityNameEntryV7>();
  for (const site of ordered) {
    if (names.has(key(site.at))) continue;
    let list = lists.get(site.faction);
    if (list === undefined) {
      list = shuffledCityNamesV7(seed, site.faction);
      lists.set(site.faction, list);
    }
    const index = dealt.get(site.faction) ?? 0;
    dealt.set(site.faction, index + 1);
    names.set(key(site.at), {
      name: nthName(list, index),
      faction: site.faction,
    });
  }
  return names;
}

/**
 * Every settlement site of a setup's first position with the faction it
 * belongs to. Empty when the setup does not build a board (a hand-made test
 * view); `cityNameV7` then falls back to a rule on the city alone.
 */
export function cityNameSitesV7(
  setup: MatchSetupV7,
): readonly CityNameSiteV7[] {
  let created: ReturnType<typeof createInitialMapStateV7>;
  try {
    created = createInitialMapStateV7(setup);
  } catch {
    return [];
  }
  if (!created.ok) return [];
  const state = created.state;
  const factionOf = new Map(
    state.players.map((player) => [player.id, player.faction] as const),
  );
  const seatOf = new Map(
    state.players.map((player) => [player.id, player.seat] as const),
  );
  const sites: CityNameSiteV7[] = [];
  const taken = new Set<string>();
  for (const city of state.cities) {
    const faction = factionOf.get(city.ownerId);
    if (faction === undefined) continue;
    sites.push({ at: city.at, faction });
    taken.add(key(city.at));
  }
  const capitals = state.cities
    .filter((city) => city.isCapital && factionOf.has(city.ownerId))
    .sort(
      (left, right) =>
        (seatOf.get(left.ownerId) ?? 0) - (seatOf.get(right.ownerId) ?? 0),
    );
  for (const tile of state.board.tiles) {
    if (tile.site === null || taken.has(key(tile.at))) continue;
    let nearest: FactionIdV7 | null = null;
    let nearestSteps = Number.POSITIVE_INFINITY;
    let nearestLine = Number.POSITIVE_INFINITY;
    for (const capital of capitals) {
      const dx = Math.abs(capital.at.x - tile.at.x);
      const dy = Math.abs(capital.at.y - tile.at.y);
      const steps = Math.max(dx, dy);
      const line = dx * dx + dy * dy;
      if (
        steps < nearestSteps ||
        (steps === nearestSteps && line < nearestLine)
      ) {
        nearest = factionOf.get(capital.ownerId) ?? null;
        nearestSteps = steps;
        nearestLine = line;
      }
    }
    if (nearest !== null) sites.push({ at: tile.at, faction: nearest });
  }
  return sites;
}

const GAZETTEER_LIMIT = 6;
const gazetteers = new Map<string, ReadonlyMap<string, CityNameEntryV7>>();
/** The same setup object asked again (every frame) skips the text key. */
const gazetteerOfSetup = new WeakMap<
  MatchSetupV7,
  ReadonlyMap<string, CityNameEntryV7>
>();

/** The names of every site of a setup, by tile; remembered per setup. */
export function cityGazetteerV7(
  setup: MatchSetupV7,
): ReadonlyMap<string, CityNameEntryV7> {
  const same = gazetteerOfSetup.get(setup);
  if (same !== undefined) return same;
  const id = JSON.stringify(setup);
  let built = gazetteers.get(id);
  if (built === undefined) {
    built = assignCityNamesV7(setup.seed, cityNameSitesV7(setup));
    if (gazetteers.size >= GAZETTEER_LIMIT) {
      const oldest = gazetteers.keys().next();
      if (oldest.done !== true) gazetteers.delete(oldest.value);
    }
    gazetteers.set(id, built);
  }
  gazetteerOfSetup.set(setup, built);
  return built;
}

type NamingViewV7 = Pick<PlayerViewV7, "setup" | "players">;
type NamedCityV7 = Pick<PublicCityV7, "id" | "at">;

/**
 * A city's name and the faction it is named for. A city on a site the
 * setup does not build (only a hand-made view) is named from the seed and
 * its tile alone: its first capital's faction when it is one, otherwise a
 * faction of the match picked by the tile.
 */
export function cityNameEntryV7(
  view: NamingViewV7,
  city: NamedCityV7,
): CityNameEntryV7 {
  const known = cityGazetteerV7(view.setup).get(key(city.at));
  if (known !== undefined) return known;
  const pick = hash32(`city-site:${view.setup.seed}:${key(city.at)}`);
  const factions = view.setup.factions;
  const faction =
    view.players.find((player) => player.originalCapitalCityId === city.id)
      ?.faction ??
    factions[pick % Math.max(1, factions.length)] ??
    "ORIGINAL";
  const names = shuffledCityNamesV7(view.setup.seed, faction);
  return {
    name: names[(pick >>> 8) % CITY_NAMES_PER_FACTION_V7] as string,
    faction,
  };
}

/** The name of a city: the same for every viewer, for the whole match. */
export function cityNameV7(view: NamingViewV7, city: NamedCityV7): string {
  return cityNameEntryV7(view, city).name;
}

/** The name of a city the viewer can see, by its ID; null when unseen. */
export function cityNameByIdV7(
  view: Pick<PlayerViewV7, "setup" | "players" | "cities">,
  cityId: number,
): string | null {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return city === undefined ? null : cityNameV7(view, city);
}

/** "Capital Aldmere" or "City Aldmere": what a screen reader hears. */
export function cityAccessibleNameV7(
  view: NamingViewV7,
  city: NamedCityV7 & Pick<PublicCityV7, "isCapital">,
): string {
  return `${city.isCapital ? "Capital" : "City"} ${cityNameV7(view, city)}`;
}

function seatName(view: PlayerViewV7, playerId: number): string {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "An enemy" : `Player ${player.seat + 1}`;
}

/**
 * Log and toast text for the city events of one projected boundary, by
 * name: a village taken ("Aldmere founded"), a city taken ("Aldmere
 * captured", "Aldmere lost to Player 2") and an own city's growth
 * ("Aldmere grew to level 3"). A city the viewer cannot see is not named
 * and adds no text.
 */
export function cityBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const named = (cityId: number): string | null =>
    cityNameByIdV7(after, cityId) ?? cityNameByIdV7(before, cityId);
  for (const event of events) {
    if (event.kind === "CITY_CAPTURED") {
      const name = named(event.cityId);
      if (name === null) continue;
      if (event.to === viewerId) {
        toast = true;
        parts.push(`${name} ${event.from === null ? "founded" : "captured"}`);
      } else if (event.from === viewerId) {
        toast = true;
        parts.push(`${name} lost to ${seatName(after, event.to)}`);
      } else
        parts.push(
          event.from === null
            ? `${seatName(after, event.to)} founded ${name}`
            : `${seatName(after, event.to)} captured ${name}`,
        );
    } else if (event.kind === "CITY_LEVELED_UP") {
      const city = after.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      if (city === undefined || city.ownerId !== viewerId) continue;
      parts.push(`${cityNameV7(after, city)} grew to level ${event.level}`);
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
