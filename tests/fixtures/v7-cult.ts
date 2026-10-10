import {
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_RULES_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  resolveCityGrowthV7,
  summonedUnitRoleRuleV7,
  unitId,
  withDaemonUnboundV7,
  type CoordV7,
  type GameStateV7,
  type SummonedRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { cityOfV7 } from "./v7-dinosaur-arena";
import {
  READY_V7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";
import { fieldV7, type FieldOptionsV7 } from "./v7-revision20";

/**
 * Cult rule fixtures (docs/product/RULESET_7_CULTISTS.md; first used by the
 * Favour bead, `pulp_wars-mch9.4`) on top of the revision-20 field: the
 * two-seat 11 x 11 board (seat 0 capital (8, 8) with territory x 7 to 9,
 * y 7 to 9; seat 1 capital (2, 8) with territory x 1 to 3, y 7 to 9;
 * villages (5, 5), (8, 5), (5, 8)) whose land outside every territory and
 * site is open Grass, all of it explored by both seats. Seat 0 is the Cult
 * and seat 1 Human unless the options say otherwise.
 */
export function cultFieldV7(
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  return fieldV7(pieces, { factions: ["CULT", "ORIGINAL"], ...options });
}

/** The state with `amount` Favour for the Cult seat `seat` (and no other). */
export function withFavourV7(
  state: GameStateV7,
  seat: number,
  amount: number,
): GameStateV7 {
  return checkedV7({
    ...state,
    cult: {
      ...state.cult,
      favour: [{ playerId: seatIdV7(state, seat), favour: amount }],
    },
  });
}

/**
 * `count` Farms in the capital of `seat`, with the growth they give and the
 * rewards of the levels reached already taken (Stockpile, Walls), so no
 * choice is pending and the city has its action. Two Farms make a level-2
 * city with 2 population (one Offering); one Farm level 2 with 0; four
 * Farms level 3 with 3.
 */
export function withFarmsV7(
  state: GameStateV7,
  seat: number,
  count: number,
): GameStateV7 {
  const city = cityOfV7(state, seat);
  const tiles = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !state.units.some((unit) => sameV7(unit.at, tile.at)),
    )
    .slice(0, count);
  if (tiles.length !== count) throw new Error("no room for the Farms");
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    city.economicPopulation + 2 * count,
  ).city;
  const rewards = [
    { reachedLevel: 2, reward: "STOCKPILE" as const },
    { reachedLevel: 3, reward: "WALLS" as const },
  ].filter((record) => record.reachedLevel <= grown.level);
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + count,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? { ...grown, cityActionAvailable: true, rewards }
        : candidate,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tiles.some((farm) => sameV7(farm.at, tile.at))
          ? {
              ...tile,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...state.populationContributions,
      ...tiles.map((tile, index) => ({
        id: state.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at: tile.at,
        },
      })),
    ],
  });
}

/**
 * The channel fixtures (`pulp_wars-mch9.5`, sections 6 and 8). A Horror of
 * the Cult seat `seat` on `where` (a free land tile), at full HP unless
 * `hp` says otherwise, ready to act unless `activation` says otherwise.
 */
export function withHorrorV7(
  state: GameStateV7,
  seat: number,
  where: CoordV7,
  options: {
    readonly hp?: number;
    readonly activation?: Partial<UnitStateV7["activation"]>;
    readonly role?: SummonedRoleIdV7;
  } = {},
): GameStateV7 {
  const summoned = options.role ?? "HORROR";
  const rule = summonedUnitRoleRuleV7(summoned);
  const role = SUMMONED_MECHANICAL_ROLES_V7[summoned];
  if (role === undefined) throw new Error("no such summoned unit");
  const horror: UnitStateV7 = {
    id: unitId(state.nextEntityId),
    ownerId: seatIdV7(state, seat),
    homeCityId: null,
    role,
    form: "LAND",
    at: where,
    hp: options.hp ?? rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: { ...READY_V7, ...options.activation },
    summoned,
  };
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    units: [...state.units, horror],
  });
}

/** The unit on `daemon` is channelled by the cultist on each of `cultists`. */
export function withStrandsV7(
  state: GameStateV7,
  daemon: CoordV7,
  cultists: readonly CoordV7[],
): GameStateV7 {
  const daemonUnitId = unitAtV7(state, daemon).id;
  return checkedV7({
    ...state,
    cult: {
      ...state.cult,
      strands: [
        ...state.cult.strands,
        ...cultists.map((where) => ({
          cultistUnitId: unitAtV7(state, where).id,
          daemonUnitId,
        })),
      ].sort((left, right) => left.cultistUnitId - right.cultistUnitId),
    },
  });
}

/** The Thing on `thing` grips the channeller on `cultist` (it holds a strand). */
export function withGripV7(
  state: GameStateV7,
  thing: CoordV7,
  cultist: CoordV7,
): GameStateV7 {
  return checkedV7({
    ...state,
    cult: {
      ...state.cult,
      grips: [
        ...state.cult.grips,
        {
          thingUnitId: unitAtV7(state, thing).id,
          cultistUnitId: unitAtV7(state, cultist).id,
        },
      ].sort((left, right) => left.thingUnitId - right.thingUnitId),
    },
  });
}

/** The Idol Bearer on each of `bearers` has its idol raised. */
export function withIdolsV7(
  state: GameStateV7,
  bearers: readonly CoordV7[],
): GameStateV7 {
  return checkedV7({
    ...state,
    cult: {
      ...state.cult,
      idols: [
        ...state.cult.idols,
        ...bearers.map((where) => unitAtV7(state, where).id),
      ].sort((left, right) => left - right),
    },
  });
}

/**
 * The Unbound fixtures (`pulp_wars-mch9.6`, sections 6.4 and 6.5). The
 * daemon on `where` broke loose: it belongs to nobody, with the seat
 * `summonerSeat` as its summoner, Furious or not; the strands to it are
 * gone.
 */
export function withUnboundV7(
  state: GameStateV7,
  where: CoordV7,
  summonerSeat: number,
  furious = false,
): GameStateV7 {
  const daemon = unitAtV7(state, where);
  const loose = withDaemonUnboundV7(
    state,
    daemon.id,
    seatIdV7(state, summonerSeat),
    furious,
  );
  return checkedV7({
    ...loose,
    cult: {
      ...loose.cult,
      strands: loose.cult.strands.filter(
        (strand) => strand.daemonUnitId !== daemon.id,
      ),
    },
  });
}

/**
 * An Unbound Herald on `where`, built by hand: the Herald is summoned from
 * `pulp_wars-mch9.7`, but its breed is in the neutral registration already
 * (two attacks in a rampage).
 */
export function withUnboundHeraldV7(
  state: GameStateV7,
  where: CoordV7,
  summonerSeat: number,
  options: { readonly hp?: number; readonly furious?: boolean } = {},
): GameStateV7 {
  const rule = NEUTRAL_ROLE_RULES_V7.HERALD;
  const id = unitId(state.nextEntityId);
  const herald: UnitStateV7 = {
    id,
    ownerId: NEUTRAL_OWNER_ID_V7,
    homeCityId: null,
    role: rule.role,
    form: "LAND",
    at: where,
    hp: options.hp ?? rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY_V7,
    summoned: "HERALD",
  };
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    units: [...state.units, herald],
    monsters: [
      ...state.monsters,
      {
        unitId: id,
        breed: "HERALD" as const,
        home: where,
        provokedBy: [],
        unbound: {
          summonerPlayerId: seatIdV7(state, summonerSeat),
          furious: options.furious ?? false,
        },
      },
    ].sort((left, right) => left.unitId - right.unitId),
  });
}
