// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import {
  createMemoryOnlineServerV7,
  ONLINE_NAME_STORAGE_KEY_V7,
  OnlineLobbySessionV7,
  type MemoryOnlineServerV7,
  type OnlineMatchHandoffV7,
} from "../../src/online/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { formatRoomCodeInputV7 } from "../../src/render/dom/online-lobby-view-v7";
import { sequenceRandomV7 } from "../unit/online-v7.shared";

/**
 * Play online in the app (bead pulp_wars-eqc6.2): the menu entry, the host
 * flow (two taps to a lobby), the lobby's code, link, Copy, seats, faction
 * and settings, the share link's one-tap Join, Join with code and its
 * error lines, Leave, and the hand-off at Start. Every player is on the
 * in-memory transport; the other side is a bare lobby session. No match is
 * played.
 */
class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement): void {
    container.replaceChildren(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

let app: BootstrappedRuleset7App | null = null;
const others: OnlineLobbySessionV7[] = [];

function boot(
  server: MemoryOnlineServerV7 | null,
  uid = "me",
  onOnlineMatchStarted?: (handoff: OnlineMatchHandoffV7) => void,
): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: null,
    boardHost: new Host(),
    randomSeed: () => 7,
    randomDraw: () => 0,
    online:
      server === null
        ? null
        : server.transport(uid, { random: sequenceRandomV7([0.3, 0.6]) }),
    ...(onOnlineMatchStarted === undefined ? {} : { onOnlineMatchStarted }),
  });
  return app;
}

/** The friend in another browser: a lobby session with no screen. */
function friend(
  server: MemoryOnlineServerV7,
  uid: string,
  name: string,
): OnlineLobbySessionV7 {
  const values = new Map<string, string>([[ONLINE_NAME_STORAGE_KEY_V7, name]]);
  const session = new OnlineLobbySessionV7({
    transport: server.transport(uid, {
      random: sequenceRandomV7([0.1, 0.2, 0.3, 0.4, 0.5]),
    }),
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    },
  });
  session.setOptions({ mapType: "DRY_LAND" });
  session.setOptions({ width: 11 });
  others.push(session);
  return session;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

function screen(): string | undefined {
  return document.querySelector<HTMLElement>(".v7-online")?.dataset.screen;
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function choose(id: string, value: string): void {
  const select = required<HTMLSelectElement>(`#${id}`);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  app?.destroy();
  app = null;
  for (const session of others.splice(0)) {
    session.state.handoff?.client.stop();
    session.destroy();
  }
  vi.restoreAllMocks();
});

describe("the menu", () => {
  it("offers Play online right after New game, only with a transport", () => {
    boot(null);
    expect(document.querySelector('[data-action="play-online"]')).toBeNull();
    boot(createMemoryOnlineServerV7());
    const actions = [
      ...document.querySelectorAll<HTMLElement>(".v7-main-menu button"),
    ].map((node) => node.dataset.action);
    expect(actions.indexOf("play-online")).toBe(
      actions.indexOf("new-game") + 1,
    );
    press("play-online");
    expect(required(".v7-front-title").textContent).toBe("Play online");
    expect(screen()).toBe("home");
    expect(required('[data-action="online-host"]').textContent).toBe(
      "Host a game",
    );
  });
});

