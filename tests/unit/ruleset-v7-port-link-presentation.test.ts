import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  publicLiveTotalForCityV7,
  publicLinkPopulationForCityV7,
  queryTechnologyTreeV7,
  roadPopulationForCityV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import {
  PORT_NOT_JOINED_TEXT_V7,
  PORT_NOT_JOINED_WATER_TEXT_V7,
  ROAD_LINK_UNLOCK_TEXT_V7,
  SEA_LINK_UNLOCK_TEXT_V7,
  cityLinkPopulationV7,
  cityLinkTitleV7,
  portNotJoinedTextV7,
} from "../../src/render/technology-unlock-text-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { coastalV7 } from "../fixtures/v7-naval-builders";

/**
 * Bead pulp_wars-5ti.29 (the user, 2026-10-20: "I had a bunch of cities
 * connected to the capital by ports and then I researched the roads tech.
 * I was expecting to receive the population bonus straight away"). The
 * rule of `pulp_wars-5ti.12` stands: a dock two tiles from its city's
 * center joins it only by Road tiles or other docks, and Roads research
 * adds no link by itself. What misled was the presentation: a dashed sea
 * line drawn from such a dock, the Roads card claiming the link
 * population, and a warning that asked for a Road where only water lay.
 */
describe("Port links say what they carry (pulp_wars-5ti.29)", () => {
  /**
   * A generated map (seed 9003): the capital at (2,2) and a village at
   * (2,8), Shallow Water from (2,3) to (2,7), and at (1,3) and (3,3) too
   * when `wide`. The capital's borders reach row 4, two tiles from its center,
   * as after border growth. No Roads.
   */
  function farDockWorld(wide = true): {
    state: GameStateV7;
    readonly human: GameStateV7["humanPlayerId"];
    readonly walker: GameStateV7["units"][number]["id"];
  } {
    const fixture = coastalV7(9_003);
    const human = fixture.state.humanPlayerId;
    const walker = fixture.state.units.find((unit) => unit.ownerId === human);
    const hostile = fixture.state.units.find((unit) => unit.ownerId !== human);
    const capital = fixture.state.cities.find((city) => city.ownerId === human);
    if (walker === undefined || hostile === undefined || capital === undefined)
      throw new Error("fixture entities missing");
    const state = checkedV7({
      ...fixture.state,
      // The chest at (3,3) would lie on the wide strait.
      treasureChests: fixture.state.treasureChests.filter(
        (at) => !wide || at.x !== 3 || at.y !== 3,
      ),
      players: fixture.state.players.map((player) =>
        player.id === human
          ? {
              ...player,
              coins: 1_000,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "ROADS" && tech !== "COMMERCE",
              ),
            }
          : player,
      ),
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
          tile.at.y >= 3 &&
          tile.at.y <= 7 &&
          (tile.at.x === 2 ||
            (wide && tile.at.y === 3 && (tile.at.x === 1 || tile.at.x === 3)))
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
                territoryCityId:
                  tile.at.y <= 4 ? capital.id : tile.territoryCityId,
              }
            : tile.at.y === 4 && (tile.at.x === 1 || tile.at.x === 3)
              ? // The capital's grown borders: the coast the dock touches.
                { ...tile, territoryCityId: capital.id }
              : tile,
        ),
      },
    } as GameStateV7);
    return { state, human, walker: walker.id };
  }

  it("a dock away from the capital draws no sea line, Roads research adds nothing, and a Port beside the capital links every city at once", () => {
    const world = farDockWorld();
    const { human } = world;
    const apply = (command: Parameters<typeof applyCommandV7>[2]): void => {
      const result = applyCommandV7(world.state, human, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      world.state = result.state;
    };
    const own = () =>
      world.state.cities
        .filter((city) => city.ownerId === human)
        .sort((left, right) => left.id - right.id);
    const link = (): readonly number[] =>
      own().map((city) => roadPopulationForCityV7(world.state, city));
    /** The view, the public preview and the engine agree on every city. */
    const agree = (): void => {
      const view = viewForV7(world.state, human);
      for (const city of own()) {
        expect(publicLiveTotalForCityV7(view, city.id)).toBe(
          city.economicPopulation,
        );
        expect(publicLinkPopulationForCityV7(view, city.id)).toBe(
          roadPopulationForCityV7(world.state, city),
        );
        expect(cityLinkPopulationV7(view, city.id)).toBe(
          roadPopulationForCityV7(world.state, city),
        );
      }
    };
    apply({ kind: "CAPTURE", unitId: world.walker });
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 4 } });
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 7 } });
    // The sea link exists, but the capital's dock is two tiles from its
    // center with only water between them: it carries nothing, so no line,
    // and the warning asks for a Port beside the capital.
    expect(link()).toEqual([0, 0]);
    let view = viewForV7(world.state, human);
    expect(view.naval.seaRoutes).toEqual([]);
    const far = view.naval.ownedPorts.find(
      (port) => port.at.x === 2 && port.at.y === 4,
    );
    expect(far?.joinsCity).toBe(false);
    if (far === undefined) throw new Error("dock missing");
    expect(portNotJoinedTextV7(view, far)).toBe(PORT_NOT_JOINED_WATER_TEXT_V7);
    expect(own().map((city) => cityLinkTitleV7(view, city.id))).toEqual([
      null,
      null,
    ]);
    agree();
    // Roads research: the population is recomputed, and nothing joins.
    apply({ kind: "RESEARCH", tech: "ROADS" });
    expect(link()).toEqual([0, 0]);
    expect(viewForV7(world.state, human).naval.seaRoutes).toEqual([]);
    agree();
    // A Port beside the capital joins the far dock: both cities linked,
    // and the line is drawn.
    apply({ kind: "BUILD_PORT", at: { x: 2, y: 3 } });
    expect(link()).toEqual([1, 1]);
    view = viewForV7(world.state, human);
    expect(view.naval.seaRoutes).toHaveLength(1);
    expect(view.naval.ownedPorts.every((port) => port.joinsCity)).toBe(true);
    expect(own().map((city) => cityLinkTitleV7(view, city.id))).toEqual([
      "1 city joined to your capital by Road or Port: +1 population",
      "Joined to your capital by Road or Port: +1 population",
    ]);
    agree();
  });

  it("the dock's warning asks for a Road when land lies between the dock and its city", () => {
    const world = farDockWorld(false);
    const { human } = world;
    for (const command of [
      { kind: "CAPTURE", unitId: world.walker },
      { kind: "BUILD_PORT", at: { x: 2, y: 4 } },
    ] as const) {
      const result = applyCommandV7(world.state, human, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      world.state = result.state;
    }
    const view = viewForV7(world.state, human);
    const far = view.naval.ownedPorts.find(
      (port) => port.at.x === 2 && port.at.y === 4,
    );
    if (far === undefined) throw new Error("dock missing");
    expect(far.joinsCity).toBe(false);
    // Land at (1,3) and (3,3) touches both the dock and the capital: a
    // Road there would join them.
    expect(portNotJoinedTextV7(view, far)).toBe(PORT_NOT_JOINED_TEXT_V7);
  });

  it("the Roads card no longer claims the link population; the Sailing card states it", () => {
    const { state, human } = farDockWorld();
    const tree = queryTechnologyTreeV7(state, human);
    const text = (tech: string): readonly string[] => {
      const node = tree.nodes.find((item) => item.id === tech);
      if (node === undefined) throw new Error(`${tech} missing`);
      return technologyEffectGroupsV7(node.effects, tree.faction).flatMap(
        (group) => group.items,
      );
    };
    const roads = text("ROADS");
    expect(roads).toContain(ROAD_LINK_UNLOCK_TEXT_V7);
    for (const line of roads) expect(line).not.toMatch(/population/i);
    expect(text("SHORECRAFT")).toContain(SEA_LINK_UNLOCK_TEXT_V7);
    expect(SEA_LINK_UNLOCK_TEXT_V7).toContain("+1 population");
  });
});
