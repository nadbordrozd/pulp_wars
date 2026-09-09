export type BrowserRulesetRoute =
  | { readonly kind: "RULESET_7" }
  | { readonly kind: "RULESET_6" }
  | { readonly kind: "LEGACY_V5" }
  | { readonly kind: "UNSUPPORTED"; readonly value: string };

/** Selects the contract before any ruleset bootstrap can touch storage. */
export function selectBrowserRulesetRoute(
  search: string,
  development: boolean,
): BrowserRulesetRoute {
  const params = new URLSearchParams(search);
  const values = params.getAll("ruleset").filter((value) => value !== "");
  if (values.length > 1)
    return { kind: "UNSUPPORTED", value: values.join(",") };
  const value = values[0];
  if (value === "7") return { kind: "RULESET_7" };
  if (value === "6") return { kind: "RULESET_6" };
  if (value !== undefined) return { kind: "UNSUPPORTED", value };
  if (development && params.get("legacy-v5") === "1")
    return { kind: "LEGACY_V5" };
  return { kind: "RULESET_7" };
}
