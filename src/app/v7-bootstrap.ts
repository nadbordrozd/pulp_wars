import {
  Ruleset7DomAppView,
  type MountRuleset7AppOptions,
} from "../render/dom/app-view-v7";
import type { StorageAdapter } from "../persistence/index";
import {
  cleanupObsoleteRuleset7Saves,
  type ObsoleteSaveCleanupResultV7,
} from "../persistence/index";
import {
  Ruleset7BrowserController,
  type Ruleset7BrowserControllerOptions,
} from "./v7-controller";

export type MountRuleset7PreviewOptions = MountRuleset7AppOptions;
export { Ruleset7DomAppView as Ruleset7PreviewView };

export interface BootstrapRuleset7Options
  extends Ruleset7BrowserControllerOptions, MountRuleset7AppOptions {}

export interface BootstrappedRuleset7App {
  readonly controller: Ruleset7BrowserController;
  readonly view: Ruleset7DomAppView;
  readonly obsoleteSaveCleanup: ObsoleteSaveCleanupResultV7;
  destroy(): void;
}

export function bootstrapRuleset7App(
  documentRoot: Document,
  options: BootstrapRuleset7Options = {},
): BootstrappedRuleset7App {
  const root = documentRoot.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const browser = documentRoot.defaultView;
  const storage =
    options.storage === undefined ? browserStorageV7(browser) : options.storage;
  const obsoleteSaveCleanup = cleanupObsoleteRuleset7Saves(storage);
  const controller = new Ruleset7BrowserController({
    ...options,
    storage,
    initialSaveWarning:
      obsoleteSaveCleanup.warning ?? options.initialSaveWarning ?? null,
  });
  const view = new Ruleset7DomAppView(documentRoot, root, controller, {
    ...options,
    ...(obsoleteSaveCleanup.removedCount === 0
      ? {}
      : {
          startupNotice: `${obsoleteSaveCleanup.removedCount} obsolete Ruleset 7 ${obsoleteSaveCleanup.removedCount === 1 ? "save was" : "saves were"} removed from this browser.`,
        }),
    settingsStorage:
      options.settingsStorage === undefined
        ? browserStorageV7(browser)
        : options.settingsStorage,
  });
  const flush = (): void => {
    controller.flushPersistence();
  };
  const onVisibilityChange = (): void => {
    if (documentRoot.visibilityState === "hidden") flush();
  };
  documentRoot.addEventListener("visibilitychange", onVisibilityChange);
  browser?.addEventListener("pagehide", flush);
  return {
    controller,
    view,
    obsoleteSaveCleanup,
    destroy(): void {
      documentRoot.removeEventListener("visibilitychange", onVisibilityChange);
      browser?.removeEventListener("pagehide", flush);
      flush();
      view.destroy();
      controller.destroy();
    },
  };
}

function browserStorageV7(browser: Window | null): StorageAdapter | null {
  if (browser === null) return null;
  try {
    return browser.localStorage;
  } catch {
    return null;
  }
}
