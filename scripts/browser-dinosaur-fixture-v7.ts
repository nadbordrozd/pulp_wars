import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the revision-19 Dinosaur UI fixtures (dev server
 * only, because it imports `tests/fixtures`). It replaces the running app
 * with a `Ruleset7DomAppView` over a local fixture controller and exposes
 * `globalThis.__DINOSAUR_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, showcase, blast, enemy, city }). Used by the Dinosaur review
 * script.
 */
export type DinosaurUiFixtureNameV7 =
  | "dinosaurShowcaseFixtureV7"
  | "dinosaurBlastFixtureV7"
  | "dinosaurEnemyFixtureV7"
  | "dinosaurCityFixtureV7"
  | "dinosaurCityTightFixtureV7";

export function dinosaurFixtureMountExpressionV7(
  fixture: DinosaurUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-dinosaur-ui.ts",
    fixture,
    artSet,
    global: "__DINOSAUR_REVIEW__",
    extras:
      "showcase: fixtures.DINOSAUR_SHOWCASE_V7, blast: fixtures.DINOSAUR_BLAST_V7, enemy: fixtures.DINOSAUR_ENEMY_V7, city: fixtures.DINOSAUR_CITY_V7",
  });
}
