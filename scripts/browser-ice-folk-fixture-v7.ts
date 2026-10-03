import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the Ice Folk UI fixtures (bead pulp_wars-7g3.6;
 * dev server only, because it imports `tests/fixtures`). It replaces the
 * running app with a `Ruleset7DomAppView` over a local fixture controller
 * and exposes `globalThis.__ICE_FOLK_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, at, victim }). Used by the Ice Folk review script.
 */
export type IceFolkUiFixtureNameV7 =
  "iceFolkUiFixtureV7" | "iceFolkVictimFixtureV7";

export function iceFolkFixtureMountExpressionV7(
  fixture: IceFolkUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-ice-folk-ui.ts",
    fixture,
    artSet,
    global: "__ICE_FOLK_REVIEW__",
    extras: "at: fixtures.ICE_FOLK_UI_V7, victim: fixtures.ICE_FOLK_VICTIM_V7",
  });
}