describe("hosting", () => {
  it("is two taps with a saved name: the lobby with code, link and seats", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Ada");
    const server = createMemoryOnlineServerV7();
    const launch = vi.fn();
    const booted = boot(server);
    booted.controller.launch = launch as never;
    press("play-online");
    expect(document.querySelector("#v7-online-name")).toBeNull();
    expect(required(".v7-online-playing-as").textContent).toContain("Ada");
    press("online-host");
    await waitUntil(() => screen() === "lobby");
    const code = required(".v7-online-code").textContent ?? "";
    expect(code).toMatch(/^[A-HJ-NP-Z]{5}$/);
    expect(window.location.search).toBe(`?join=${code}`);
    expect(required(".v7-online-link").dataset.link).toBe(
      `http://localhost:3000/?join=${code}`,
    );
    const seats = [
      ...document.querySelectorAll<HTMLElement>(".v7-online-seat"),
    ];
    expect(seats.map((seat) => seat.dataset.seat)).toEqual(["0", "1"]);
    expect(seats[0]?.textContent).toContain("Ada (you)");
    expect(seats[0]?.textContent).toContain("Random");
    expect(seats[1]?.dataset.open).toBe("true");
    const start = required<HTMLButtonElement>('[data-action="online-start"]');
    expect(start.disabled).toBe(true);
    expect(required("#v7-online-wait").textContent).toBe(
      "Waiting for your friend to join.",
    );
    // Settings are one closed toggle with the summary beside it.
    const toggle = required('[data-action="online-settings"]');
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(required(".v7-online-summary").textContent).toMatch(
      /^Continents · \d+ × \d+ · No AI · Domination$/,
    );
    // The single-player game is never touched.
    expect(launch).not.toHaveBeenCalled();
    expect(
      Object.keys(window.localStorage).filter((key) =>
        key.startsWith("pulpWars.save"),
      ),
    ).toEqual([]);
  });

  it("asks a name first when none is saved", async () => {
    boot(createMemoryOnlineServerV7());
    press("play-online");
    const name = required<HTMLInputElement>("#v7-online-name");
    press("online-host");
    expect(required(".v7-online-problem").textContent).toBe(
      "Type a name first.",
    );
    expect(screen()).toBe("home");
    name.value = "Ada";
    press("online-host");
    await waitUntil(() => screen() === "lobby");
    expect(window.localStorage.getItem(ONLINE_NAME_STORAGE_KEY_V7)).toBe("Ada");
  });

  it("copies the link, seats the friend, changes settings live and starts", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Ada");
    const server = createMemoryOnlineServerV7();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const started = vi.fn();
    boot(server, "me", started);
    press("play-online");
    press("online-host");
    await waitUntil(() => screen() === "lobby");
    const code = required(".v7-online-code").textContent ?? "";
    // A small board: Map and Size under Settings.
    press("online-settings");
    expect(
      required('[data-action="online-settings"]').getAttribute("aria-expanded"),
    ).toBe("true");
    choose("v7-online-map", "DRY_LAND");
    choose("v7-online-size", "11");
    await waitUntil(
      () => server.match(code)?.optionsJson.includes("DRY_LAND") === true,
    );
    press("online-copy-link");
    await waitUntil(
      () =>
        required('[data-action="online-copy-link"]').textContent === "Copied!",
    );
    expect(writeText).toHaveBeenCalledWith(
      `http://localhost:3000/?join=${code}`,
    );
    const guest = friend(server, "friend", "Bob");
    await guest.join(code);
    await waitUntil(
      () =>
        document
          .querySelector('.v7-online-seat[data-seat="1"]')
          ?.textContent?.includes("Bob") === true,
    );
    expect(
      required('.v7-online-seat[data-seat="1"] .v7-online-seat-chip')
        .textContent,
    ).toBe("Ready");
    // The settings: two AI seats, shown as random to both.
    press("online-ai-2");
    await waitUntil(() => guest.state.match?.options?.aiSeats === 2);
    const ai = [
      ...document.querySelectorAll<HTMLElement>(
        '.v7-online-seat[data-ai="true"]',
      ),
    ];
    expect(ai.map((row) => row.textContent)).toEqual([
      "?AI 1AI · random",
      "?AI 2AI · random",
    ]);
    // The host's pick, and the friend's faction is "taken" in the picker.
    choose("v7-online-pick", "GOBLIN");
    await waitUntil(() => guest.state.match?.seats[0].pick === "GOBLIN");
    guest.setPick("DWARF");
    await waitUntil(
      () =>
        required<HTMLSelectElement>(
          "#v7-online-pick",
        ).querySelector<HTMLOptionElement>('option[value="DWARF"]')
          ?.disabled === true,
    );
    const start = required<HTMLButtonElement>('[data-action="online-start"]');
    expect(start.disabled).toBe(false);
    start.click();
    await waitUntil(() => started.mock.calls.length > 0);
    await waitUntil(() => guest.state.screen === "STARTED");
    expect(started).toHaveBeenCalledTimes(1);
    const handoff = started.mock.calls[0]?.[0] as OnlineMatchHandoffV7;
    expect(handoff.mySeat).toBe(0);
    expect(handoff.client.setup.factions.slice(0, 2)).toEqual([
      "GOBLIN",
      "DWARF",
    ]);
    expect(handoff.client.setup.aiCount).toBe(3);
    // The match screen takes the hand-off over (pulp_wars-eqc6.3).
    await waitUntil(
      () => document.querySelector('[data-v7-region="hud"]') !== null,
    );
    expect(screen()).toBeUndefined();
  });

  it("Leave closes the lobby and clears the address", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Ada");
    const server = createMemoryOnlineServerV7();
    boot(server);
    press("play-online");
    press("online-host");
    await waitUntil(() => screen() === "lobby");
    const code = required(".v7-online-code").textContent ?? "";
    press("online-leave");
    await waitUntil(() => screen() === "home");
    expect(window.location.search).toBe("");
    expect(server.match(code)?.status).toBe("ABANDONED");
  });
});

