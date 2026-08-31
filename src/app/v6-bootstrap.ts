import {
  Ruleset6BrowserController,
  type Ruleset6BrowserControllerOptions,
} from "./v6-controller";
import {
  Ruleset6DomAppView,
  type MountRuleset6AppOptions,
} from "../render/dom/app-view-v6";
import type { StorageAdapter } from "../persistence/index";

export interface BootstrappedRuleset6App {
  readonly controller: Ruleset6BrowserController;
  readonly view: Ruleset6DomAppView;
  destroy(): void;
}

export interface BootstrapRuleset6Options
  extends Ruleset6BrowserControllerOptions, MountRuleset6AppOptions {}

/** Production ruleset-6 browser boundary; legacy bootstrapApp remains intact. */
export function bootstrapRuleset6App(
  documentRoot: Document,
  options: BootstrapRuleset6Options = {},
): BootstrappedRuleset6App {
  const root = documentRoot.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const browser = documentRoot.defaultView;
  const storage =
    options.storage === undefined ? browserStorageV6(browser) : options.storage;
  const controller = new Ruleset6BrowserController({ ...options, storage });
  const view = new Ruleset6DomAppView(documentRoot, root, controller, options);
  const onVisibilityChange = (): void => {
    if (documentRoot.visibilityState === "hidden")
      controller.flushPersistence();
  };
  const onPageHide = (): void => {
    controller.flushPersistence();
  };
  documentRoot.addEventListener("visibilitychange", onVisibilityChange);
  browser?.addEventListener("pagehide", onPageHide);

  return {
    controller,
    view,
    destroy(): void {
      documentRoot.removeEventListener("visibilitychange", onVisibilityChange);
      browser?.removeEventListener("pagehide", onPageHide);
      controller.flushPersistence();
      view.destroy();
      controller.destroy();
    },
  };
}

function browserStorageV6(browser: Window | null): StorageAdapter | null {
  if (browser === null) return null;
  try {
    return browser.localStorage;
  } catch {
    return null;
  }
}
