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
// The captured revision-11 views predate the revision-13/14 neutral fields.
const captured = (commandIndex: 300 | 425): PlayerViewV7 => ({
  ...(
    JSON.parse(
      readFileSync(
        `tests/fixtures/ruleset-v7-public-planning-command-${commandIndex}.json`,
        "utf8",
      ),
    ) as {
      readonly view: Omit<
        PlayerViewV7,
        | "graves"
        | "plagued"
        | "bitten"
        | "shields"
        | "cooling"
        | "mindControlled"
        | "mindControlCooldowns"
      >;
    }
  ).view,
  graves: [],
  plagued: [],
  bitten: [],
  // The Martian revision's neutral side lists.
  shields: [],
  cooling: [],
  mindControlled: [],
  mindControlCooldowns: [],
});

describe("ruleset-7 exact public-planning performance", () => {
  const frozenCases = [
    {
      id: "retained-command-1100",
      view: () => retained,
      commandHash:
        "0b13410860e1df0d398369ce7fb307a2689edfa9dbf5305ab6fe1dfee8abd93b",
      resultHash:
        "f18e578cba84a5fe93980ae6c0fdc9e4a531ec4354dcc44987c170476464bca3",
      operations: 4_098,
    },
    {
      id: "captured-command-300",
      view: () => captured(300),
      commandHash:
        "68b640b47cff455890b0d253cbbdf1dfe7a23bd38e7665d5d0cd7032a1e31651",
      resultHash:
        "b32cb8941a64df8d59e6b302c253ccaaa5a1459768943025ec1a35f526181f5b",
      operations: 66_235,
    },
    {
      id: "captured-command-425",
      view: () => captured(425),
      commandHash:
        "1effba1c7759d740bb58c232774d2a9a88bf4f344ee97396ea094b6eabf3be6a",
      // Revision 16 caps a Market at 3 Coins; with the cap at 4 the
      // revision-15 value 209b3326… returns.
      resultHash:
        "c92698816b7e41a8c3313cd84763f570b359bd1804d1a1e8d452fbc5df10dbc5",
      operations: 94_442,
    },
  ] as const;

  for (const fixture of frozenCases) {
    it(`${fixture.id} preserves pre-optimization output across cold slice budgets`, () => {
      const firstView = structuredClone(fixture.view());
      const firstCommands = queryPlayerCommandsV7(firstView);
      expect(canonicalHash(firstCommands)).toBe(fixture.commandHash);
      const first = drain(firstView, firstCommands, 1);
      expect(first.operations).toBe(
        fixture.operations + publicPlanningFactScanOperations(firstView),
      );
      expect(canonicalHash(first.result)).toBe(fixture.resultHash);
      expect(queryPublicEconomicPotentialsV7(firstView)).toBe(
        first.result.potentials,
      );

      const secondView = structuredClone(fixture.view());
      const secondCommands = queryPlayerCommandsV7(secondView);
      const second = drain(secondView, secondCommands, 113);
      expect(second.operations).toBe(
        publicPlanningFactScanOperations(secondView) + secondCommands.length,
      );
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
      "4b94d92b0296ea857cc0f5046008b531aa21e7aa0f8d7eb3830c381bee021725",
    );
    const result = drain(view, commands, 7);
    expect(result.operations).toBe(
      28_474 + publicPlanningFactScanOperations(view),
    );
    // Revision 14 (E2): Commerce no longer doubles the Market values in the
    // plan (with E2 reverted the revision-13 value 09abc6aa… returns).
    expect(canonicalHash(result.result)).toBe(
      "9032dd0c4bedee8ff282496835db5a85946717d0344b81e894336793b444014a",
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
      "6be10102571a924f4c879e23627695334f6aa275f42e471e30d5e19ca465635a",
    );
    expect(canonicalHash(drain(beforeView, beforeCommands, 17).result)).toBe(
      "44a039254f15c4c849ed4f682d8d9f7c6b7269ccba31b4868fbb97ad053939ca",
    );

    const built = applyCommandV7(state, actor, buildPort);
    if (!built.accepted) throw new Error(built.error.code);
    const afterView = viewForV7(built.state, actor);
    const afterCommands = queryPlayerCommandsV7(afterView);
    expect(canonicalHash(afterCommands)).toBe(
      "1334069fd90c1c2a3d8fc86d7a943bff079c9fe46faf7b031090354ba11d10d0",
    );
    const after = drain(afterView, afterCommands, 1);
    expect(after.operations).toBe(
      28_463 + publicPlanningFactScanOperations(afterView),
    );
    expect(canonicalHash(after.result)).toBe(
      "58cc250e5c97fd8506decc2f91427da30055c31b55d418049d3b30518fc33e9b",
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

function publicPlanningFactScanOperations(view: PlayerViewV7): number {
  return view.board.tiles.length + view.cities.length + view.units.length + 1;
}
