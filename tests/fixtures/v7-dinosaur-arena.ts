import {
  EGG_HP_V7,
  GROWTH_HP_V7,
  effectiveRoleRuleV7,
  eggActivationV7,
  growthStageForKillsV7,
  resolveCityGrowthV7,
  roleMechanicsV7,
  unitId,
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

export interface EggPieceV7 {
  readonly seat: number;
  readonly role: UnitStateV7["role"];
  readonly at: CoordV7;
  /** Default: the base Egg HP (6). */
  readonly maxHp?: number;
  readonly hp?: number;
  /** Default: the role's hatch time. */
  readonly turnsRemaining?: number;
  /** Default: false (laid on an earlier turn). */
  readonly laidThisTurn?: boolean;
}

/**
 * Adds Eggs (section 6.1) to an arena state: each is a new unit of form
 * `EGG` homed to the first city of its seat, with its `eggs` entry. The
 * tiles must be nest tiles of that city (the state schema checks it).
 */
export function withEggsV7(
  state: GameStateV7,
  pieces: readonly EggPieceV7[],
): GameStateV7 {
  const eggs = pieces.map((piece, index) => {
    const city = cityOfV7(state, piece.seat);
    const owner = state.players.find((player) => player.id === city.ownerId);
    if (owner === undefined) throw new Error("owner missing");
    const maxHp = piece.maxHp ?? EGG_HP_V7;
    const unit: UnitStateV7 = {
      id: unitId(state.nextEntityId + index),
      ownerId: city.ownerId,
      homeCityId: city.id,
      role: piece.role,
      form: "EGG",
      at: piece.at,
      hp: piece.hp ?? maxHp,
      maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: eggActivationV7(),
    };
    return {
      unit,
      entry: {
        unitId: unit.id,
        turnsRemaining:
          piece.turnsRemaining ??
          roleMechanicsV7(piece.role, owner.faction).hatchTurns ??
          1,
        laidThisTurn: piece.laidThisTurn ?? false,
      },
    };
  });
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + pieces.length,
    units: [...state.units, ...eggs.map((egg) => egg.unit)],
    eggs: [...state.eggs, ...eggs.map((egg) => egg.entry)].sort(
      (left, right) => left.unitId - right.unitId,
    ),
    treasureChests: state.treasureChests.filter(
      (chest) => !pieces.some((piece) => sameV7(piece.at, chest)),
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        pieces.some((piece) => sameV7(piece.at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? ("PLAINS" as const),
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

/** The Egg countdown entry of the unit on `at`. */
export function eggEntryAtV7(
  state: GameStateV7,
  at: CoordV7,
): GameStateV7["eggs"][number] {
  const unit = state.units.find((candidate) => sameV7(candidate.at, at));
  const entry = state.eggs.find((candidate) => candidate.unitId === unit?.id);
  if (entry === undefined) throw new Error(`no egg at ${at.x},${at.y}`);
  return entry;
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
 * A seat-0 capital of `faction` ready to choose `reward` (level 2 for
 * Militia since the reward ladder rework, `pulp_wars-zypi`: level 3
 * before; level 6 for the Juggernaut reward since the economy rejig,
 * `pulp_wars-w49.16`, 7r54, which every level from 5 offers again since
 * `pulp_wars-zypi`), grown through Farms, with every technology. The
 * Juggernaut capital's reward history is of the ladder before
 * `pulp_wars-zypi` (Survey, Walls, the 6-Coin Treasury, the Treasury),
 * which still parses. Level 6 takes 20 population and the capital's eight
 * tiles hold seven Farms (14), so for the Juggernaut six of the Farm tiles
 * also carry 1 permanent population each (a hunt, booked before the Farm
 * was built). The capital's one free tile and its center carry none, so a
 * test may still harvest there.
 * `own` lists extra seat-0 pieces (homed to the capital);
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
  const reachedLevel = reward === "MILITIA" ? 2 : 6;
  const addedPopulation = reward === "MILITIA" ? 2 : 14;
  const addedPermanent = reward === "MILITIA" ? 0 : 6;
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
  // Six of the seven Farm tiles also carry a hunt (1 permanent each).
  const huntTiles = growthTiles.slice(0, addedPermanent);
  if (huntTiles.length !== addedPermanent)
    throw new Error("reward hunt tiles missing");
  const economicPopulation = city.economicPopulation + addedPopulation;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation + addedPermanent,
    economicPopulation,
  ).city;
  if (grown.level !== reachedLevel)
    throw new Error("reward fixture reached the wrong level");
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + growthTiles.length + huntTiles.length,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            cityActionAvailable: true,
            rewards:
              reward === "MILITIA"
                ? []
                : [
                    { reachedLevel: 2, reward: "SURVEY" as const },
                    { reachedLevel: 3, reward: "WALLS" as const },
                    { reachedLevel: 4, reward: "TREASURY_6" as const },
                    { reachedLevel: 5, reward: "TREASURY" as const },
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
    populationContributions: [
      ...growthTiles.map((tile, index) => ({
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
      ...huntTiles.map((tile, index) => ({
        id: base.nextEntityId + growthTiles.length + index,
        cityId: city.id,
        category: "PERMANENT" as const,
        amount: 1,
        source: {
          kind: "RESOURCE_ACTION" as const,
          action: "HUNT_GAME" as const,
          at: tile.at,
        },
      })),
    ],
    pendingChoices: [
      {
        kind: "CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel,
        candidates:
          reward === "MILITIA"
            ? (["STOCKPILE", "MILITIA"] as const)
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
