import { describe, expect, it } from "vitest";
import {
  landConnectedCityIdsV7,
  marketIncomeForCityV7,
  marketIncomeReaderV7,
  roadPopulationForCityV7,
  roadPopulationReaderV7,
  type GameStateV7,
} from "../../src/engine/index";
import { ROAD_LINK_V7, roadLinkFixtureV7 } from "../fixtures/v7-road-link-ui";

/**
 * Bead pulp_wars-2yc.79 (performance): the connection network of a state
 * that carries no accepted-state certificate is cached on the object and
 * reused only while the facts it was computed from are unchanged (compared
 * in place since 2yc.79, formerly as one joined string), and the per-city
 * readers give exactly the per-city functions' values.
 */
type MutableTile = {
  -readonly [
    K in keyof GameStateV7["board"]["tiles"][number]
  ]: GameStateV7["board"]["tiles"][number][K];
};

function sorted(ids: ReadonlySet<number>): number[] {
  return [...ids].sort((a, b) => a - b);
}

describe("connection network cache facts", () => {
  it("recomputes an uncertified state's network after its Roads change in place", () => {
    const state = roadLinkFixtureV7();
    const human = state.humanPlayerId;
    // A structured clone is a plain object without a certificate.
    const graph = structuredClone(state) as GameStateV7;
    const before = sorted(landConnectedCityIdsV7(graph, human));
    expect(sorted(landConnectedCityIdsV7(graph, human))).toEqual(before);
    const at = ROAD_LINK_V7.build;
    const tile = graph.board.tiles[
      at.y * graph.board.width + at.x
    ] as MutableTile;
    expect(tile.road).toBe(false);
    tile.road = true;
    const after = sorted(landConnectedCityIdsV7(graph, human));
    expect(after.length).toBe(before.length + 1);
    expect(after).toEqual(
      sorted(landConnectedCityIdsV7(structuredClone(graph), human)),
    );
    tile.road = false;
    expect(sorted(landConnectedCityIdsV7(graph, human))).toEqual(before);
  });

  it("recomputes after a unit, a technology or a city owner changes in place", () => {
    const state = roadLinkFixtureV7();
    const human = state.humanPlayerId;
    const graph = structuredClone(state) as {
      -readonly [K in keyof GameStateV7]: GameStateV7[K];
    };
    const at = ROAD_LINK_V7.build;
    (graph.board.tiles[at.y * graph.board.width + at.x] as MutableTile).road =
      true;
    const linked = sorted(landConnectedCityIdsV7(graph, human));
    expect(linked.length).toBeGreaterThan(1);
    // The Roads technology lost: only the city centres remain nodes.
    const player = graph.players.find((candidate) => candidate.id === human);
    if (player === undefined) throw new Error("human missing");
    const technologies = player.researchedTechs;
    (player as { researchedTechs: typeof technologies }).researchedTechs =
      technologies.filter((technology) => technology !== "ROADS");
    expect(sorted(landConnectedCityIdsV7(graph, human))).toEqual(
      sorted(landConnectedCityIdsV7(structuredClone(graph), human)),
    );
    (player as { researchedTechs: typeof technologies }).researchedTechs =
      technologies;
    expect(sorted(landConnectedCityIdsV7(graph, human))).toEqual(linked);
    // A captured village handed to another owner leaves the network.
    const village = graph.cities.find(
      (city) =>
        city.at.x === ROAD_LINK_V7.village.x &&
        city.at.y === ROAD_LINK_V7.village.y,
    );
    if (village === undefined) throw new Error("village missing");
    const rival = graph.players.find((candidate) => candidate.id !== human);
    if (rival === undefined) throw new Error("rival missing");
    (village as { ownerId: typeof village.ownerId }).ownerId = rival.id;
    expect(sorted(landConnectedCityIdsV7(graph, human))).toEqual(
      sorted(landConnectedCityIdsV7(structuredClone(graph), human)),
    );
    expect(sorted(landConnectedCityIdsV7(graph, human))).not.toEqual(linked);
  });

  it("reads the same Road population and Market income per city", () => {
    for (const state of [
      roadLinkFixtureV7(),
      structuredClone(roadLinkFixtureV7()),
    ]) {
      const roads = roadPopulationReaderV7(state);
      const markets = marketIncomeReaderV7(state);
      for (const city of state.cities) {
        expect(roads(city)).toBe(roadPopulationForCityV7(state, city));
        expect(markets(city)).toBe(marketIncomeForCityV7(state, city));
      }
    }
  });
});
