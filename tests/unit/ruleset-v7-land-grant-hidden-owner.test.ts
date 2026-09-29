import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  applyCommandV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { recomputeLiveEconomyV7 } from "../../src/engine/v7/economy";
import { checkedV7 } from "../fixtures/v7-builders";

/**
 * pulp_wars-9jp: the Undead balance matrix (UHUH, Lakes, 16 x 16, seed 1,
 * revision 14) ended in COMMAND_REJECTED:INVALID_TILE when the Normal AI chose
 * a publicly offered Land Grant. The fixture is the canonical state right
 * before that rejected command.
 */
interface Fixture {
  readonly source: {
    readonly commandIndex: number;
    readonly actor: number;
    readonly rejectedCommand: {
      readonly kind: "LAND_GRANT";
      readonly cityId: number;
    };
  };
  readonly state: unknown;
}

const fixture = JSON.parse(
  readFileSync(
    "tests/fixtures/ruleset-v7-land-grant-hidden-owner.json",
    "utf8",
  ),
) as Fixture;

function loaded(): {
  readonly state: GameStateV7;
  readonly actor: PlayerId;
  readonly command: CommandV7;
} {
  const state = parseGameStateV7(fixture.state);
  if (state === null) throw new Error("Invalid Land Grant fixture");
  return {
    state,
    actor: fixture.source.actor as PlayerId,
    command: fixture.source.rejectedCommand as CommandV7,
  };
}

/** Makes one cell canonically neutral and empty, keeping the economy valid. */
function neutralized(state: GameStateV7, at: CoordV7): GameStateV7 {
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      tile.at.x === at.x && tile.at.y === at.y
        ? { ...tile, territoryCityId: null, improvement: null }
        : tile,
    ),
  };
  const economy = recomputeLiveEconomyV7(
    state,
    { board, cities: state.cities },
    state.populationContributions.filter(
      (contribution) =>
        contribution.source.at.x !== at.x || contribution.source.at.y !== at.y,
    ),
  );
  return checkedV7({
    ...state,
    board,
    cities: economy.cities,
    populationContributions: economy.populationContributions,
  });
}

function landGrants(state: GameStateV7, actor: PlayerId): readonly CommandV7[] {
  return queryPlayerCommandsV7(viewForV7(state, actor)).filter(
    (command) => command.kind === "LAND_GRANT",
  );
}

describe("ruleset-7 Land Grant offers near hidden-city territory", () => {
  it("reproduces the matrix state: explored rival territory whose city is unexplored", () => {
    const { state, actor, command } = loaded();
    expect(state.commandIndex).toBe(fixture.source.commandIndex);
    const city = state.cities.find(
      (candidate) =>
        command.kind === "LAND_GRANT" && candidate.id === command.cityId,
    );
    expect(city).toMatchObject({ ownerId: actor, landGrantUsed: false });
    const view = viewForV7(state, actor);
    const hidden = view.board.tiles.find(
      (tile) => tile.at.x === 10 && tile.at.y === 0,
    );
    // The view hides the city ID (its center is unexplored) but shows the owner.
    expect(hidden).toMatchObject({
      explored: true,
      territoryCityId: null,
      territoryOwnerId: 4,
    });
    expect(
      state.board.tiles.find((tile) => tile.at.x === 10 && tile.at.y === 0)
        ?.territoryCityId,
    ).not.toBeNull();
    // Canonically no cell of the 5 x 5 footprint is claimable.
    expect(applyCommandV7(state, actor, command)).toMatchObject({
      accepted: false,
      error: { code: "INVALID_TILE" },
    });
  });

  it("does not offer Land Grant from territory with a public owner, and the AI choice is accepted", () => {
    const { state, actor, command } = loaded();
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).not.toContainEqual(
      command,
    );
    for (const grant of landGrants(state, actor))
      expect(applyCommandV7(state, actor, grant).accepted).toBe(true);
    const decision = chooseNormalCommandV7(viewForV7(state, actor));
    const chosen = decision.candidates[0]?.command;
    expect(chosen).toBeDefined();
    expect(chosen?.kind).not.toBe("LAND_GRANT");
    if (chosen !== undefined)
      expect(applyCommandV7(state, actor, chosen).accepted).toBe(true);
  });

  it("still offers Land Grant for an explored neutral cell and claims only neutral cells", () => {
    const { state, actor, command } = loaded();
    const neutral = neutralized(state, { x: 10, y: 1 });
    expect(landGrants(neutral, actor)).toContainEqual(command);
    const result = applyCommandV7(neutral, actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.events.find((event) => event.kind === "LAND_GRANTED"),
    ).toMatchObject({ tiles: [{ x: 10, y: 1 }] });
  });

  it("keeps the canonical rule for an unexplored neutral cell without offering it", () => {
    const { state, actor, command } = loaded();
    const fogged = neutralized(state, { x: 10, y: 3 });
    expect(
      viewForV7(fogged, actor).board.tiles.find(
        (tile) => tile.at.x === 10 && tile.at.y === 3,
      )?.explored,
    ).toBe(false);
    // Offers are fog-safe: the viewer cannot see that the cell is neutral.
    expect(landGrants(fogged, actor)).not.toContainEqual(command);
    // The reducer applies the canonical "at least one claimable cell" rule.
    const result = applyCommandV7(fogged, actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.events.find((event) => event.kind === "LAND_GRANTED"),
    ).toMatchObject({ tiles: [{ x: 10, y: 3 }] });
  });
});
