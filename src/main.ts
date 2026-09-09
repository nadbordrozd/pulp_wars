import { selectBrowserRulesetRoute } from "./app/browser-routing";
import "./styles/main.css";

const location = new URL(globalThis.location.href);
const route = selectBrowserRulesetRoute(location.search, import.meta.env.DEV);
const app =
  route.kind === "RULESET_7"
    ? (await import("./app/v7-bootstrap")).bootstrapRuleset7App(document)
    : route.kind === "RULESET_6"
      ? (await import("./app/v6-bootstrap")).bootstrapRuleset6App(document)
      : route.kind === "LEGACY_V5"
        ? (await import("./app/bootstrap")).bootstrapApp(document)
        : renderUnsupportedRuleset(route.value);
export { app };
if (
  route.kind !== "UNSUPPORTED" &&
  (import.meta.env.DEV || location.searchParams.get("browser-smoke") === "1")
) {
  Reflect.set(globalThis, "__PULP_WARS_APP__", app);
}

function renderUnsupportedRuleset(value: string): { destroy(): void } {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const main = document.createElement("main");
  main.className = "unsupported-ruleset";
  main.dataset.unsupportedRuleset = value;
  const title = document.createElement("h1");
  title.textContent = "Unsupported ruleset";
  const detail = document.createElement("p");
  detail.textContent = `Ruleset ${value} is not available. Use ?ruleset=6 or ?ruleset=7.`;
  main.append(title, detail);
  root.replaceChildren(main);
  return { destroy: () => root.replaceChildren() };
}
