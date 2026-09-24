import { describe, expect, it } from "vitest";
import { viewForV7 } from "../../src/engine/index";
import { initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 public territory borders", () => {
  it("projects only real edges touching exploration, without hidden tile content or duplicates", () => {
    const initial = initialV7(1519);
    const ownCity = initial.cities.find(
      (city) => city.ownerId === initial.humanPlayerId,
    );
    const rivalCity = initial.cities.find(
      (city) => city.ownerId !== initial.humanPlayerId,
    );
    if (!ownCity || !rivalCity) throw new Error("Expected both city owners");
    const assigned = new Map([
      ["0,0", ownCity.id],
      ["1,0", ownCity.id],
      ["2,0", ownCity.id],
      ["3,0", rivalCity.id],
      ["2,1", ownCity.id],
      ["3,1", rivalCity.id],
      ["5,5", ownCity.id],
    ]);
    const explored = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      ownCity.at,
    ];
    const state = {
      ...initial,
      board: {
        ...initial.board,
        tiles: initial.board.tiles.map((tile) => ({
          ...tile,
          territoryCityId: assigned.get(`${tile.at.x},${tile.at.y}`) ?? null,
        })),
      },
      players: initial.players.map((player) =>
        player.id === initial.humanPlayerId ? { ...player, explored } : player,
      ),
    };
    const view = viewForV7(state, initial.humanPlayerId);
    const edges = view.board.territoryBorders;
    const at = (x: number, y: number, edge: string) =>
      edges.find(
        (border) =>
          border.at.x === x && border.at.y === y && border.edge === edge,
      );
    expect(at(0, 0, "NORTH")?.ownerId).toBe(ownCity.ownerId);
    expect(at(0, 0, "WEST")?.ownerId).toBe(ownCity.ownerId);
    expect(at(0, 0, "EAST")).toBeUndefined(); // Same city continues under fog.
    expect(at(2, 0, "EAST")).toMatchObject({
      ownerId: ownCity.ownerId,
      sharedOwnerIds: null,
      cityIds: [ownCity.id],
    });
    expect(at(3, 0, "EAST")).toMatchObject({
      ownerId: rivalCity.ownerId,
      sharedOwnerIds: null,
    });
    expect(at(2, 1, "EAST")).toMatchObject({
      ownerId: ownCity.ownerId,
      sharedOwnerIds: [ownCity.ownerId, rivalCity.ownerId],
    });
    expect(at(5, 5, "EAST")).toBeUndefined(); // Both sides hidden.
    const physical = edges.map((border) =>
      border.edge === "EAST"
        ? `v:${border.at.x + 1}:${border.at.y}`
        : border.edge === "WEST"
          ? `v:${border.at.x}:${border.at.y}`
          : border.edge === "SOUTH"
            ? `h:${border.at.x}:${border.at.y + 1}`
            : `h:${border.at.x}:${border.at.y}`,
    );
    expect(new Set(physical).size).toBe(edges.length);
    const hidden = view.board.tiles.find(
      (tile) => tile.at.x === 3 && tile.at.y === 0,
    );
    expect(hidden).toEqual({ at: { x: 3, y: 0 }, explored: false });
    expect(JSON.stringify(edges)).not.toMatch(
      /terrain|resource|improvement|road|unit/,
    );
  });
});
