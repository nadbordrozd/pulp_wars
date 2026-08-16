import { AppController, type AppControllerOptions } from "./controller";
import { DomAppView, type MountAppOptions } from "../render/dom/app-view";
import type { StorageAdapter } from "../persistence/index";

export interface BootstrappedApp {
  readonly controller: AppController;
  readonly view: DomAppView;
  destroy(): void;
}

export interface BootstrapOptions
  extends AppControllerOptions, MountAppOptions {}

export function bootstrapApp(
  documentRoot: Document,
  options: BootstrapOptions = {},
): BootstrappedApp {
  const root = documentRoot.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const browser = documentRoot.defaultView;
  const reducedMotion =
    options.prefersReducedMotion ??
    documentRoot.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches ??
    false;
  const storage =
    options.storage === undefined ? browserStorage(browser) : options.storage;
  const controller = new AppController({
    ...options,
    prefersReducedMotion: reducedMotion,
    storage,
  });
  const view = new DomAppView(documentRoot, root, controller, options);
  const onPopState = (): void => controller.requestBack();
  const onVisibilityChange = (): void => {
    if (documentRoot.visibilityState === "hidden") {
      controller.flushPersistence();
    }
  };
  browser?.addEventListener("popstate", onPopState);
  documentRoot.addEventListener("visibilitychange", onVisibilityChange);

  if (
    browser !== null &&
    browser !== undefined &&
    !supportedPath(browser.location.pathname)
  ) {
    controller.recoverUnsupportedRoute();
    root.dataset.routeRecovery = "unsupported-url";
  }

  return {
    controller,
    view,
    destroy(): void {
      browser?.removeEventListener("popstate", onPopState);
      documentRoot.removeEventListener("visibilitychange", onVisibilityChange);
      view.destroy();
      controller.destroy();
    },
  };
}

function browserStorage(browser: Window | null): StorageAdapter | null {
  if (browser === null) return null;
  try {
    return browser.localStorage;
  } catch {
    return null;
  }
}

function supportedPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/index.html";
}
