import { describe, expect, it } from "vitest";
import { parseGameStateV7 } from "../../src/engine/index";
import {
  MARKETING_SCENE_V7,
  marketingSceneStateV7,
} from "../fixtures/v7-marketing-scene";

/**
 * The marketing screenshot scene (bead pulp_wars-mxwn) is a legal-looking
 * state: it passes the state schema and holds what the shots promise.
 */
describe("marketing scene", () => {
  const state = marketingSceneStateV7();

  it("passes the state schema", () => {
    expect(parseGameStateV7(state)).not.toBeNull();
  });

  it("is the Martians' turn 19 against the Undead and the Dinosaurs", () => {
    const factionOf = new Map(
      state.players.map((player) => [player.id, player.faction]),
    );
    expect(state.round).toBe(19);
    expect(factionOf.get(state.humanPlayerId)).toBe("MARTIAN");
    expect(state.turnOrder[state.activeSeatIndex]).toBe(state.humanPlayerId);
    expect(state.setup.mapType).toBe("CONTINENTS");
    expect(state.cities.map((city) => factionOf.get(city.ownerId))).toEqual([
      "MARTIAN",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "DINOSAUR",
    ]);
    expect(state.units.length).toBe(30);
  });

  it("leaves a little fog and shows the selected Tripod's target", () => {
    const martians = state.players.find(
      (player) => player.id === state.humanPlayerId,
    );
    const hidden = state.board.tiles.length - (martians?.explored.length ?? 0);
    expect(hidden).toBeGreaterThan(0);
    // The eastern edge and its corners only.
    expect(hidden).toBeLessThan(state.board.tiles.length / 5);
    const tripod = state.units.find(
      (unit) =>
        unit.at.x === MARKETING_SCENE_V7.tripod.x &&
        unit.at.y === MARKETING_SCENE_V7.tripod.y,
    );
    expect(tripod?.role).toBe("CATAPULT");
    expect(tripod?.ownerId).toBe(state.humanPlayerId);
  });
});
