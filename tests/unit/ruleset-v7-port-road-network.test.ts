import { describe, expect, it } from "vitest";
import { inspectNormalTacticalFactsV7, scoreCommandV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  cityIncomeV7,
  combinedNetworkCityIdsV7,
  landTradeCityIdsV7,
  previewEconomicV7,
  roadPopulationForCityV7,
  seaLinksV7,
  seaTradeCityIdsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { roadLinkChangesV7 } from "../../src/render/feedback-plan-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { coastalV7 } from "../fixtures/v7-naval-builders";
import {
  PORT_LINK_UI_V7,
  portLinkAdjacentFixtureV7,
  portLinkChainFixtureV7,
  portLinkPortsFixtureV7,
} from "../fixtures/v7-port-link-ui";

/**
 * Bead pulp_wars-5ti.12 (`pulp-wars-poc-7r76`): Ports join the Road
 * network. Every case is a hand-built strip of board: rows 0 to 4 are
 * cleared to roadless neutral grass, then cities, Roads, water and docks are
 * painted on.
 */
type Coord = readonly [x: number, y: number];
interface WorldSpec {
  readonly techs: readonly TechnologyIdV7[];
  /** The capital first; every city belongs to the human seat. */
  readonly cities: readonly Coord[];
  readonly roads?: readonly Coord[];
  readonly shallow?: readonly Coord[];
  readonly deep?: readonly Coord[];
  /** A dock, with the index (in `cities`) of the city it belongs to. */
  readonly ports?: readonly (readonly [...Coord, city: number])[];
  readonly shipyards?: readonly (readonly [...Coord, city: number])[];
  /** Land (Road) tiles inside the hostile seat's territory. */
  readonly foreign?: readonly Coord[];
  readonly unexplored?: readonly Coord[];
  /** Hostile ships. */
  readonly hostileShips?: readonly Coord[];
}

function world(spec: WorldSpec): {
  readonly state: GameStateV7;
  readonly cityIds: readonly GameStateV7["cities"][number]["id"][];
} {
  const fixture = coastalV7(9_512);
  const human = fixture.state.humanPlayerId;
  const capital = fixture.state.cities.find((city) => city.ownerId === human);
  const hostileCity = fixture.state.cities.find(
    (city) => city.ownerId !== human,
  );
  const hostile = fixture.state.units.find((unit) => unit.ownerId !== human);
  if (
    capital === undefined ||
    hostile === undefined ||
    hostileCity === undefined
  )
    throw new Error("fixture entities missing");
  const key = ([x, y]: Coord): string => `${x},${y}`;
  const cityIds = spec.cities.map((_, index) =>
    index === 0
      ? capital.id
      : ((capital.id + 100 + index) as typeof capital.id),
  );
  const has = (list: readonly Coord[] | undefined, at: CoordV7): boolean =>
    (list ?? []).some(([x, y]) => x === at.x && y === at.y);
  const docks = new Map<string, { city: number; shipyard: boolean }>();
  for (const [x, y, city] of spec.ports ?? [])
    docks.set(key([x, y]), { city, shipyard: false });
  for (const [x, y, city] of spec.shipyards ?? [])
    docks.set(key([x, y]), { city, shipyard: true });
  const state = {
    ...fixture.state,
    players: fixture.state.players.map((player) =>
      player.id === human
        ? {
            ...player,
            researchedTechs: spec.techs,
            explored: player.explored.filter((at) => !has(spec.unexplored, at)),
          }
        : player,
    ),
    cities: [
      ...fixture.state.cities.filter((city) => city.ownerId !== human),
      ...spec.cities.map(([x, y], index) => ({
        ...capital,
        id: cityIds[index] ?? capital.id,
        at: { x, y },
        isCapital: index === 0,
      })),
    ],
    units: (spec.hostileShips ?? []).map(([x, y], index) => ({
      ...hostile,
      id: (hostile.id + 500 + index) as typeof hostile.id,
      at: { x, y },
      role: "PATROL_BOAT" as const,
      form: "NAVAL" as const,
    })),
    board: {
      ...fixture.state.board,
      tiles: fixture.state.board.tiles.map((tile) => {
        if (tile.at.y > 4) return { ...tile, road: false, improvement: null };
        const dock = docks.get(key([tile.at.x, tile.at.y]));
        const water =
          dock !== undefined ||
          has(spec.shallow, tile.at) ||
          has(spec.deep, tile.at);
        const cityIndex = spec.cities.findIndex(
          ([x, y]) => x === tile.at.x && y === tile.at.y,
        );
        return {
          ...tile,
          biome: water ? null : ("PLAINS" as const),
          terrain: has(spec.deep, tile.at)
            ? ("DEEP_WATER" as const)
            : water
              ? ("SHALLOW_WATER" as const)
              : ("GRASS" as const),
          resource: null,
          improvement:
            dock === undefined
              ? null
              : dock.shipyard
                ? ("SHIPYARD" as const)
                : ("PORT" as const),
          road: has(spec.roads, tile.at) || has(spec.foreign, tile.at),
          site: null,
          territoryCityId:
            dock !== undefined
              ? (cityIds[dock.city] ?? null)
              : cityIndex >= 0
                ? (cityIds[cityIndex] ?? null)
                : has(spec.foreign, tile.at)
                  ? hostileCity.id
                  : null,
        };
      }),
    },
  } as GameStateV7;
  return { state, cityIds };
}

/** `[network, population of each city]` as the engine counts them. */
function linkFacts(built: ReturnType<typeof world>): {
  readonly network: readonly number[];
  readonly population: readonly number[];
} {
  const { state, cityIds } = built;
  return {
    network: [...combinedNetworkCityIdsV7(state, state.humanPlayerId)]
      .map((id) => cityIds.indexOf(id))
      .sort((left, right) => left - right),
    population: cityIds.map((id) =>
      roadPopulationForCityV7(state, { id, ownerId: state.humanPlayerId }),
    ),
  };
}

const row = (from: number, to: number, y: number): Coord[] =>
  Array.from({ length: to - from + 1 }, (_, index) => [from + index, y]);

const ROADS: readonly TechnologyIdV7[] = ["SCOUTING", "ROADS"];
const SAILING: readonly TechnologyIdV7[] = ["SHORECRAFT"];

/** Capital (1,1) and a city (8,1), each with a dock beside its center. */
const TWO_PORTS: Omit<WorldSpec, "techs"> = {
  cities: [
    [1, 1],
    [8, 1],
  ],
  shallow: row(3, 6, 2),
  ports: [
    [2, 2, 0],
    [7, 2, 1],
  ],
};

describe("Ports join the Road network (pulp_wars-5ti.12, 7r76)", () => {
  it("is a new identity after the Cult's 7r75, whose saves are obsolete", () => {
    const revision = Number(RULESET_7_ID.replace("pulp-wars-poc-7r", ""));
    expect(revision).toBeGreaterThanOrEqual(76);
    expect(PRIOR_RULESET_7_IDS).toContain("pulp-wars-poc-7r75");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${revision}.current`);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toContain(
      "pulpWars.save.v7r75.current",
    );
  });

  it("a Road alone links a city to the capital: +1 each, as before", () => {
    const built = world({
      techs: ROADS,
      cities: [
        [1, 1],
        [4, 1],
      ],
      roads: row(2, 3, 1),
    });
    expect(linkFacts(built)).toEqual({ network: [0, 1], population: [1, 1] });
    expect(seaLinksV7(built.state, built.state.humanPlayerId)).toEqual([]);
  });

  it("two docks beside their centers link by sea alone, with Sailing and no Roads technology", () => {
    const built = world({ techs: SAILING, ...TWO_PORTS });
    expect(linkFacts(built)).toEqual({ network: [0, 1], population: [1, 1] });
    expect(seaLinksV7(built.state, built.state.humanPlayerId)).toEqual([
      {
        from: { x: 2, y: 2 },
        to: { x: 7, y: 2 },
        fromCityId: built.cityIds[0],
        toCityId: built.cityIds[1],
      },
    ]);
    // The separate sea-trade Coin is gone, for every city.
    expect(seaTradeCityIdsV7(built.state, built.state.humanPlayerId)).toEqual(
      new Set(),
    );
    expect(
      technologyCapabilitiesV7(["SHORECRAFT", "NAVIGATION"], "ORIGINAL"),
    ).toMatchObject({ seaLink: true });
    expect(technologyCapabilitiesV7([], "ORIGINAL")).toMatchObject({
      seaLink: false,
    });
  });

  it("without Sailing a captured dock still counts as Road, but no sea link forms", () => {
    const built = world({ techs: [], ...TWO_PORTS });
    expect(linkFacts(built)).toEqual({ network: [0], population: [0, 0] });
    expect(seaLinksV7(built.state, built.state.humanPlayerId)).toEqual([]);
  });

  it("a city linked by Road gains nothing more from Ports", () => {
    const roadOnly = world({
      techs: [...ROADS, "COMMERCE", "DRILL"],
      cities: TWO_PORTS.cities,
      roads: row(2, 7, 0),
    });
    const both = world({
      techs: [...ROADS, "COMMERCE", "DRILL", "SHORECRAFT", "NAVIGATION"],
      ...TWO_PORTS,
      roads: row(2, 7, 0),
    });
    expect(linkFacts(roadOnly)).toEqual({
      network: [0, 1],
      population: [1, 1],
    });
    expect(linkFacts(both)).toEqual(linkFacts(roadOnly));
    const income = (built: ReturnType<typeof world>): readonly number[] =>
      built.cityIds.map((id) => {
        const city = built.state.cities.find((item) => item.id === id);
        if (city === undefined) throw new Error("city missing");
        return cityIncomeV7(built.state, city);
      });
    // One trade Coin for each linked city, never a second one for the sea.
    expect(income(both)).toEqual(income(roadOnly));
  });

  it("Commerce pays a Port-linked city its trade Coin, once", () => {
    const without = world({ techs: SAILING, ...TWO_PORTS });
    const commerce = world({
      techs: ["SHORECRAFT", "DRILL", "COMMERCE"],
      ...TWO_PORTS,
    });
    const human = commerce.state.humanPlayerId;
    expect(landTradeCityIdsV7(without.state, human)).toEqual(new Set());
    expect(landTradeCityIdsV7(commerce.state, human)).toEqual(
      new Set(commerce.cityIds),
    );
    for (const id of commerce.cityIds) {
      const before = without.state.cities.find((city) => city.id === id);
      const after = commerce.state.cities.find((city) => city.id === id);
      if (before === undefined || after === undefined)
        throw new Error("city missing");
      expect(cityIncomeV7(commerce.state, after)).toBe(
        cityIncomeV7(without.state, before) + 1,
      );
    }
  });

  it("a mixed chain of Road, dock, sea, dock and Road links three cities", () => {
    const built = world({
      techs: [...ROADS, "SHORECRAFT"],
      cities: [
        [1, 1],
        [8, 1],
        [10, 1],
      ],
      // Capital, one Road tile, a dock beside that Road; across the sea a
      // dock beside a Road tile that touches the second city, and a Road on
      // to the third.
      roads: [
        [2, 1],
        [7, 1],
        [9, 1],
      ],
      shallow: row(4, 5, 2),
      ports: [
        [3, 2, 0],
        [6, 2, 1],
      ],
    });
    expect(linkFacts(built)).toEqual({
      network: [0, 1, 2],
      population: [2, 1, 1],
    });
    const view = viewForV7(built.state, built.state.humanPlayerId);
    expect(view.naval.ownedPorts.map((port) => port.joinsCity)).toEqual([
      true,
      true,
    ]);
    // The network's tiles as the view carries them: Roads, centers, docks.
    expect(
      view.naval.networkRoads.map((at) => `${at.x},${at.y}`).sort(),
    ).toEqual(["1,1", "2,1", "3,2", "6,2", "7,1", "8,1", "9,1", "10,1"].sort());
    expect(view.naval.seaRoutes).toEqual([
      {
        fromCityId: built.cityIds[0],
        toCityId: built.cityIds[1],
        path: row(3, 6, 2).map(([x, y]) => ({ x, y })),
      },
    ]);
  });

  it("a dock away from its center needs a Road between them", () => {
    const apart = {
      cities: TWO_PORTS.cities,
      shallow: row(4, 6, 2),
      ports: [
        [3, 2, 0],
        [7, 2, 1],
      ],
    } satisfies Omit<WorldSpec, "techs">;
    const unjoined = world({ techs: [...ROADS, "SHORECRAFT"], ...apart });
    expect(linkFacts(unjoined)).toEqual({ network: [0], population: [0, 0] });
    const view = viewForV7(unjoined.state, unjoined.state.humanPlayerId);
    expect(view.naval.ownedPorts.map((port) => port.joinsCity)).toEqual([
      false,
      true,
    ]);
    // The sea link itself exists and is drawn; it carries nothing yet.
    expect(view.naval.seaRoutes).toHaveLength(1);
    const joined = world({
      techs: [...ROADS, "SHORECRAFT"],
      ...apart,
      roads: [[2, 1]],
    });
    expect(linkFacts(joined)).toEqual({ network: [0, 1], population: [1, 1] });
  });

  it("a blockade, a long crossing and Deep Water break the sea link; a ship in the lane and fog do not", () => {
    const linked = { network: [0, 1], population: [1, 1] };
    const broken = { network: [0], population: [0, 0] };
    expect(
      linkFacts(
        world({ techs: SAILING, ...TWO_PORTS, hostileShips: [[7, 2]] }),
      ),
    ).toEqual(broken);
    // A ship in the lane, not on a dock, breaks nothing.
    expect(
      linkFacts(
        world({ techs: SAILING, ...TWO_PORTS, hostileShips: [[5, 2]] }),
      ),
    ).toEqual(linked);
    // Fog is no condition: the link gives stored population, which must
    // not change when a tile is explored. The view publishes such a
    // crossing as its two docks, and the public preview declines to guess.
    const fogged = world({
      techs: SAILING,
      ...TWO_PORTS,
      unexplored: [[5, 2]],
    });
    expect(linkFacts(fogged)).toEqual(linked);
    expect(
      viewForV7(fogged.state, fogged.state.humanPlayerId).naval.seaRoutes,
    ).toEqual([
      {
        fromCityId: fogged.cityIds[0],
        toCityId: fogged.cityIds[1],
        path: [
          { x: 2, y: 2 },
          { x: 7, y: 2 },
        ],
      },
    ]);
    const deep = {
      ...TWO_PORTS,
      shallow: [
        [3, 2],
        [4, 2],
        [6, 2],
      ],
      deep: [[5, 2]],
    } satisfies Omit<WorldSpec, "techs">;
    expect(linkFacts(world({ techs: SAILING, ...deep }))).toEqual(broken);
    expect(
      linkFacts(world({ techs: ["SHORECRAFT", "NAVIGATION"], ...deep })),
    ).toEqual(linked);
    // Six steps of water: one more than a sea link reaches.
    const far = {
      cities: [
        [1, 1],
        [9, 1],
      ],
      shallow: row(3, 7, 2),
      ports: [
        [2, 2, 0],
        [8, 2, 1],
      ],
    } satisfies Omit<WorldSpec, "techs">;
    const farWorld = world({ techs: SAILING, ...far });
    expect(linkFacts(farWorld)).toEqual(broken);
    expect(
      viewForV7(farWorld.state, farWorld.state.humanPlayerId).naval.seaRoutes,
    ).toEqual([]);
  });

  it("a Shipyard is a dock, two docks of one city get no sea link, and a foreign Road tile carries nothing", () => {
    const shipyard = world({
      techs: SAILING,
      cities: TWO_PORTS.cities,
      shallow: row(3, 6, 2),
      shipyards: [[2, 2, 0]],
      ports: [[7, 2, 1]],
    });
    expect(linkFacts(shipyard).network).toEqual([0, 1]);
    const sameCity = world({
      techs: SAILING,
      cities: [[1, 1]],
      shallow: row(3, 4, 2),
      ports: [
        [2, 2, 0],
        [5, 2, 0],
      ],
    });
    expect(seaLinksV7(sameCity.state, sameCity.state.humanPlayerId)).toEqual(
      [],
    );
    const foreign = world({
      techs: ROADS,
      cities: [
        [1, 1],
        [4, 1],
      ],
      roads: [[2, 1]],
      foreign: [[3, 1]],
    });
    expect(linkFacts(foreign)).toEqual({ network: [0], population: [0, 0] });
  });

  it("losing the original capital drops the link population and keeps the trade", () => {
    const built = world({
      techs: ["SHORECRAFT", "DRILL", "COMMERCE"],
      cities: [
        [1, 1],
        [8, 1],
        [8, 3],
      ],
      shallow: [...row(3, 6, 2), [7, 3]],
      ports: [
        [2, 2, 0],
        [7, 2, 1],
      ],
    });
    // The third city stands beside the second city's dock: a dock is Road.
    expect(linkFacts(built)).toEqual({
      network: [0, 1, 2],
      population: [2, 1, 1],
    });
    const hostileId = built.state.players.find(
      (player) => player.id !== built.state.humanPlayerId,
    )?.id;
    if (hostileId === undefined) throw new Error("hostile seat missing");
    const lost = {
      ...built.state,
      cities: built.state.cities.map((city) =>
        city.id === built.cityIds[0] ? { ...city, ownerId: hostileId } : city,
      ),
    } as GameStateV7;
    expect(
      built.cityIds.map((id) =>
        roadPopulationForCityV7(lost, {
          id,
          ownerId: built.state.humanPlayerId,
        }),
      ),
    ).toEqual([0, 0, 0]);
    expect(landTradeCityIdsV7(lost, built.state.humanPlayerId)).toEqual(
      new Set([built.cityIds[1], built.cityIds[2]]),
    );
  });

  it("draws one dashed line for each pair of cities, the link that carries the connection", () => {
    // The second city has two docks on the lane; only the far one (x 7)
    // stands beside its center. The nearer dock (x 5, two tiles from the
    // center) gives the shorter crossing but carries nothing.
    const built = world({
      techs: SAILING,
      cities: TWO_PORTS.cities,
      shallow: [
        [3, 2],
        [4, 2],
        [6, 2],
      ],
      ports: [
        [2, 2, 0],
        [5, 2, 1],
        [7, 2, 1],
      ],
    });
    expect(seaLinksV7(built.state, built.state.humanPlayerId)).toHaveLength(2);
    const view = viewForV7(built.state, built.state.humanPlayerId);
    expect(view.naval.seaRoutes).toHaveLength(1);
    expect(view.naval.seaRoutes[0]?.path.at(-1)).toEqual({ x: 7, y: 2 });
    expect(linkFacts(built).network).toEqual([0, 1]);
  });

  it("the public preview of a Port or Road reports the link it completes, and nothing for a duplicate", () => {
    // The capital has its dock; the second city has a free water tile
    // beside its center, five steps away.
    const spec = {
      cities: TWO_PORTS.cities,
      shallow: [...row(3, 6, 2), [7, 2]],
      ports: [[2, 2, 0]],
    } satisfies Omit<WorldSpec, "techs">;
    const open = world({ techs: [...ROADS, "SHORECRAFT"], ...spec });
    const withTerritory = (
      built: ReturnType<typeof world>,
      at: Coord,
      city: number,
    ): GameStateV7 =>
      ({
        ...built.state,
        players: built.state.players.map((player) =>
          player.id === built.state.humanPlayerId
            ? { ...player, coins: 100 }
            : player,
        ),
        board: {
          ...built.state.board,
          tiles: built.state.board.tiles.map((tile) =>
            tile.at.x === at[0] && tile.at.y === at[1]
              ? { ...tile, territoryCityId: built.cityIds[city] ?? null }
              : tile,
          ),
        },
      }) as GameStateV7;
    const human = open.state.humanPlayerId;
    const completing = previewEconomicV7(
      viewForV7(withTerritory(open, [7, 2], 1), human),
      { kind: "BUILD_PORT", at: { x: 7, y: 2 } },
    );
    if (!completing.ok) throw new Error(completing.error);
    // The dock's own +1 and the link's +1 for its city; the link's +1 for
    // the capital.
    expect(completing.preview.populationDeltaByCity).toEqual([
      { cityId: open.cityIds[0], delta: 1 },
      { cityId: open.cityIds[1], delta: 2 },
    ]);
    // With a Road already linking the two cities the same Port is worth its
    // own population only.
    const roaded = world({
      techs: [...ROADS, "SHORECRAFT"],
      ...spec,
      roads: row(2, 7, 0),
    });
    const duplicate = previewEconomicV7(
      viewForV7(withTerritory(roaded, [7, 2], 1), human),
      { kind: "BUILD_PORT", at: { x: 7, y: 2 } },
    );
    if (!duplicate.ok) throw new Error(duplicate.error);
    expect(duplicate.preview.populationDeltaByCity).toEqual([
      { cityId: open.cityIds[1], delta: 1 },
    ]);
    // And a Road that only doubles a Port link is worth nothing.
    const sea = world({
      techs: [...ROADS, "SHORECRAFT"],
      ...TWO_PORTS,
      roads: row(2, 6, 0),
    });
    const lastRoad = previewEconomicV7(viewForV7(sea.state, human), {
      kind: "BUILD_ROAD",
      at: { x: 7, y: 0 },
    });
    if (lastRoad.ok) expect(lastRoad.preview.populationDeltaByCity).toEqual([]);
    else expect(lastRoad.error).toBe("NOT_OFFERED");
  });

  it("the reducer keeps the link through real commands: a second Port links, a blockade unlinks, its end links again", () => {
    // A generated map (seed 9003): the capital at (2,2), a village at (2,8).
    // The five tiles between them become a lane of Shallow Water.
    const fixture = coastalV7(9_003);
    const human = fixture.state.humanPlayerId;
    const walker = fixture.state.units.find((unit) => unit.ownerId === human);
    const hostile = fixture.state.units.find((unit) => unit.ownerId !== human);
    if (walker === undefined || hostile === undefined)
      throw new Error("units missing");
    let state = checkedV7({
      ...fixture.state,
      units: fixture.state.units
        .filter((unit) => unit.id === walker.id || unit.id === hostile.id)
        .map((unit) =>
          unit.id === walker.id
            ? { ...unit, at: { x: 2, y: 8 }, captureEligible: true }
            : unit,
        ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === 2 && tile.at.y >= 3 && tile.at.y <= 7
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
              }
            : tile,
        ),
      },
    });
    const apply = (
      actor: typeof human,
      command: Parameters<typeof applyCommandV7>[2],
    ): readonly string[] => {
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      return result.events.map((event) => event.kind);
    };
    const link = (): readonly number[] =>
      state.cities
        .filter((city) => city.ownerId === human)
        .sort((left, right) => left.id - right.id)
        .map((city) => roadPopulationForCityV7(state, city));
    const live = (): readonly number[] =>
      state.cities
        .filter((city) => city.ownerId === human)
        .sort((left, right) => left.id - right.id)
        .map((city) => city.economicPopulation);
    apply(human, { kind: "CAPTURE", unitId: walker.id });
    apply(human, { kind: "BUILD_PORT", at: { x: 2, y: 3 } });
    expect(link()).toEqual([0, 0]);
    expect(live()).toEqual([1, 0]);
    // The second dock, four steps of water from the first: each city gets
    // its link population on top of the docks' own.
    expect(apply(human, { kind: "BUILD_PORT", at: { x: 2, y: 7 } })).toContain(
      "SEA_NETWORK_CHANGED",
    );
    expect(link()).toEqual([1, 1]);
    expect(live()).toEqual([2, 2]);
    while (state.pendingChoices[0] !== undefined) {
      const choice = state.pendingChoices[0];
      const reward = choice.candidates[0];
      if (reward === undefined) throw new Error("reward missing");
      apply(human, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: choice.cityId,
        reachedLevel: choice.reachedLevel,
        reward,
      });
    }
    // A hostile boat sails onto the second dock: the dock gives nothing and
    // the link is gone for both cities; when it leaves, both come back.
    const fresh = hostile.activation;
    const boat = (at: { x: number; y: number }): void => {
      state = checkedV7({
        ...state,
        activeSeatIndex: state.turnOrder.indexOf(hostile.ownerId),
        units: state.units.map((unit) =>
          unit.id === hostile.id
            ? {
                ...unit,
                at,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
                hp: 10,
                maxHp: 10,
                activation: fresh,
              }
            : unit,
        ),
      });
    };
    boat({ x: 2, y: 6 });
    expect(
      apply(hostile.ownerId, {
        kind: "MOVE",
        unitId: hostile.id,
        path: [{ x: 2, y: 7 }],
      }),
    ).toEqual(
      expect.arrayContaining(["PORT_BLOCKADE_CHANGED", "SEA_NETWORK_CHANGED"]),
    );
    expect(link()).toEqual([0, 0]);
    expect(live()).toEqual([1, 0]);
    boat({ x: 2, y: 7 });
    apply(hostile.ownerId, {
      kind: "MOVE",
      unitId: hostile.id,
      path: [{ x: 2, y: 6 }],
    });
    expect(link()).toEqual([1, 1]);
    expect(live()).toEqual([2, 2]);
  });

  it("the Normal AI values a Port by the link it completes, and plans no Road to a city a Port already links", () => {
    // The same generated map: the capital at (2,2), a captured village at
    // (2,8), and a lane of Shallow Water between them.
    const fixture = coastalV7(9_003);
    const human = fixture.state.humanPlayerId;
    const walker = fixture.state.units.find((unit) => unit.ownerId === human);
    if (walker === undefined) throw new Error("unit missing");
    let state = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === walker.id
          ? { ...unit, at: { x: 2, y: 8 }, captureEligible: true }
          : unit,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === 2 && tile.at.y >= 3 && tile.at.y <= 7
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
              }
            : tile,
        ),
      },
    });
    const apply = (command: Parameters<typeof applyCommandV7>[2]): void => {
      const result = applyCommandV7(state, human, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      while (state.pendingChoices[0] !== undefined) {
        const choice = state.pendingChoices[0];
        const reward = choice.candidates[0];
        if (reward === undefined) throw new Error("reward missing");
        const chosen = applyCommandV7(state, human, {
          kind: "CHOOSE_CITY_REWARD",
          cityId: choice.cityId,
          reachedLevel: choice.reachedLevel,
          reward,
        });
        if (!chosen.accepted) throw new Error(chosen.error.code);
        state = chosen.state;
      }
    };
    apply({ kind: "CAPTURE", unitId: walker.id });
    const secondPort = { kind: "BUILD_PORT" as const, at: { x: 2, y: 7 } };
    // Without a dock at the capital the second city's Port is worth its own
    // population only.
    const alone = scoreCommandV7(viewForV7(state, human), secondPort);
    expect(
      inspectNormalTacticalFactsV7(viewForV7(state, human)).roadCorridor,
    ).not.toBeNull();
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 3 } });
    // With one, the same Port completes the link: +1 for its city and +1
    // for the capital on top of the dock's own +1 (here both cities reach
    // level 2 with it), and the AI's score follows the preview.
    const linking = scoreCommandV7(viewForV7(state, human), secondPort);
    const preview = previewEconomicV7(viewForV7(state, human), secondPort);
    if (!preview.ok) throw new Error(preview.error);
    expect(
      preview.preview.populationDeltaByCity.map((entry) => entry.delta),
    ).toEqual([1, 2]);
    expect(preview.preview.levelsReached).toHaveLength(2);
    expect(alone.immediateValue).toBe(5 - 4);
    expect(linking.immediateValue).toBeGreaterThan(alone.immediateValue + 10);
    expect(
      inspectNormalTacticalFactsV7(viewForV7(state, human)).roadCorridor,
    ).not.toBeNull();
    apply(secondPort);
    expect(viewForV7(state, human).naval.networkCityIds.length).toBe(2);
    // The Port links the city now: no Road corridor is planned to it.
    expect(
      inspectNormalTacticalFactsV7(viewForV7(state, human)).roadCorridor,
    ).toBeNull();
  });

  it("shows the link: a Road drawn onto each dock and center, the dashed line, and the icons' way across it", () => {
    // The same generated map again: capital (2,2), village (2,8), a lane of
    // Shallow Water between, and a dock at each end of it.
    const fixture = coastalV7(9_003);
    const human = fixture.state.humanPlayerId;
    const walker = fixture.state.units.find((unit) => unit.ownerId === human);
    if (walker === undefined) throw new Error("unit missing");
    let state = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === walker.id
          ? { ...unit, at: { x: 2, y: 8 }, captureEligible: true }
          : unit,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === 2 && tile.at.y >= 3 && tile.at.y <= 7
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
              }
            : tile,
        ),
      },
    });
    const apply = (command: Parameters<typeof applyCommandV7>[2]): void => {
      const result = applyCommandV7(state, human, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
    };
    apply({ kind: "CAPTURE", unitId: walker.id });
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 3 } });
    const before = viewForV7(state, human);
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 7 } });
    const after = viewForV7(state, human);
    // The link animation: the second Port completes the connection, and
    // the way runs center, dock, the water of the dashed line, dock, center.
    const changes = roadLinkChangesV7(before, after);
    expect(changes.unlinked).toEqual([]);
    expect(changes.linked).toHaveLength(1);
    expect(changes.linked[0]).toMatchObject({
      capitalAt: { x: 2, y: 2 },
      cityAt: { x: 2, y: 8 },
      path: [2, 3, 4, 5, 6, 7, 8].map((y) => ({ x: 2, y })),
    });
    const plan = buildBoardRenderPlanV7(after, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const road = (x: number, y: number) =>
      plan.entries.find((entry) => entry.key === `road:${x},${y}`);
    // A Road stub from each center to its dock, and from the dock back.
    expect(road(2, 2)?.roadNeighbors).toEqual([{ x: 2, y: 3 }]);
    expect(road(2, 3)?.roadNeighbors).toEqual([{ x: 2, y: 2 }]);
    expect(road(2, 7)?.roadNeighbors).toEqual([{ x: 2, y: 8 }]);
    expect(road(2, 8)?.roadNeighbors).toEqual([{ x: 2, y: 7 }]);
    // No Road on the open water, and the dashed line from dock to dock.
    expect(road(2, 5)).toBeUndefined();
    expect(
      plan.entries
        .filter((entry) => entry.label === "SEA_ROUTE")
        .map((entry) => [entry.at, entry.linkTo]),
    ).toEqual(
      [3, 4, 5, 6].map((y) => [
        { x: 2, y },
        { x: 2, y: y + 1 },
      ]),
    );
    // Before the second Port: one dock, no line, and its stub already.
    const earlier = buildBoardRenderPlanV7(before, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(
      earlier.entries.filter((entry) => entry.label === "SEA_ROUTE"),
    ).toEqual([]);
    expect(
      earlier.entries.find((entry) => entry.key === "road:2,3")?.roadNeighbors,
    ).toEqual([{ x: 2, y: 2 }]);
  });

  it("the review boards: an adjacent Port, two cities linked by Ports, and the mixed chain", () => {
    const facts = (state: GameStateV7) => {
      const human = state.humanPlayerId;
      const view = viewForV7(state, human);
      return {
        network: view.naval.networkCityIds.length,
        link: state.cities
          .filter((city) => city.ownerId === human)
          .sort((left, right) => left.id - right.id)
          .map((city) => roadPopulationForCityV7(state, city)),
        seaRoutes: view.naval.seaRoutes.map((route) => route.path.length),
        joined: view.naval.ownedPorts.map((port) => port.joinsCity),
      };
    };
    expect(facts(portLinkAdjacentFixtureV7())).toEqual({
      network: 1,
      link: [0],
      seaRoutes: [],
      joined: [true],
    });
    expect(facts(portLinkPortsFixtureV7())).toEqual({
      network: 2,
      link: [1, 1],
      seaRoutes: [5],
      joined: [true, true],
    });
    // Capital, Road, Port, sea, Port, city, Road, Road, city.
    const chain = portLinkChainFixtureV7();
    expect(facts(chain)).toEqual({
      network: 3,
      link: [2, 1, 1],
      seaRoutes: [4],
      joined: [true, true],
    });
    const plan = buildBoardRenderPlanV7(
      viewForV7(chain, chain.humanPlayerId),
      [],
      { selection: null, selectedUnitId: null, selectedAchievement: null },
    );
    const at = PORT_LINK_UI_V7;
    expect(
      plan.entries.find(
        (entry) => entry.key === `road:${at.chainRoad.x},${at.chainRoad.y}`,
      )?.roadNeighbors,
    ).toEqual([at.capital, at.chainPort]);
    expect(
      plan.entries.find(
        (entry) => entry.key === `road:${at.chainPort.x},${at.chainPort.y}`,
      )?.roadNeighbors,
    ).toEqual([at.chainRoad]);
  });
});
