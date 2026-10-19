import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY_V7,
  GA_MEASUREMENT_ID_V7,
  GA_SCRIPT_URL_V7,
  NO_ANALYTICS_V7,
  analyticsModeV7,
  createGameAnalyticsV7,
  matchEndEventsV7,
  matchStartEventsV7,
  type AnalyticsBrowserV7,
  type AnalyticsModeV7,
} from "../../src/app/analytics-v7";
import type { Ruleset7BrowserSnapshot } from "../../src/app/v7-controller";
import type { MatchSetupV7 } from "../../src/engine/v7/types";
import type { PlayerViewV7 } from "../../src/engine/v7/view";
import type { StorageAdapter } from "../../src/persistence/index";

/**
 * Play statistics (bead pulp_wars-2yc.101, docs/ANALYTICS.md): where the
 * tag loads, Consent Mode's order, the stored choice, the events and their
 * parameters, and that nothing of it can throw into the game.
 */

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

interface FakePage {
  readonly browser: AnalyticsBrowserV7;
  readonly global: Record<string, unknown>;
  readonly storage: MemoryStorage;
  readonly scripts: { src: string; async: boolean }[];
  readonly cookieWrites: string[];
  /** The dataLayer entries as plain arrays. */
  layer(): unknown[][];
  /** The `event` entries: [name, params]. */
  events(): [string, Record<string, unknown>][];
}

function page(options: { stored?: string; cookie?: string } = {}): FakePage {
  const storage = new MemoryStorage();
  if (options.stored !== undefined)
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY_V7, options.stored);
  const global: Record<string, unknown> = {};
  const scripts: { src: string; async: boolean }[] = [];
  const cookieWrites: string[] = [];
  let cookie = options.cookie ?? "";
  const document = {
    createElement: () => ({ src: "", async: false, onerror: null }),
    head: {
      append: (node: { src: string; async: boolean }) => scripts.push(node),
    },
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookieWrites.push(value);
      cookie = "";
    },
  } as unknown as NonNullable<AnalyticsBrowserV7["document"]>;
  const layer = (): unknown[][] =>
    ((global.dataLayer as ArrayLike<unknown>[] | undefined) ?? []).map(
      (entry) => Array.from(entry),
    );
  return {
    browser: { global, document, storage, hostname: "nadbordrozd.github.io" },
    global,
    storage,
    scripts,
    cookieWrites,
    layer,
    events: () =>
      layer()
        .filter((entry) => entry[0] === "event")
        .map(
          (entry) => [entry[1], entry[2]] as [string, Record<string, unknown>],
        ),
  };
}

const SKIRMISH: MatchSetupV7 = {
  rulesetId: "RULESET_7",
  seed: 7,
  width: 14,
  height: 14,
  aiCount: 2,
  aiDifficulty: "HARD",
  aiMode: "RIVAL",
  humanColor: "RED",
  factions: ["UNDEAD", "ORIGINAL", "GOBLIN"],
  mapType: "PANGEA",
  mapGenerationRevision: 1,
  curiosities: true,
  gameMode: "PERFECTION",
  gameKind: "REGULAR",
} as unknown as MatchSetupV7;

const MISSION: MatchSetupV7 = {
  ...SKIRMISH,
  aiDifficulty: "NORMAL",
  aiCount: 1,
  factions: ["ORIGINAL", "GOBLIN"],
  mapType: "MISSION",
  gameMode: undefined,
  curiosities: false,
  gameKind: undefined,
  mission: { id: "FRONTIER_1" },
} as unknown as MatchSetupV7;

const TUTORIAL: MatchSetupV7 = {
  ...MISSION,
  mission: { id: "TUTORIAL_1" },
} as unknown as MatchSetupV7;

function view(
  setup: MatchSetupV7,
  options: {
    outcome?: PlayerViewV7["outcome"];
    round?: number;
    stars?: number;
    missionStars?: number | null;
  } = {},
): PlayerViewV7 {
  return {
    setup,
    humanPlayerId: 1,
    round: options.round ?? 4,
    players: [
      { id: 1, faction: setup.factions[0] },
      { id: 2, faction: setup.factions[1] },
    ],
    outcome: options.outcome ?? null,
    score: {
      summary:
        options.stars === undefined
          ? null
          : { grade: { stars: options.stars } },
    },
    ...(setup.mapType === "MISSION"
      ? { mission: { stars: options.missionStars ?? null } }
      : {}),
  } as unknown as PlayerViewV7;
}