describe("joining", () => {
  it("opens a share link straight on the lobby with one Join tap", async () => {
    const server = createMemoryOnlineServerV7();
    const host = friend(server, "friend", "Ada");
    host.setPick("CANDY");
    await host.host();
    const code = host.state.code ?? "";
    window.history.replaceState(null, "", `/?join=${code}`);
    boot(server);
    expect(required(".v7-front-title").textContent).toBe("Play online");
    await waitUntil(() => screen() === "preview");
    expect(required(".v7-online-lede").textContent).toBe(
      "Ada invited you to a game.",
    );
    expect(required(".v7-online-code").textContent).toBe(code);
    expect(required('.v7-online-seat[data-seat="0"]').textContent).toContain(
      "Candy",
    );
    // No saved name: the field is asked for on the same screen.
    const name = required<HTMLInputElement>("#v7-online-name");
    name.value = "Bob";
    press("online-join-lobby");
    await waitUntil(() => screen() === "lobby");
    await waitUntil(() => host.state.match?.seats[1].name === "Bob");
    expect(required("#v7-online-wait").textContent).toBe(
      "Waiting for Ada to start…",
    );
    expect(document.querySelector('[data-action="online-start"]')).toBeNull();
    expect(
      document.querySelector('[data-action="online-settings"]'),
    ).toBeNull();
    // The guest's pick reaches the host; the host's settings reach the guest.
    choose("v7-online-pick", "MARTIAN");
    await waitUntil(() => host.state.match?.seats[1].pick === "MARTIAN");
    host.setOptions({ aiSeats: 1 });
    await waitUntil(
      () =>
        document.querySelectorAll('.v7-online-seat[data-ai="true"]').length ===
        1,
    );
    expect(required(".v7-online-summary").textContent).toContain("1 AI");
    await host.start();
    await waitUntil(() => screen() === "started");
  });

  it("guest Leave frees the seat", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Bob");
    const server = createMemoryOnlineServerV7();
    const host = friend(server, "friend", "Ada");
    await host.host();
    window.history.replaceState(null, "", `/?join=${host.state.code ?? ""}`);
    boot(server);
    await waitUntil(() => screen() === "preview");
    expect(document.querySelector("#v7-online-name")).toBeNull();
    press("online-join-lobby");
    await waitUntil(() => screen() === "lobby");
    press("online-leave");
    await waitUntil(() => screen() === "home");
    await waitUntil(() => host.state.match?.seats[1].uid === "");
  });

  it("Join with code cleans the input and says why it fails", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Bob");
    const server = createMemoryOnlineServerV7();
    boot(server);
    press("play-online");
    const field = required<HTMLInputElement>("#v7-online-code");
    const join = required<HTMLButtonElement>('[data-action="online-join"]');
    expect(join.disabled).toBe(true);
    type(field, "ab c");
    expect(field.value).toBe("ABC");
    expect(join.disabled).toBe(true);
    type(field, "ab cde");
    expect(field.value).toBe("ABCDE");
    expect(join.disabled).toBe(false);
    join.click();
    await waitUntil(
      () =>
        document
          .querySelector(".v7-online-message")
          ?.getAttribute("data-code") === "NOT_FOUND",
    );
    expect(required(".v7-online-message").textContent).toBe(
      "No game has that code. Check it with your friend.",
    );
    // A pasted link becomes its code.
    const host = friend(server, "friend", "Ada");
    await host.host();
    const code = host.state.code ?? "";
    type(field, `https://nadbordrozd.github.io/pulp_wars/?join=${code}`);
    expect(field.value).toBe(code);
    press("online-join");
    await waitUntil(() => screen() === "lobby");
    expect(required(".v7-online-code").textContent).toBe(code);
  });

  it("tells an outdated player to reload", async () => {
    window.localStorage.setItem(ONLINE_NAME_STORAGE_KEY_V7, "Bob");
    const server = createMemoryOnlineServerV7();
    const host = friend(server, "friend", "Ada");
    await host.host();
    const record = server.match(host.state.code ?? "");
    if (record === null) throw new Error("no match");
    server.forceMatch({ ...record, code: "WXYZA", rulesetId: "pulp-wars-old" });
    window.history.replaceState(null, "", "/?join=WXYZA");
    boot(server);
    await waitUntil(
      () =>
        document.querySelector(".v7-online-message") !== null &&
        !required(".v7-online-message").hidden,
    );
    expect(required(".v7-online-message").dataset.code).toBe(
      "RULESET_MISMATCH",
    );
    expect(required(".v7-online-message").textContent).toContain(
      "Your friend is on a different version — reload to update.",
    );
    expect(
      document.querySelector('[data-action="online-reload"]'),
    ).not.toBeNull();
    expect(window.location.search).toBe("");
  });

  it("formats typed and pasted codes", () => {
    expect(formatRoomCodeInputV7("q w-e")).toBe("QWE");
    expect(formatRoomCodeInputV7("abcdefgh")).toBe("ABCDE");
    expect(formatRoomCodeInputV7("http://x.test/?join=hjkmn")).toBe("HJKMN");
    expect(formatRoomCodeInputV7("12ab")).toBe("AB");
  });
});
