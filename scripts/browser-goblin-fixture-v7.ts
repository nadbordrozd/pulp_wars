import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the revision-17 Goblin UI fixtures (dev server
 * only, because it imports `tests/fixtures`). It replaces the running app
 * with a `Ruleset7DomAppView` over a local fixture controller and exposes
 * `globalThis.__GOBLIN_REVIEW__` ({ boardHost, traces, view, snapshotView,
 * showcase, attackChain }). Used by the Goblin review script.
 */
export type GoblinUiFixtureNameV7 =
  "goblinShowcaseFixtureV7" | "goblinAttackChainFixtureV7";

export function goblinFixtureMountExpressionV7(
  fixture: GoblinUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-goblin-ui.ts",
    fixture,
    artSet,
    global: "__GOBLIN_REVIEW__",
    extras:
      "showcase: fixtures.GOBLIN_SHOWCASE_V7, attackChain: fixtures.GOBLIN_ATTACK_CHAIN_V7",
  });
}
