import { startAssetCacheV1 } from "./app/asset-cache-registration";
import { selectBrowserRulesetRoute } from "./app/browser-routing";
import { ASSET_CACHE_WORKER_ENABLED_V1 } from "./service-worker/asset-manifest";
// The interface faces (docs/ui/STYLE.md): bundled, self-hosted, Latin only.
import "@fontsource/bowlby-one/latin-400.css";
import "@fontsource/public-sans/latin-500.css";
import "@fontsource/public-sans/latin-600.css";
import "@fontsource/public-sans/latin-700.css";
import "@fontsource/public-sans/latin-800.css";
import "./styles/main.css";
import "./styles/v7.css";

// A deployed build keeps its files in a service worker's cache, so a return
// visit does not ask the host for each of them again (pulp_wars-2yc.11).
// With the switch off, or `?no-cache-worker=1`, it removes the worker.
const assetCache = startAssetCacheV1({
  deployed: import.meta.env.PROD,
  workerEnabled: ASSET_CACHE_WORKER_ENABLED_V1,
  base: import.meta.env.BASE_URL,
  browser: {
    get serviceWorker() {
      return navigator.serviceWorker as ServiceWorkerContainer | undefined;
    },
    get caches() {
      return globalThis.caches as CacheStorage | undefined;
    },
    performance,
    href: globalThis.location.href,
  },
});

const location = new URL(globalThis.location.href);
const route = selectBrowserRulesetRoute(location.search, import.meta.env.DEV);
const app =
  route.kind === "RULESET_7"
    ? // The look's art is preloaded behind the loading screen first.
      await (
        await import("./app/v7-preload-boot")
      ).bootstrapPreloadedRuleset7App(document)
    : route.kind === "RULESET_6"
      ? (await import("./app/v6-bootstrap")).bootstrapRuleset6App(document)
      : route.kind === "LEGACY_V5"
        ? (await import("./app/bootstrap")).bootstrapApp(document)
        : renderUnsupportedRuleset(route.value);
export { app };
void assetCache.pageLoaded();
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
