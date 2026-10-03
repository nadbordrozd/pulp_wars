import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Browser expression for the Dwarf UI fixtures (bead pulp_wars-78i.6; dev
 * server only, because it imports `tests/fixtures`). It replaces the
 * running app with a `Ruleset7DomAppView` over a local fixture controller
 * and exposes `globalThis.__DWARF_REVIEW__` ({ boardHost, traces, view,
 * snapshotView, at, victim, fleet }). Used by the Dwarf review script.
 */
export type DwarfUiFixtureNameV7 =
  | "dwarfUiFixtureV7"
  | "dwarfVictimFixtureV7"
  | "dwarfEruptionAfterFixtureV7"
  | "dwarfFleetFixtureV7"
  | "dwarfDigInFixtureV7";

export function dwarfFixtureMountExpressionV7(
  fixture: DwarfUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-dwarf-ui.ts",
    fixture,
    artSet,
    global: "__DWARF_REVIEW__",
    extras:
      "at: fixtures.DWARF_UI_V7, victim: fixtures.DWARF_VICTIM_V7, fleet: fixtures.DWARF_FLEET_V7, digIn: fixtures.DWARF_DIG_IN_V7",
  });
}
