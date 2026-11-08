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
        // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit,
        // and Game no longer block a building, a Forest needs Forestry and a
        // Mountain takes only the Mine, so the building offers moved (was
        // 5d18df…04ef).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was e2898b…f2dc).
        "7f5de2a0532058b5fa85e6f0702c8a83d5ae5579c3fe1d99f67448d3615b5c0d",
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
        // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit,
        // and Game no longer block a building, a Forest needs Forestry and a
        // Mountain takes only the Mine, so the building offers moved (was
        // a763fd…f270).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was ec361d…3db5).
        "6192c9c9597b4579e337208006a7f1e665c0c4d3d811ba0d263c4e697ad29167",
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
      // 7 117 since building placement (`pulp_wars-h0xx`, 7r106: ten
      // building offers more, on Fertile Ground no longer blocked).
      // (`pulp_wars-3u8d`, 7r131: two RECOVER offers fewer; was 7 117.)
      operations: 7_115,
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
        // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit,
        // and Game no longer block a building, a Forest needs Forestry and a
        // Mountain takes only the Mine, so the building offers moved (was
        // d2cb99…564a).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was 1e5e41…0fff).
        "5d1d070ce572804d44945109068c23867d23b72f6f2a857bd0809ed7252a03e0",
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
        // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
        // moved (was ec3cf9…fb1e).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was e950d3…abd6).
        "f00f37081d25681a37a8fe922a5bc5ba17ffbdc7af5813adc9ad88ac6777a5ec",
      // Tuning 5: the Swordsman offers (was 66 233). The economy rejig
      // (`pulp_wars-w49.16`): research offers by the price per city, and a
      // mill counts every contributor of its owner (was 66 236). The
      // Industry reshuffle (`pulp_wars-w49.21`): three Guard offers fewer
      // (was 66 238).
      // The siege rules (`pulp_wars-0pgd`, 7r80): two neutral Roads under
      // enemy units are no longer candidates (was 66 235).
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
      // moved (was 65 491).
      // (`pulp_wars-3u8d`, 7r131: three RECOVER offers fewer; was 64 397.)
      operations: 64_394,
    },
    {
      id: "captured-command-425",
      view: () => captured(425),
      commandHash:
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed; the neutral
        // Roads under visible enemy units are no longer offered (was
        // d63241…7344).
        // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit,
        // and Game no longer block a building, a Forest needs Forestry and a
        // Mountain takes only the Mine, so the building offers moved (was
        // 3ea570…f928).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was 21c2d6…ba75).
        "3b49fe0b29bdcede0ae1d3a7e595695c83b57431ab70f82cdbaede3574ad7fdc",
      // Revision 16 caps a Market at 3 Coins; with the cap at 4 the
      // revision-15 value 209b3326… returns.
      // Tuning 1 (7r46), as above (was c92698…dbc5 and 94 442 operations).
      resultHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 2e06bb…623a).
        // Siege rules (`pulp_wars-0pgd`, 7r80): recomputed, without the
        // neutral Roads under enemy units (was 3b0102…0a9c).
        // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
        // moved (was 2a6b14…c475).
        // One tile, one meaning (`pulp_wars-3u8d`, 7r131): BOARD, RECOVER and
        // SWALLOW retired (later kinds' ordinals moved; RECOVER offers gone)
        // (was e1fe79…b298).
        "f136c079292822d20e57f04fdd3b7ecd527d94cd03001b4f061b11d39d1e76d2",
      // Tuning 5: the Swordsman offer (was 94 438).
      // The economy rejig (`pulp_wars-w49.16`), as above (was 94 439).
      // The siege rules (`pulp_wars-0pgd`, 7r80): one neutral Road under an
      // enemy unit is no longer a candidate (was 94 445).
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
      // moved (was 94 026).
      // (`pulp_wars-3u8d`, 7r131: one RECOVER offer fewer; was 96 631.)
      operations: 96_630,
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
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
      // moved (was 28 474).
      28_498 + publicPlanningFactScanOperations(view),
    );
    // Revision 14 (E2): Commerce no longer doubles the Market values in the
    // plan (with E2 reverted the revision-13 value 09abc6aa… returns).
    expect(canonicalHash(result.result)).toBe(
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers moved
      // (was 9032dd…014a).
      "54e05d7ea4193dbd3c94ab227922e22e785294320a34dcabace2d5e0dcf62394",
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
      // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit, and
      // Game no longer block a building, a Forest needs Forestry and a Mountain
      // takes only the Mine, so the building offers moved (was 6be101…635a).
      "ddb73eba3c24936099ed10fdcee0beaae5dae6072dc5d9f2449b14eb791b6a56",
    );
    expect(canonicalHash(drain(beforeView, beforeCommands, 17).result)).toBe(
      // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit, and
      // Game no longer block a building, a Forest needs Forestry and a Mountain
      // takes only the Mine, so the building offers moved (was 44a039…39ca).
      "5409e6b652d0321861b427b0d2c7980bfc9c85fb4b7b445165f1250981887e19",
    );

    const built = applyCommandV7(state, actor, buildPort);
    if (!built.accepted) throw new Error(built.error.code);
    const afterView = viewForV7(built.state, actor);
    const afterCommands = queryPlayerCommandsV7(afterView);
    expect(canonicalHash(afterCommands)).toBe(
      // Building placement (`pulp_wars-h0xx`, 7r106): Fertile Ground, Fruit, and
      // Game no longer block a building, a Forest needs Forestry and a Mountain
      // takes only the Mine, so the building offers moved (was 133406…10d0).
      "148039a9a2c8283e46d0a136a3eed224335b4213ecea53299225768dbdc13847",
    );
    const after = drain(afterView, afterCommands, 1);
    expect(after.operations).toBe(
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers
      // moved (was 28 463).
      28_839 + publicPlanningFactScanOperations(afterView),
    );
    expect(canonicalHash(after.result)).toBe(
      // Building placement (`pulp_wars-h0xx`, 7r106): the building offers moved
      // (was 58cc25…3e9b).
      "23afe674dd0a6d8089070530126cfb38ef5aeb8b557fb333ec4886c753faedb7",
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
