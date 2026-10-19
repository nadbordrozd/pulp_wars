import { campaignMissionV7 } from "../campaign/progress-v7";
import { matchDifficultyV7 } from "../engine/v7/difficulty";
import { gameKindOfV7 } from "../engine/v7/game-kind";
import {
  gameModeOfV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";
import type { StorageAdapter } from "../persistence/index";
import type { Ruleset7BrowserSnapshot } from "./v7-controller";

/**
 * Google Analytics (bead pulp_wars-2yc.101, docs/ANALYTICS.md): counts
 * plays and the factions people play, on the deployed site only.
 *
 * - Only a production build served from the real site loads it: never the
 *   development server, the tests, a local `vite preview` (the review and
 *   smoke scripts), a browser driven by automation (`navigator.webdriver`)
 *   or a page with `?browser-smoke=1` ({@link analyticsModeV7}).
 * - Consent Mode v2 defaults every storage to denied before the tag is
 *   configured, and Google's script (gtag.js) is loaded only once the player
 *   has accepted. Until then, and after a Decline, nothing is sent and no
 *   cookie is set. Declining later wipes the `_ga` cookies.
 * - Ad features are off (Google signals, ad personalisation); no user id,
 *   no names, no save data, no free text: only the event parameters below.
 * - Every call is guarded, so a blocked script (an ad blocker), no storage
 *   or no network never reaches the game.
 *
 * `?analytics-preview=1` shows the consent banner and the Settings toggle
 * anywhere (the development server, a local preview build) without loading
 * Google's script, so their look can be checked without sending a hit.
 */

export const GA_MEASUREMENT_ID_V7 = "G-3BEWEP1Y27";
export const GA_SCRIPT_URL_V7 = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID_V7}`;
export const ANALYTICS_CONSENT_STORAGE_KEY_V7 = "pulpWars.analytics.consent.v1";
export const ANALYTICS_PREVIEW_PARAMETER_V7 = "analytics-preview";

/** The banner's line (and the reason in Settings). */
export const ANALYTICS_CONSENT_TEXT_V7 =
  "Pulp Wars uses Google Analytics to count plays and see which factions people play. No ads.";

export type AnalyticsConsentV7 = "GRANTED" | "DENIED" | "UNSET";

/** Where a match was started from. */
export type MatchSourceV7 =
  "quick_start" | "advanced" | "campaign" | "tutorial" | "restart";

/**
 * LIVE: the deployed site, Google's script loads once accepted. PREVIEW:
 * the banner and toggle work but no script is loaded. OFF: nothing.
 */
export type AnalyticsModeV7 = "LIVE" | "PREVIEW" | "OFF";

export interface AnalyticsEnvironmentV7 {
  /** `import.meta.env.PROD`. */
  readonly production: boolean;
  readonly hostname: string;
  /** `location.search`. */
  readonly search: string;
  /** `navigator.webdriver`: a browser driven by automation. */
  readonly webdriver: boolean;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", ""]);

/** A local or LAN host: the development server, a preview, a review script. */
export function localHostV7(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    LOCAL_HOSTS.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".test") ||
    host.endsWith(".local") ||
    /^(?:10|127)\.\d+\.\d+\.\d+$/.test(host) ||
    /^192\.168\.\d+\.\d+$/.test(host)
  );
}

export function analyticsModeV7(env: AnalyticsEnvironmentV7): AnalyticsModeV7 {
  let parameters: URLSearchParams;
  try {
    parameters = new URLSearchParams(env.search);
  } catch {
    return "OFF";
  }
  if (parameters.get(ANALYTICS_PREVIEW_PARAMETER_V7) === "1") return "PREVIEW";
  if (
    !env.production ||
    env.webdriver ||
    parameters.get("browser-smoke") === "1" ||
    localHostV7(env.hostname)
  )
    return "OFF";
  return "LIVE";
}

/** Event parameters: short words and numbers only. */
export type AnalyticsParamsV7 = Readonly<Record<string, string | number>>;

export interface GameAnalyticsV7 {
  /** False where analytics is off: no banner, no Settings toggle. */
  readonly available: boolean;
  consent(): AnalyticsConsentV7;
  /** Accept (true) or Decline (false); remembered in this browser. */
  setConsent(granted: boolean): void;
  /** Watches the controller for the end of a match; returns the detach. */
  attach(controller: {
    subscribe(subscriber: (snapshot: Ruleset7BrowserSnapshot) => void): unknown;
  }): () => void;
  /**
   * A match was launched from `source`. `before` is the snapshot just
   * before the launch: an unfinished match it held was abandoned.
   */
  matchStarted(
    setup: MatchSetupV7,
    source: MatchSourceV7,
    before: Ruleset7BrowserSnapshot | null,
  ): void;
  /** The tutorial's last step was done. */
  tutorialCompleted(): void;
}

/** Analytics that is off: the tests', the development server's. */
export const NO_ANALYTICS_V7: GameAnalyticsV7 = Object.freeze({
  available: false,
  consent: () => "UNSET" as const,
  setConsent: () => undefined,
  attach: () => () => undefined,
  matchStarted: () => undefined,
  tutorialCompleted: () => undefined,
});

/** The page the tracker writes to; a test passes its own. */
export interface AnalyticsBrowserV7 {
  /** The global object: `dataLayer` and `gtag` are set on it. */
  readonly global: Record<string, unknown>;
  readonly document?: Pick<Document, "createElement" | "head"> & {
    cookie?: string;
  };
  readonly storage: StorageAdapter | null;
  readonly hostname: string;
}

/** The match's faction names as sent ("ORIGINAL" is the Humans). */
export function analyticsFactionV7(faction: FactionIdV7 | undefined): string {
  if (faction === undefined) return "unknown";
  return faction === "ORIGINAL" ? "human" : faction.toLowerCase();
}

function humanFactionV7(view: PlayerViewV7): FactionIdV7 | undefined {
  return (
    view.players.find((player) => player.id === view.humanPlayerId)?.faction ??
    view.setup.factions[0]
  );
}

/** The campaign and mission of a campaign mission's setup, or null. */
function campaignMissionIdV7(
  setup: MatchSetupV7,
): { readonly campaignId: string; readonly missionId: string } | null {
  const id = setup.mission?.id;
  if (id === undefined || setup.mapType !== "MISSION") return null;
  const found = campaignMissionV7(id);
  return found === null
    ? null
    : { campaignId: found.campaign.id, missionId: id };
}

/**
 * Regular and custom games (`pulp_wars-2yc.103`): `regular` or `custom` for
 * a skirmish, `mission` for a campaign mission or the tutorial.
 */
export function analyticsGameKindV7(setup: MatchSetupV7): string {
  if (setup.mapType === "MISSION") return "mission";
  return gameKindOfV7(setup).toLowerCase();
}

/** `match_start`'s parameters. */
export function matchStartParamsV7(
  setup: MatchSetupV7,
  source: MatchSourceV7,
): AnalyticsParamsV7 {
  return {
    faction: analyticsFactionV7(setup.factions[0]),
    map_type: setup.mapType.toLowerCase(),
    map_size: setup.width,
    opponents: setup.aiCount,
    difficulty: matchDifficultyV7(setup).toLowerCase(),
    mode: gameModeOfV7(setup).toLowerCase(),
    source,
    game_kind: analyticsGameKindV7(setup),
  };
}

export type MatchResultV7 = "win" | "loss" | "abandoned";

/** How the match in `view` ended for the human. */
export function matchResultV7(view: PlayerViewV7): MatchResultV7 {
  const outcome = view.outcome;
  if (outcome === null) return "abandoned";
  return outcome.kind === "VICTORY" && outcome.winnerId === view.humanPlayerId
    ? "win"
    : "loss";
}

/**
 * The stars of a finished match: the mission's, or the skirmish grade (0
 * for a custom game, which earns none).
 */
export function matchStarsV7(view: PlayerViewV7): number {
  if (matchResultV7(view) !== "win") return 0;
  if (view.mission !== undefined) return view.mission.stars ?? 0;
  if (gameKindOfV7(view.setup) !== "REGULAR") return 0;
  return view.score.summary?.grade.stars ?? 0;
}

/** `match_end`'s parameters. */
export function matchEndParamsV7(view: PlayerViewV7): AnalyticsParamsV7 {
  return {
    result: matchResultV7(view),
    rounds: view.round,
    stars: matchStarsV7(view),
    faction: analyticsFactionV7(humanFactionV7(view)),
    difficulty: matchDifficultyV7(view.setup).toLowerCase(),
    mode: gameModeOfV7(view.setup).toLowerCase(),
    game_kind: analyticsGameKindV7(view.setup),
  };
}

export interface AnalyticsEventV7 {
  readonly name: string;
  readonly params: AnalyticsParamsV7;
}

/** The events a launch sends, in order. */
export function matchStartEventsV7(
  setup: MatchSetupV7,
  source: MatchSourceV7,
): AnalyticsEventV7[] {
  const events: AnalyticsEventV7[] = [
    { name: "match_start", params: matchStartParamsV7(setup, source) },
  ];
  const mission = campaignMissionIdV7(setup);
  if (mission !== null)
    events.push({
      name: "mission_start",
      params: {
        mission_id: mission.missionId.toLowerCase(),
        campaign_id: mission.campaignId.toLowerCase(),
        faction: analyticsFactionV7(setup.factions[0]),
      },
    });
  return events;
}

/** The events the end (or abandonment) of the match in `view` sends. */
export function matchEndEventsV7(view: PlayerViewV7): AnalyticsEventV7[] {
  const params = matchEndParamsV7(view);
  const events: AnalyticsEventV7[] = [{ name: "match_end", params }];
  const mission = campaignMissionIdV7(view.setup);
  if (mission !== null)
    events.push({
      name: "mission_end",
      params: {
        mission_id: mission.missionId.toLowerCase(),
        campaign_id: mission.campaignId.toLowerCase(),
        result: params.result as MatchResultV7,
        stars: params.stars as number,
      },
    });
  return events;
}

function unfinishedV7(snapshot: Ruleset7BrowserSnapshot | null): boolean {
  return (
    snapshot !== null &&
    snapshot.view !== null &&
    snapshot.view.outcome === null &&
    (snapshot.phase === "ACTIVE" || snapshot.phase === "RESUMABLE")
  );
}

type GtagV7 = (...args: unknown[]) => void;

/**
 * The tracker. `mode` OFF gives {@link NO_ANALYTICS_V7}; PREVIEW installs
 * the queue but never loads Google's script.
 */
export function createGameAnalyticsV7(
  mode: AnalyticsModeV7,
  browser: AnalyticsBrowserV7,
): GameAnalyticsV7 {
  if (mode === "OFF") return NO_ANALYTICS_V7;
  const readConsent = (): AnalyticsConsentV7 => {
    try {
      const stored = browser.storage?.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7);
      return stored === "granted"
        ? "GRANTED"
        : stored === "denied"
          ? "DENIED"
          : "UNSET";
    } catch {
      return "UNSET";
    }
  };
  // Remembered here too, for a browser whose storage refuses the write.
  let consent = readConsent();
  let scriptRequested = false;

  // Google's snippet: a queue the script reads once it is loaded. `gtag`
  // pushes its `arguments` object, which is what gtag.js expects.
  let gtag: GtagV7 = () => undefined;
  try {
    const global = browser.global;
    const layer = Array.isArray(global.dataLayer)
      ? (global.dataLayer as unknown[])
      : [];
    global.dataLayer = layer;
    gtag = function gtagV7() {
      // eslint-disable-next-line prefer-rest-params
      layer.push(arguments);
    };
    global.gtag = gtag;
  } catch {
    // A page that cannot hold the queue sends nothing.
  }
  const call = (...args: unknown[]): void => {
    try {
      gtag(...args);
    } catch {
      // Analytics never reaches the game.
    }
  };

  // Consent Mode v2: everything denied before the tag is configured.
  call("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (consent === "GRANTED")
    call("consent", "update", { analytics_storage: "granted" });
  call("js", new Date());
  call("config", GA_MEASUREMENT_ID_V7, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const loadScript = (): void => {
    if (mode !== "LIVE" || scriptRequested) return;
    scriptRequested = true;
    try {
      const document = browser.document;
      if (document === undefined) return;
      const script = document.createElement("script");
      script.async = true;
      script.src = GA_SCRIPT_URL_V7;
      // Blocked (an ad blocker) or offline: the queue just stays a queue.
      script.onerror = () => undefined;
      document.head.append(script);
    } catch {
      // No script, no hits; the game is unaffected.
    }
  };
  if (consent === "GRANTED") loadScript();

  const clearCookies = (): void => {
    try {
      const document = browser.document;
      if (document === undefined || typeof document.cookie !== "string") return;
      const names = document.cookie
        .split(";")
        .map((part) => part.split("=")[0]?.trim() ?? "")
        .filter((name) => name === "_ga" || name.startsWith("_ga_"));
      for (const name of names)
        for (const domain of ["", `; domain=${browser.hostname}`])
          document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    } catch {
      // Cookies that cannot be read cannot be cleared either.
    }
  };

  const send = (events: readonly AnalyticsEventV7[]): void => {
    if (consent !== "GRANTED") return;
    for (const event of events) call("event", event.name, event.params);
  };

  // The last unfinished match seen: its end, or its deletion, is reported.
  let open: PlayerViewV7 | null = null;
  const observe = (snapshot: Ruleset7BrowserSnapshot): void => {
    try {
      const view = snapshot.view;
      if (unfinishedV7(snapshot) && view !== null) {
        open = view;
        return;
      }
      if (open === null) return;
      if (
        snapshot.phase === "COMPLETE" &&
        view !== null &&
        view.outcome !== null
      ) {
        open = null;
        send(matchEndEventsV7(view));
      } else if (snapshot.phase === "EMPTY") {
        const abandoned = open;
        open = null;
        send(matchEndEventsV7(abandoned));
      }
    } catch {
      // A view the events cannot read sends nothing.
    }
  };

  return {
    available: true,
    consent: () => consent,
    setConsent(granted: boolean): void {
      consent = granted ? "GRANTED" : "DENIED";
      try {
        browser.storage?.setItem(
          ANALYTICS_CONSENT_STORAGE_KEY_V7,
          granted ? "granted" : "denied",
        );
      } catch {
        // Then the choice lasts for this visit only.
      }
      call("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
      });
      if (granted) loadScript();
      else clearCookies();
    },
    attach(controller) {
      try {
        const detach = controller.subscribe(observe);
        return () => {
          try {
            if (typeof detach === "function") detach();
          } catch {
            // Nothing to detach.
          }
        };
      } catch {
        return () => undefined;
      }
    },
    matchStarted(setup, source, before): void {
      try {
        if (unfinishedV7(before) && before?.view != null)
          send(matchEndEventsV7(before.view));
        send(matchStartEventsV7(setup, source));
      } catch {
        // A setup the events cannot read sends nothing.
      }
    },
    tutorialCompleted(): void {
      send([{ name: "tutorial_complete", params: {} }]);
    },
  };
}

/** The browser's tracker, from the page it runs in. */
export function browserGameAnalyticsV7(
  production: boolean,
  window: Window | undefined = globalThis.window,
): GameAnalyticsV7 {
  try {
    if (window === undefined) return NO_ANALYTICS_V7;
    let storage: StorageAdapter | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const mode = analyticsModeV7({
      production,
      hostname: window.location.hostname,
      search: window.location.search,
      webdriver: window.navigator.webdriver === true,
    });
    return createGameAnalyticsV7(mode, {
      global: window as unknown as Record<string, unknown>,
      document: window.document,
      storage,
      hostname: window.location.hostname,
    });
  } catch {
    return NO_ANALYTICS_V7;
  }
}
