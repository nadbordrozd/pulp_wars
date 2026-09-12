import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import { publicResourceV7, viewForV7 } from "../../src/engine/index";
import { checkedV7, initialV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-4 public Ore and Normal prospecting", () => {
  it("does not leak Ore before Engineering and reveals it afterward", () => {
    const tile = { terrain: "MOUNTAIN" as const, resource: "ORE" as const };
    expect(publicResourceV7(tile, ["GATHERING"])).toBeNull();
    expect(publicResourceV7(tile, ["GATHERING", "ENGINEERING"])).toBe("ORE");
  });

  it("values only public owned Mountain biome priors", () => {
    const state = initialV7(0);
    const view = viewForV7(state, state.humanPlayerId);
    const score = scoreCommandV7(view, { kind: "RESEARCH", tech: "DRILL" });
    const points = view.board.tiles.reduce(
      (sum, tile) =>
        sum +
        (tile.explored &&
        tile.terrain === "MOUNTAIN" &&
        tile.territoryOwnerId === view.viewer.id
          ? tile.biome === "PLAINS"
            ? 30
            : tile.biome === "WOODLAND"
              ? 38
              : 68
          : 0),
      0,
    );
    expect(score.objectiveValue).toBe(points % 100);
  });

  it("scores the exact 30/38/68 priors and carries whole points", () => {
    const base = viewForV7(initialV7(0), initialV7(0).humanPlayerId);
    const hidden: ReturnType<typeof viewForV7> = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.explored ? { ...tile, territoryOwnerId: null } : tile,
        ),
      },
    };
    const command = { kind: "RESEARCH", tech: "DRILL" } as const;
    const baseline = scoreCommandV7(hidden, command);
    const tileIndexes = hidden.board.tiles.flatMap((tile, index) =>
      tile.explored ? [index] : [],
    );
    const [plainsIndex, woodlandIndex, highlandsIndex] = tileIndexes;
    if (
      plainsIndex === undefined ||
      woodlandIndex === undefined ||
      highlandsIndex === undefined
    )
      throw new Error("prospect tiles missing");
    for (const [biome, points, tileIndex] of [
      ["PLAINS", 30, plainsIndex],
      ["WOODLAND", 38, woodlandIndex],
      ["HIGHLANDS", 68, highlandsIndex],
    ] as const) {
      const view = withProspects(hidden, [{ biome, tileIndex }]);
      const score = scoreCommandV7(view, command);
      expect(score.strategicValue).toBe(baseline.strategicValue);
      expect(score.objectiveValue).toBe(points);
    }
    const combined = scoreCommandV7(
      withProspects(hidden, [
        { biome: "PLAINS", tileIndex: plainsIndex },
        { biome: "WOODLAND", tileIndex: woodlandIndex },
        { biome: "HIGHLANDS", tileIndex: highlandsIndex },
      ]),
      command,
    );
    expect(combined.strategicValue).toBe(baseline.strategicValue + 1);
    expect(combined.objectiveValue).toBe(36);
  });

  it("keeps hidden Ore states observation-equivalent with deterministic choices", () => {
    const base = initialV7(4);
    const oreTile = base.board.tiles.find(
      (tile) => tile.site === null && tile.improvement === null,
    );
    if (oreTile === undefined) throw new Error("Ore test tile missing");
    const at = oreTile.at;
    const make = (resource: "ORE" | null) =>
      checkedV7({
        ...base,
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            tile.at.x === at.x && tile.at.y === at.y
              ? { ...tile, terrain: "MOUNTAIN" as const, resource }
              : tile,
          ),
        },
        players: base.players.map((player) =>
          player.id === base.humanPlayerId
            ? {
                ...player,
                explored: [...player.explored, at]
                  .filter(
                    (item, index, values) =>
                      values.findIndex(
                        (other) => other.x === item.x && other.y === item.y,
                      ) === index,
                  )
                  .sort((left, right) => left.y - right.y || left.x - right.x),
              }
            : player,
        ),
      });
    const oreView = viewForV7(make("ORE"), base.humanPlayerId);
    const emptyView = viewForV7(make(null), base.humanPlayerId);
    expect(oreView).toEqual(emptyView);
    expect(
      oreView.board.tiles.find(
        (tile) => tile.at.x === at.x && tile.at.y === at.y,
      ),
    ).toMatchObject({
      explored: true,
      biome: base.board.tiles.find(
        (tile) => tile.at.x === at.x && tile.at.y === at.y,
      )?.biome,
      terrain: "MOUNTAIN",
      resource: null,
    });
    expect(
      scoreCommandV7(oreView, { kind: "RESEARCH", tech: "DRILL" }),
    ).toEqual(scoreCommandV7(emptyView, { kind: "RESEARCH", tech: "DRILL" }));
    expect(chooseNormalCommandV7(oreView)).toEqual(
      chooseNormalCommandV7(emptyView),
    );
    const engineered = checkedV7({
      ...make("ORE"),
      players: make("ORE").players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: ["GATHERING", "DRILL", "ENGINEERING"],
            }
          : player,
      ),
    });
    expect(
      viewForV7(engineered, base.humanPlayerId).board.tiles.find(
        (tile) => tile.at.x === at.x && tile.at.y === at.y,
      ),
    ).toMatchObject({ resource: "ORE" });

    const unexplored = checkedV7({
      ...make("ORE"),
      players: make("ORE").players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (item) => item.x !== at.x || item.y !== at.y,
              ),
            }
          : player,
      ),
    });
    expect(
      viewForV7(unexplored, base.humanPlayerId).board.tiles.find(
        (tile) => tile.at.x === at.x && tile.at.y === at.y,
      ),
    ).toEqual({ at, explored: false });
  });
});

function withProspects(
  view: ReturnType<typeof viewForV7>,
  prospects: readonly {
    biome: "PLAINS" | "WOODLAND" | "HIGHLANDS";
    tileIndex: number;
  }[],
): ReturnType<typeof viewForV7> {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile, index) => {
        const prospect = prospects.find((item) => item.tileIndex === index);
        return prospect === undefined || !tile.explored
          ? tile
          : {
              ...tile,
              explored: true,
              biome: prospect.biome,
              terrain: "MOUNTAIN" as const,
              resource: null,
              improvement: null,
              territoryOwnerId: view.viewer.id,
            };
      }),
    },
  };
}