const WIN = { kind: "VICTORY", winnerId: 1 } as PlayerViewV7["outcome"];
const LOSS = {
  kind: "DEFEAT",
  humanId: 1,
  defeatedByPlayerId: 2,
} as PlayerViewV7["outcome"];

function snapshot(
  phase: Ruleset7BrowserSnapshot["phase"],
  match: PlayerViewV7 | null,
): Ruleset7BrowserSnapshot {
  return { phase, view: match } as unknown as Ruleset7BrowserSnapshot;
}

/** A controller the tracker attaches to; `emit` sends it a snapshot. */
function controller(): {
  subscribe(subscriber: (s: Ruleset7BrowserSnapshot) => void): () => void;
  emit(s: Ruleset7BrowserSnapshot): void;
} {
  let current: ((s: Ruleset7BrowserSnapshot) => void) | null = null;
  return {
    subscribe(subscriber) {
      current = subscriber;
      subscriber(snapshot("EMPTY", null));
      return () => {
        current = null;
      };
    },
    emit: (s) => current?.(s),
  };
}

describe("where the tag loads", () => {
  const env = {
    production: true,
    hostname: "nadbordrozd.github.io",
    search: "",
    webdriver: false,
  };

  it("is live only in a production build on the real site", () => {
    expect(analyticsModeV7(env)).toBe("LIVE");
    expect(analyticsModeV7({ ...env, production: false })).toBe("OFF");
    for (const hostname of [
      "localhost",
      "127.0.0.1",
      "[::1]",
      "app.localhost",
      "pulp.test",
      "192.168.1.20",
    ])
      expect(analyticsModeV7({ ...env, hostname })).toBe("OFF");
    expect(analyticsModeV7({ ...env, webdriver: true })).toBe("OFF");
    expect(analyticsModeV7({ ...env, search: "?browser-smoke=1" })).toBe("OFF");
  });

  it("previews the banner anywhere without loading Google's script", () => {
    expect(
      analyticsModeV7({
        ...env,
        production: false,
        hostname: "localhost",
        search: "?analytics-preview=1",
      }),
    ).toBe("PREVIEW");
    const fake = page({ stored: "granted" });
    const analytics = createGameAnalyticsV7("PREVIEW", fake.browser);
    expect(analytics.available).toBe(true);
    analytics.setConsent(true);
    expect(fake.scripts).toEqual([]);
  });

  it("off, touches nothing of the page", () => {
    const fake = page();
    const analytics = createGameAnalyticsV7("OFF", fake.browser);
    expect(analytics).toBe(NO_ANALYTICS_V7);
    expect(analytics.available).toBe(false);
    expect(fake.global).toEqual({});
    expect(fake.scripts).toEqual([]);
  });
});

