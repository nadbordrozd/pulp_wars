import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { upgradeRetainedPublicViewV7 } from "../../scripts/ruleset-v7-late-public-view-contract";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  canonicalHash,
  createPublicPlanningWorkV7,
  queryPlayerCommandsV7,
  queryPublicEconomicPotentialsV7,
  viewForV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../../src/engine/index";
import { coastalV7, withPortV7 } from "../fixtures/v7-naval-builders";

const retained = upgradeRetainedPublicViewV7(
  JSON.parse(
    readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
  ) as PlayerViewV7,
);
const captured = (commandIndex: 300 | 425) =>
  (
    JSON.parse(
      readFileSync(
        `tests/fixtures/ruleset-v7-public-planning-command-${commandIndex}.json`,
        "utf8",
      ),
    ) as { readonly view: PlayerViewV7 }
  ).view;

describe("ruleset-7 exact public-planning performance", () => {
  const frozenCases = [
    {
      id: "retained-command-1100",
      view: () => retained,
      commandHash:
        "335e1d932643d374f14fd14ca833beff38963367a5f740a61f4713bd4db78a5e",
      resultHash:
        "7b6cacc305a8204edcf6c7a890873dd770b74e1d69815324dd7dd8467841530f",
      operations: 4_100,
    },
    {
      id: "captured-command-300",
      view: () => captured(300),
      commandHash:
        "53c225c8e425f892ab32e45dabb67577f62ff5b61bd6349d67f581bdb72fb20f",
      resultHash:
        "b78f740fb03edfc245efedbe4c2e5b9d1e3ee7dada87368bfebe6773dbb61d70",
      operations: 66_220,
    },
    {
      id: "captured-command-425",
      view: () => captured(425),
      commandHash:
        "93d731039193eee98b0438066993c0cd2aa4dd16094b65849815441aaf2793e2",
      resultHash:
        "d10ebd7e702901fd301f360a3aaa2edc23b198fc10ffa6e9abce5bbbd87322bb",
      operations: 94_418,
    },
  ] as const;

  for (const fixture of frozenCases) {
    it(`${fixture.id} preserves pre-optimization output across cold slice budgets`, () => {
      const firstView = structuredClone(fixture.view());
      const firstCommands = queryPlayerCommandsV7(firstView);
      expect(canonicalHash(firstCommands)).toBe(fixture.commandHash);
      const first = drain(firstView, firstCommands, 1);
      expect(first.operations).toBe(fixture.operations);
      expect(canonicalHash(first.result)).toBe(fixture.resultHash);
      expect(queryPublicEconomicPotentialsV7(firstView)).toBe(
        first.result.potentials,
      );

      const secondView = structuredClone(fixture.view());
      const secondCommands = queryPlayerCommandsV7(secondView);
      const second = drain(secondView, secondCommands, 113);
      expect(second.operations).toBe(fixture.operations);
      expect(canonicalHash(second.result)).toBe(fixture.resultHash);
      expect(second.result).toEqual(first.result);
    });
  }

  it("preserves frozen Road, Shipyard and redevelopment planning on a fresh naval view", () => {
    const source = withPortV7(9_100);
    const actor = source.state.humanPlayerId;
    const state = {
      ...source.state,
      players: source.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              coins: 100,
              researchedTechs: TECHNOLOGY_IDS_V7,
              explored: source.state.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
    };
    const view = viewForV7(state, actor);
    const commands = queryPlayerCommandsV7(view);
    expect(commands.some((command) => command.kind === "BUILD_ROAD")).toBe(
      true,
    );
    expect(commands.some((command) => command.kind === "BUILD_SHIPYARD")).toBe(
      true,
    );
    expect(commands.some((command) => command.kind === "REDEVELOP")).toBe(true);
    expect(canonicalHash(commands)).toBe(
      "22b168f691bbe028fcb8b0745b7f7c85e16d1bc96a9afed132e0609b8f11442d",
    );
    const result = drain(view, commands, 7);
    expect(result.operations).toBe(28_481);
    expect(canonicalHash(result.result)).toBe(
      "4871a834eafe750832f35ba4913a140f73f77912d14be8d43e572fdf9d442040",
    );
  });

  it("keeps cold planning exact after a Port changes naval connectivity", () => {
    const source = coastalV7(9_104);
    const actor = source.state.humanPlayerId;
    const state = {
      ...source.state,
      players: source.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              coins: 100,
              researchedTechs: TECHNOLOGY_IDS_V7,
              explored: source.state.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
    };
    const beforeView = viewForV7(state, actor);
    const beforeCommands = queryPlayerCommandsV7(beforeView);
    const buildPort = beforeCommands.find(
      (command) => command.kind === "BUILD_PORT",
    );
    if (buildPort?.kind !== "BUILD_PORT")
      throw new Error("Port command missing");
    expect(canonicalHash(beforeCommands)).toBe(
      "ff9972e8f77b5471030c12017e6802c65328bc1abc83e017d18156dfd51651fa",
    );
    expect(canonicalHash(drain(beforeView, beforeCommands, 17).result)).toBe(
      "298181ca4cd8bbf931917c93f516812c89d25be22237bf2c6f334172ddda334b",
    );

    const built = applyCommandV7(state, actor, buildPort);
    if (!built.accepted) throw new Error(built.error.code);
    const afterView = viewForV7(built.state, actor);
    const afterCommands = queryPlayerCommandsV7(afterView);
    expect(canonicalHash(afterCommands)).toBe(
      "9d589b3c890a51104785862038c712492890a53456da5cdb47b8d2a7a6019ae5",
    );
    const after = drain(afterView, afterCommands, 1);
    expect(after.operations).toBe(28_470);
    expect(canonicalHash(after.result)).toBe(
      "a14d0c353cee300fe3617257d35d416f60541ac2b15816ac79daaec233cd4aa3",
    );
  });
});

function drain(
  view: PlayerViewV7,
  commands: ReturnType<typeof queryPlayerCommandsV7>,
  budget: number,
): {
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7;
} {
  const work = createPublicPlanningWorkV7(view, commands);
  let operations = 0;
  for (;;) {
    const progress = work.advance(budget);
    operations += progress.operations;
    if (progress.result !== null)
      return { operations, result: progress.result };
  }
}
