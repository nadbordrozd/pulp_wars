import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the Martian UI fixtures (bead pulp_wars-t6s.4; dev
 * server only, because it imports `tests/fixtures`). It replaces the
 * running app with a `Ruleset7DomAppView` over a local fixture controller
 * and exposes `globalThis.__MARTIAN_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, at, duel }). Used by the Martian review script.
 */
export type MartianUiFixtureNameV7 =
  "martianUiFixtureV7" | "martianDuelFixtureV7";

export function martianFixtureMountExpressionV7(
  fixture: MartianUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture,
    artSet,
    global: "__MARTIAN_REVIEW__",
    extras: "at: fixtures.MARTIAN_UI_V7, duel: fixtures.MARTIAN_DUEL_V7",
  });
}