describe("consent", () => {
  it("defaults every storage to denied before the tag is configured", () => {
    const fake = page();
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    expect(analytics.consent()).toBe("UNSET");
    const layer = fake.layer();
    expect(layer[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(layer[1]?.[0]).toBe("js");
    expect(layer[2]).toEqual([
      "config",
      GA_MEASUREMENT_ID_V7,
      { allow_google_signals: false, allow_ad_personalization_signals: false },
    ]);
    expect(layer).toHaveLength(3);
    // gtag pushes its `arguments` object, as Google's snippet does.
    const raw = (fake.global.dataLayer as unknown[])[0];
    expect(Array.isArray(raw)).toBe(false);
    expect(typeof fake.global.gtag).toBe("function");
    // Nothing is loaded before the player answers.
    expect(fake.scripts).toEqual([]);
  });

  it("Accept is stored, grants analytics storage and loads the script once", () => {
    const fake = page();
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    analytics.setConsent(true);
    expect(analytics.consent()).toBe("GRANTED");
    expect(fake.storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "granted",
    );
    expect(fake.layer().at(-1)).toEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
    expect(fake.scripts).toEqual([
      expect.objectContaining({ src: GA_SCRIPT_URL_V7, async: true }),
    ]);
    analytics.setConsent(true);
    expect(fake.scripts).toHaveLength(1);
  });

  it("Decline is stored, loads nothing and clears the _ga cookies", () => {
    const fake = page({ cookie: "_ga=GA1.1.1; _ga_3BEWEP1Y27=GS1; other=1" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    analytics.setConsent(false);
    expect(analytics.consent()).toBe("DENIED");
    expect(fake.storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY_V7)).toBe(
      "denied",
    );
    expect(fake.layer().at(-1)).toEqual([
      "consent",
      "update",
      { analytics_storage: "denied" },
    ]);
    expect(fake.scripts).toEqual([]);
    expect(fake.cookieWrites.some((write) => write.startsWith("_ga="))).toBe(
      true,
    );
    expect(
      fake.cookieWrites.some((write) => write.startsWith("_ga_3BEWEP1Y27=")),
    ).toBe(true);
    expect(fake.cookieWrites.some((write) => write.startsWith("other="))).toBe(
      false,
    );
  });

  it("a stored Accept is applied before the config and loads at once", () => {
    const fake = page({ stored: "granted" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    expect(analytics.consent()).toBe("GRANTED");
    const layer = fake.layer();
    expect(layer[0]?.[1]).toBe("default");
    expect(layer[1]).toEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
    expect(layer[3]?.[0]).toBe("config");
    expect(fake.scripts).toHaveLength(1);
  });

  it("a stored Decline stays declined", () => {
    const fake = page({ stored: "denied" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    expect(analytics.consent()).toBe("DENIED");
    expect(fake.scripts).toEqual([]);
  });
});

describe("events", () => {
  it("match_start carries the setup's choices and mission_start a mission", () => {
    expect(matchStartEventsV7(SKIRMISH, "advanced")).toEqual([
      {
        name: "match_start",
        params: {
          faction: "undead",
          map_type: "pangea",
          map_size: 14,
          opponents: 2,
          difficulty: "hard",
          mode: "perfection",
          source: "advanced",
          game_kind: "regular",
        },
      },
    ]);
    // pulp_wars-2yc.103: a custom game says so.
    expect(
      matchStartEventsV7({ ...SKIRMISH, gameKind: "CUSTOM" }, "advanced")[0]
        ?.params.game_kind,
    ).toBe("custom");
    expect(matchStartEventsV7(MISSION, "campaign")).toEqual([
      {
        name: "match_start",
        params: expect.objectContaining({
          faction: "human",
          map_type: "mission",
          mode: "domination",
          source: "campaign",
          game_kind: "mission",
        }),
      },
      {
        name: "mission_start",
        params: {
          mission_id: "frontier_1",
          campaign_id: "frontier",
          faction: "human",
        },
      },
    ]);
    // The tutorial is not a campaign mission.
    expect(
      matchStartEventsV7(TUTORIAL, "tutorial").map((event) => event.name),
    ).toEqual(["match_start"]);
  });

  it("match_end and mission_end carry the result, rounds and stars", () => {
    expect(
      matchEndEventsV7(view(SKIRMISH, { outcome: WIN, round: 12, stars: 2 })),
    ).toEqual([
      {
        name: "match_end",
        params: {
          result: "win",
          rounds: 12,
          stars: 2,
          faction: "undead",
          difficulty: "hard",
          mode: "perfection",
          game_kind: "regular",
        },
      },
    ]);
    // pulp_wars-2yc.103: a custom game's win earns no stars.
    expect(
      matchEndEventsV7(
        view(
          { ...SKIRMISH, gameKind: "CUSTOM" },
          { outcome: WIN, round: 12, stars: 2 },
        ),
      )[0]?.params,
    ).toEqual(expect.objectContaining({ stars: 0, game_kind: "custom" }));
    expect(
      matchEndEventsV7(view(MISSION, { outcome: WIN, missionStars: 3 })),
    ).toEqual([
      {
        name: "match_end",
        params: expect.objectContaining({ result: "win", stars: 3 }),
      },
      {
        name: "mission_end",
        params: {
          mission_id: "frontier_1",
          campaign_id: "frontier",
          result: "win",
          stars: 3,
        },
      },
    ]);
    expect(
      matchEndEventsV7(view(MISSION, { outcome: LOSS }))[1]?.params,
    ).toEqual({
      mission_id: "frontier_1",
      campaign_id: "frontier",
      result: "loss",
      stars: 0,
    });
    expect(matchEndEventsV7(view(SKIRMISH))[0]?.params).toEqual(
      expect.objectContaining({ result: "abandoned", stars: 0 }),
    );
  });

  it("are sent only with consent, never with names or free text", () => {
    const fake = page();
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    analytics.matchStarted(SKIRMISH, "quick_start", null);
    analytics.tutorialCompleted();
    expect(fake.events()).toEqual([]);
    analytics.setConsent(true);
    analytics.matchStarted(SKIRMISH, "quick_start", null);
    analytics.tutorialCompleted();
    expect(fake.events().map(([name]) => name)).toEqual([
      "match_start",
      "tutorial_complete",
    ]);
    for (const [, params] of fake.events())
      for (const value of Object.values(params))
        expect(["string", "number"]).toContain(typeof value);
    analytics.setConsent(false);
    analytics.matchStarted(SKIRMISH, "quick_start", null);
    expect(fake.events()).toHaveLength(2);
  });

  it("a launch over an unfinished match ends it as abandoned first", () => {
    const fake = page({ stored: "granted" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    analytics.matchStarted(
      MISSION,
      "campaign",
      snapshot("RESUMABLE", view(SKIRMISH, { round: 9 })),
    );
    expect(fake.events().map(([name]) => name)).toEqual([
      "match_end",
      "match_start",
      "mission_start",
    ]);
    expect(fake.events()[0]?.[1]).toEqual(
      expect.objectContaining({ result: "abandoned", rounds: 9 }),
    );
    // A finished match before the launch was not abandoned.
    analytics.matchStarted(
      SKIRMISH,
      "restart",
      snapshot("COMPLETE", view(SKIRMISH, { outcome: LOSS })),
    );
    expect(fake.events().map(([name]) => name)).toEqual([
      "match_end",
      "match_start",
      "mission_start",
      "match_start",
    ]);
  });

  it("the controller's snapshots end a match once, and a deleted save abandons it", () => {
    const fake = page({ stored: "granted" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    const port = controller();
    const detach = analytics.attach(port);
    port.emit(snapshot("ACTIVE", view(MISSION)));
    port.emit(snapshot("ACTIVE", view(MISSION, { round: 6 })));
    port.emit(
      snapshot(
        "COMPLETE",
        view(MISSION, { outcome: WIN, round: 7, missionStars: 2 }),
      ),
    );
    // Seen again (a redraw, a resumed finished save): nothing more.
    port.emit(snapshot("COMPLETE", view(MISSION, { outcome: WIN })));
    expect(fake.events()).toEqual([
      [
        "match_end",
        expect.objectContaining({ result: "win", rounds: 7, stars: 2 }),
      ],
      [
        "mission_end",
        {
          mission_id: "frontier_1",
          campaign_id: "frontier",
          result: "win",
          stars: 2,
        },
      ],
    ]);
    port.emit(snapshot("RESUMABLE", view(SKIRMISH, { round: 3 })));
    port.emit(snapshot("EMPTY", null));
    expect(fake.events().at(-1)).toEqual([
      "match_end",
      expect.objectContaining({ result: "abandoned", rounds: 3 }),
    ]);
    detach();
    port.emit(snapshot("ACTIVE", view(SKIRMISH)));
    port.emit(snapshot("COMPLETE", view(SKIRMISH, { outcome: LOSS })));
    expect(fake.events()).toHaveLength(3);
  });
});

describe("never reaches the game", () => {
  const modes: AnalyticsModeV7[] = ["LIVE", "PREVIEW"];

  it("survives a page that refuses the queue, storage or the script", () => {
    for (const mode of modes) {
      const global: Record<string, unknown> = {};
      Object.defineProperty(global, "dataLayer", {
        get: () => {
          throw new Error("blocked");
        },
        set: () => {
          throw new Error("blocked");
        },
      });
      const storage: StorageAdapter = {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      };
      const document = {
        createElement: () => {
          throw new Error("no scripts");
        },
        head: null,
        get cookie(): string {
          throw new Error("no cookies");
        },
      } as unknown as NonNullable<AnalyticsBrowserV7["document"]>;
      const analytics = createGameAnalyticsV7(mode, {
        global,
        document,
        storage,
        hostname: "nadbordrozd.github.io",
      });
      expect(analytics.consent()).toBe("UNSET");
      expect(() => {
        analytics.setConsent(true);
        analytics.matchStarted(SKIRMISH, "quick_start", null);
        analytics.tutorialCompleted();
        analytics.setConsent(false);
      }).not.toThrow();
      // The choice still holds for this visit.
      expect(analytics.consent()).toBe("DENIED");
    }
  });

  it("survives a queue whose push throws (gtag.js replaces it)", () => {
    const fake = page({ stored: "granted" });
    const analytics = createGameAnalyticsV7("LIVE", fake.browser);
    (fake.global.dataLayer as unknown[]).push = () => {
      throw new Error("blocked");
    };
    expect(() => {
      analytics.matchStarted(SKIRMISH, "quick_start", null);
      analytics.attach({
        subscribe: () => {
          throw new Error("gone");
        },
      })();
      analytics.matchStarted(
        SKIRMISH,
        "quick_start",
        snapshot("ACTIVE", { setup: null } as unknown as PlayerViewV7),
      );
    }).not.toThrow();
  });
});
