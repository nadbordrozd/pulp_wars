export type BrowserRulesetRoute =
  | { readonly kind: "RULESET_7" }
  | { readonly kind: "UNSUPPORTED"; readonly value: string };

/**
 * The `ruleset` values of the retired prototypes (bead pulp_wars-lky5). A
 * link or bookmark that still carries one, or the old `legacy-v5` switch,
 * opens the game as if the parameter were not there.
 */
const RETIRED_RULESET_VALUES: ReadonlySet<string> = new Set(["6"]);

/** Selects the contract before any ruleset bootstrap can touch storage. */
export function selectBrowserRulesetRoute(search: string): BrowserRulesetRoute {
  const params = new URLSearchParams(search);
  const values = params
    .getAll("ruleset")
    .filter((value) => value !== "" && !RETIRED_RULESET_VALUES.has(value));
  if (values.length > 1)
    return { kind: "UNSUPPORTED", value: values.join(",") };
  const value = values[0];
  if (value !== undefined && value !== "7")
    return { kind: "UNSUPPORTED", value };
  return { kind: "RULESET_7" };
}
