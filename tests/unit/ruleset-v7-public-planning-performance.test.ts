import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { upgradeRetainedPublicViewV7 } from "../../scripts/ruleset-v7-late-public-view-contract";
import {
  applyCommandV7,
  canonicalHash,
  createPublicPlanningWorkV7,
  queryPlayerCommandsV7,
  queryPublicEconomicPotentialsV7,
  viewForV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../../src/engine/index";
import { PRE_NAVAL_BRANCH_TECHS_V7 } from "../fixtures/v7-builders";
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
  // The frozen sea: no ice.
  ice: [],
  // The giants' signatures (`pulp_wars-w49.30`): no held victim.
  giants: { swallowed: [] },
  // Map curiosities round 2 (`pulp_wars-737.14`) read the view's
  // curiosities for a gate on a Move's path: none here.
  curiosities: [],
});

describe("ruleset-7 exact public-planning performance", () => {
  const frozenCases = [
    {
      id: "retained-command-1100",
      view: () => retained,
      commandHash:
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
        // technology owned, so the retained view's 12 Coins buy a technology
        // again and six RESEARCH commands are offered (was 83c9a2…466e).
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 9fd994…1b96).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 4b8b7c…d029).
        // Technology base cost 5 / 6 / 7 (`pulp_wars-w49.40`, 7r81): a
        // tier 2 costs 12 with the view's four cities, so its 12 Coins
        // buy one and six RESEARCH commands are offered again (was
        // 4eb8ff…e1fc).
        "5d18df44f6c0367b6ed3c153e14baaef93f2eb2fc9fb97298d5cc42a280d04ef",
      resultHash:
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
        // technology owned, so the retained view's 12 Coins buy a technology
        // again and six RESEARCH commands are offered (was fadb84…4dc8).
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 2df0a7…6a92).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 6a3551…3ef5).
        // Technology base cost 5 / 6 / 7 (`pulp_wars-w49.40`, 7r81): a
        // tier 2 costs 12 with the view's four cities, so its 12 Coins
        // buy one and six RESEARCH commands are offered again (was
        // 41c906…446d).
        "a763fd68eb9222bfe9fde304cb97e91d6696d9b38af00fff43cd0496efdbf270",
      // 4 097 since tuning 4 (one RESEARCH fewer in the retained view);
      // 4 099 since tuning 5 (`pulp_wars-w49.4`: two cities offer the
      // Swordsman); 4 105 since tuning 6 (six RESEARCH commands again);
      // 4 100 since the economy rejig (`pulp_wars-w49.16`: research is
      // priced by the cities owned, and with its four cities the view's
      // 12 Coins buy one technology, Scouting at 8).
      // 4 098 since the Industry reshuffle (`pulp_wars-w49.21`, 7r56: the
      // Guard is at Fortification, which the view does not own, so two
      // cities no longer offer it).
      // 4 103 since the technology base cost 5 / 6 / 7 (`pulp_wars-w49.40`,
      // 7r81: a tier 2 costs 12 with the view's four cities, so six
      // RESEARCH commands are offered again).
      operations: 4_103,
    },
    {
      id: "captured-command-300",
      view: () => captured(300),
      commandHash:
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 550239…aa61).
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed; the neutral
        // Roads under visible enemy units are no longer offered (was
        // 2aa894…9307).
        "d2cb99d35b5c98f62b43646d67f03cf3cf2136b0439162a91672cbf18554564a",
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): one contributor counts for one
      // Windmill, Sawmill, Forge, and Market and a Monument gives 2, so the
      // planned values differ (was b32cb8…1f5b and 66 235 operations).
      resultHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 031d3b…d3bb).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 2d5421…3b8e).
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed, without the
        // neutral Roads under enemy units (was d5416e…9615).
        "ec3cf94435ecf46fc9885ac25db421132a073d96dced1ed5d983ae69be53fb1e",
      // Tuning 5: the Swordsman offers (was 66 233). The economy rejig
      // (`pulp_wars-w49.16`): research offers by the price per city, and a
      // mill counts every contributor of its owner (was 66 236). The
      // Industry reshuffle (`pulp_wars-w49.21`): three Guard offers fewer
      // (was 66 238).
      // The siege rules (`pulp_wars-0pgd`, 7r80): two neutral Roads under
      // enemy units are no longer candidates (was 66 235).
      operations: 65_491,
    },
    {
      id: "captured-command-425",
      view: () => captured(425),
      commandHash:
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed; the neutral
        // Roads under visible enemy units are no longer offered (was
        // d63241…7344).
        "3ea5704c71cd4c5a5278d4fc2871c4f2753c118c9901807a50f3caf9dcd9f928",
      // Revision 16 caps a Market at 3 Coins; with the cap at 4 the
      // revision-15 value 209b3326… returns.
      // Tuning 1 (7r46), as above (was c92698…dbc5 and 94 442 operations).
      resultHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 2e06bb…623a).
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed, without the
        // neutral Roads under enemy units (was 3b0102…0a9c).
        "2a6b148e6b3e57ff5622118452b2d2b65483d3b5e4e86ebe4aff6588c9ebc475",
      // Tuning 5: the Swordsman offer (was 94 438).
      // The economy rejig (`pulp_wars-w49.16`), as above (was 94 439).
      // The siege rules (`pulp_wars-0pgd`, 7r80): one neutral Road under an
      // enemy unit is no longer a candidate (was 94 445).
      operations: 94_026,
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
              // Every technology from before the naval branch, so the
              // frozen command surface has no Submarine offer.
              researchedTechs: PRE_NAVAL_BRANCH_TECHS_V7,
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
              // Before the naval branch: with Harbours the new Port would
              // level the city, leaving only the reward choice to plan.
              researchedTechs: PRE_NAVAL_BRANCH_TECHS_V7,
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
