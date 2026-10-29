import { localHostV7, type AnalyticsEnvironmentV7 } from "../app/analytics-v7";
import { createFirestoreOnlineTransportV7 } from "./firestore-transport";
import { browserLocalOnlineTransportV7 } from "./local-transport";
import type { OnlineTransportV7 } from "./types";

/**
 * Which transport the page uses (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md
 * section 6): Firestore only on the deployed site, as the leaderboard
 * (`leaderboardModeV7`); the development server, a local preview, the
 * tests and any browser driven by automation get the two-tab local
 * transport, so nothing they do reaches the real project. `?online=local`
 * forces the local transport on the deployed site too.
 */
export type OnlineTransportModeV7 = "FIRESTORE" | "LOCAL";
export const ONLINE_TRANSPORT_PARAMETER_V7 = "online";

export function onlineTransportModeV7(
  env: AnalyticsEnvironmentV7,
): OnlineTransportModeV7 {
  let forced: string | null;
  let smoke: boolean;
  try {
    const search = new URLSearchParams(env.search);
    forced = search.get(ONLINE_TRANSPORT_PARAMETER_V7);
    smoke = search.get("browser-smoke") === "1";
  } catch {
    return "LOCAL";
  }
  return env.production &&
    !env.webdriver &&
    !smoke &&
    forced !== "local" &&
    !localHostV7(env.hostname)
    ? "FIRESTORE"
    : "LOCAL";
}

/** The page's transport, or null outside a browser. */
export function browserOnlineTransportV7(
  production: boolean,
  window: Window | undefined = globalThis.window,
): OnlineTransportV7 | null {
  if (window === undefined) return null;
  const mode = onlineTransportModeV7({
    production,
    hostname: window.location.hostname,
    search: window.location.search,
    webdriver: window.navigator.webdriver === true,
  });
  if (mode === "LOCAL") return browserLocalOnlineTransportV7(window);
  let storage: Storage | null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return createFirestoreOnlineTransportV7({
    fetch: (input, init) => window.fetch(input, init),
    storage,
    visible: () => window.document.visibilityState !== "hidden",
  });
}
