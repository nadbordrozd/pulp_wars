import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the Candy UI fixtures (bead pulp_wars-jdb.6; dev
 * server only, because it imports `tests/fixtures`). It replaces the
 * running app with a `Ruleset7DomAppView` over a local fixture controller
 * and exposes `globalThis.__CANDY_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, at, victim }). Used by the Candy review script.
 */
export type CandyUiFixtureNameV7 = "candyUiFixtureV7" | "candyVictimFixtureV7";

export function candyFixtureMountExpressionV7(
  fixture: CandyUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-candy-ui.ts",
    fixture,
    artSet,
    global: "__CANDY_REVIEW__",
    extras: "at: fixtures.CANDY_UI_V7, victim: fixtures.CANDY_VICTIM_V7",
  });
}
