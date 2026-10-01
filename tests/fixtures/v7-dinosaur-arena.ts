import {
  GROWTH_HP_V7,
  effectiveRoleRuleV7,
  growthStageForKillsV7,
  resolveCityGrowthV7,
  type CityStateV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { goblinArenaV7, sameV7, seatIdV7 } from "./v7-goblin-arena";

/**
 * Revision-19 Dinosaur rule fixtures on top of the revision-17 arena
 * (`goblinArenaV7`): the same seed-2 Dry Land boards with the given pieces as
 * the only units, every seat's units homed to its capital.
 */

/** The first city of `seat` (its capital on an arena board). */
export function cityOfV7(state: GameStateV7, seat: number): CityStateV7 {
  const ownerId = seatIdV7(state, seat);
  const city = state.cities.find((candidate) => candidate.ownerId === ownerId);
  if (city === undefined) throw new Error("city missing");
  return city;
}

/** Units of `after` that `before` did not hold, in unit-ID order. */
export function newUnitsV7(
  before: GameStateV7,
  after: GameStateV7,
): readonly UnitStateV7[] {
  return after.units
    .filter((unit) => !before.units.some((old) => old.id === unit.id))
    .sort((left, right) => left.id - right.id);
}

/**
 * Gives the unit on `at` the credited `kills`. A growing role gets the
 * matching grown maximum HP (and the same HP gain), as the state schema
 * requires; `hp` overrides the resulting current HP.
 */
export function withKillsV7(
  state: GameStateV7,
  at: CoordV7,
  kills: number,
  hp?: number,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) => {
      if (!sameV7(unit.at, at)) return unit;
      const owner = state.players.find((player) => player.id === unit.ownerId);
      if (owner === undefined) throw new Error("owner missing");
      const rule = effectiveRoleRuleV7(unit.role, owner.faction);
      const growth = rule.abilities.includes("GROW")
        ? GROWTH_HP_V7 * growthStageForKillsV7(kills)
        : 0;
      const maxHp = rule.maxHp + growth;
      return { ...unit, kills, maxHp, hp: hp ?? unit.hp + growth };
    }),
  });
}

/** Replaces the terrain (and optionally Field Defense) of one land tile. */
export function withTileV7(
  state: GameStateV7,
  at: CoordV7,
  change: {
    readonly terrain?: "GRASS" | "FOREST" | "MOUNTAIN";
    readonly fieldDefense?: boolean;
  },
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameV7(tile.at, at)
          ? {
              ...tile,
              terrain: change.terrain ?? tile.terrain,
              biome:
                change.terrain === "FOREST"
                  ? ("WOODLAND" as const)
                  : change.terrain === "MOUNTAIN"
                    ? ("HIGHLANDS" as const)
                    : tile.biome,
              fieldDefense: change.fieldDefense ?? tile.fieldDefense,
            }
          : tile,
      ),
    },
  });
}

/**
 * A seat-0 capital of `faction` ready to choose `reward` (level 3 for
 * Militia, level 5 for the Juggernaut reward), grown through Farms, with
 * every technology. `own` lists extra seat-0 pieces (homed to the capital);
 * `opponent` sets seat 1's faction and pieces (by default one Human Fighter).
 */
export function rewardStateV7(
  reward: "MILITIA" | "JUGGERNAUT",
  faction: FactionIdV7,
  own: readonly {
    readonly role: UnitStateV7["role"];
    readonly at: CoordV7;
  }[] = [],
  opponent: {
    readonly faction?: FactionIdV7;
    readonly pieces?: readonly {
      readonly role: UnitStateV7["role"];
      readonly at: CoordV7;
    }[];
  } = {},
): {
  readonly state: GameStateV7;
  readonly command: Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }>;
} {
  const factions = [faction, opponent.faction ?? "ORIGINAL"] as const;
  const base = goblinArenaV7(factions, [
    ...(
      opponent.pieces ?? [{ role: "FIGHTER" as const, at: { x: 1, y: 1 } }]
    ).map((piece) => ({ seat: 1, ...piece })),
    ...own.map((piece) => ({ seat: 0, ...piece })),
  ]);
  const city = cityOfV7(base, 0);
  const reachedLevel = reward === "MILITIA" ? 3 : 5;
  const addedPopulation = reward === "MILITIA" ? 6 : 14;
  const growthTiles = base.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !base.units.some((unit) => sameV7(unit.at, tile.at)),
    )
    .slice(0, addedPopulation / 2);
  if (growthTiles.length !== addedPopulation / 2)
    throw new Error("reward growth tiles missing");
  const economicPopulation = city.economicPopulation + addedPopulation;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    economicPopulation,
  ).city;
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + growthTiles.length,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            cityActionAvailable: true,
            rewards:
              reward === "MILITIA"
                ? [{ reachedLevel: 2, reward: "SURVEY" as const }]
                : [
                    { reachedLevel: 2, reward: "SURVEY" as const },
                    { reachedLevel: 3, reward: "WALLS" as const },
                    { reachedLevel: 4, reward: "TREASURY_8" as const },
                  ],
          }
        : candidate,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        growthTiles.some((growth) => sameV7(growth.at, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: growthTiles.map((tile, index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE" as const,
      amount: 2,
      source: {
        kind: "IMPROVEMENT" as const,
        improvement: "FARM" as const,
        at: tile.at,
      },
    })),
    pendingChoices: [
      {
        kind: "CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel,
        candidates:
          reward === "MILITIA"
            ? (["WALLS", "MILITIA"] as const)
            : (["JUGGERNAUT", "TREASURY"] as const),
      },
    ],
  });
  return {
    state,
    command: {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel,
      reward,
    },
  };
}
