import { afterEach, describe, expect, it } from "vitest";
import { LEADERBOARD_NAME_STORAGE_KEY_V7 } from "../../src/app/leaderboard-v7";
import {
  createMemoryOnlineServerV7,
  onlineBoardSizeV7,
  ONLINE_LOBBY_STORAGE_KEY_V7,
  ONLINE_NAME_STORAGE_KEY_V7,
  ONLINE_OPTIONS_STORAGE_KEY_V7,
  ONLINE_PICK_STORAGE_KEY_V7,
  OnlineLobbySessionV7,
  onlineMaxAiSeatsV7,
  type MemoryOnlineServerV7,
  type OnlineLobbyLocationV7,
} from "../../src/online/index";
import type { StorageAdapter } from "../../src/persistence/index";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

/**
 * The lobby session (`pulp_wars-eqc6.2`): hosting, joining by link and by
 * code, picks, settings, Start and the hand-off, the error lines, leaving
 * and resuming, all on the in-memory transport. No match is played: the
 * hand-off ends each flow with an opened, unstarted lockstep client.
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

class FakeLocation implements OnlineLobbyLocationV7 {
  constructor(public current = "https://example.test/pulp_wars/") {}
  href(): string {
    return this.current;
  }
  replace(href: string): void {
    this.current = href;
  }
}

const sessions: OnlineLobbySessionV7[] = [];
afterEach(() => {
  for (const session of sessions.splice(0)) {
    session.state.handoff?.client.stop();
    session.destroy();
  }
});

async function settle(): Promise<void> {
  for (let index = 0; index < 6; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function player(
  server: MemoryOnlineServerV7,
  uid: string,
  name: string | null,
  options: {
    readonly storage?: MemoryStorage;
    readonly location?: FakeLocation;
  } = {},
): {
  session: OnlineLobbySessionV7;
  storage: MemoryStorage;
  location: FakeLocation;
} {
  const storage = options.storage ?? new MemoryStorage();
  if (name !== null) storage.setItem(ONLINE_NAME_STORAGE_KEY_V7, name);
  const location = options.location ?? new FakeLocation();
  const session = new OnlineLobbySessionV7({
    transport: server.transport(uid, {
      random: sequenceRandomV7([0.1, 0.2, 0.3, 0.4, 0.5]),
    }),
    storage,
    location,
    random: () => 0.25,
  });
  sessions.push(session);
  return { session, storage, location };
}

/** A small, fast board for the host's lobby. */
function smallBoard(session: OnlineLobbySessionV7, aiSeats = 0): void {
  const fixture = onlineOptionsFixtureV7(1, aiSeats);
  session.setOptions({ mapType: fixture.mapType });
  session.setOptions({ aiSeats });
  session.setOptions({ width: fixture.width });
}

describe("hosting", () => {
  it("hosts a lobby with the remembered settings, the code in the address", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    expect(host.session.state.options.mapType).toBe("CONTINENTS");
    expect(host.session.state.options.aiSeats).toBe(0);
    smallBoard(host.session);
    await host.session.host();
    const state = host.session.state;
    expect(state.screen).toBe("LOBBY");
    expect(state.mySeat).toBe(0);
    expect(state.code).toMatch(/^[A-HJ-NP-Z]{5}$/);
    expect(state.match?.seats[0].name).toBe("Ada");
    expect(state.match?.options?.mapType).toBe("DRY_LAND");
    expect(state.shareLink).toBe(
      `https://example.test/pulp_wars/?join=${state.code}`,
    );
    expect(host.location.current).toBe(
      `https://example.test/pulp_wars/?join=${state.code}`,
    );
    expect(host.storage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBe(state.code);
    // The settings are remembered for the next lobby, never the seed.
    expect(
      JSON.parse(host.storage.getItem(ONLINE_OPTIONS_STORAGE_KEY_V7) ?? "{}"),
    ).not.toHaveProperty("seed");
    expect(host.session.startBlocker()).toBe(
      "Waiting for your friend to join.",
    );
  });

  it("asks for a name first, and takes the leaderboard's when saved", async () => {
    const server = createMemoryOnlineServerV7();
    const nameless = player(server, "host", null);
    await nameless.session.host();
    expect(nameless.session.state.screen).toBe("HOME");
    expect(nameless.session.state.message?.code).toBe("NAME");
    expect(nameless.session.setName("  ")).toBe("Type a name first.");
    expect(nameless.session.setName(" Ada   Lovelace ")).toBeNull();
    expect(nameless.storage.getItem(ONLINE_NAME_STORAGE_KEY_V7)).toBe(
      "Ada Lovelace",
    );
    const storage = new MemoryStorage();
    storage.setItem(LEADERBOARD_NAME_STORAGE_KEY_V7, "Boardy");
    const fromBoard = player(server, "other", null, { storage });
    expect(fromBoard.session.state.name).toBe("Boardy");
  });
});

describe("joining", () => {
  it("previews a share link and joins with one tap; both see the picks", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    host.session.setPick("GOBLIN");
    await host.session.host();
    const code = host.session.state.code ?? "";
    const guest = player(server, "guest", "Bob", {
      location: new FakeLocation(
        `https://example.test/pulp_wars/?join=${code}`,
      ),
    });
    await guest.session.enter();
    expect(guest.session.state.screen).toBe("PREVIEW");
    expect(guest.session.state.match?.seats[0].name).toBe("Ada");
    expect(guest.session.state.mySeat).toBeNull();
    await guest.session.join();
    await settle();
    expect(guest.session.state.screen).toBe("LOBBY");
    expect(guest.session.state.mySeat).toBe(1);
    expect(host.session.state.match?.seats[1].name).toBe("Bob");
    expect(host.session.state.match?.seats[1].ready).toBe(true);
    expect(host.session.startBlocker()).toBeNull();
    guest.session.setPick("DWARF");
    await settle();
    expect(host.session.state.match?.seats[1].pick).toBe("DWARF");
    expect(guest.session.state.match?.seats[0].pick).toBe("GOBLIN");
    expect(guest.storage.getItem(ONLINE_PICK_STORAGE_KEY_V7)).toBe("DWARF");
  });

  it("joins by a typed code, any case and spacing, or a pasted link", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    const typed = `${code.slice(0, 2).toLowerCase()} ${code.slice(2)}`;
    const guest = player(server, "guest", "Bob");
    await guest.session.join(typed);
    expect(guest.session.state.screen).toBe("LOBBY");
    expect(guest.session.state.code).toBe(code);
    await guest.session.leave();
    const linked = player(server, "linked", "Cy");
    await linked.session.join(`https://friend.example/pulp_wars/?join=${code}`);
    expect(linked.session.state.screen).toBe("LOBBY");
    expect(linked.session.state.mySeat).toBe(1);
  });

  it("joins as Random when the link's host already plays the remembered faction", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    host.session.setPick("CANDY");
    await host.session.host();
    const guest = player(server, "guest", "Bob");
    guest.session.setPick("CANDY");
    await guest.session.openLink(host.session.state.code ?? "");
    await guest.session.join();
    expect(guest.session.state.match?.seats[1].pick).toBe("RANDOM");
    expect(guest.session.state.pick).toBe("RANDOM");
  });

  it("says why a join fails", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    const lost = player(server, "lost", "Lou");
    await lost.session.join("abc");
    expect(lost.session.state.message?.code).toBe("INVALID");
    await lost.session.join("ZZZZZ");
    expect(lost.session.state.message).toMatchObject({
      code: "NOT_FOUND",
      text: "No game has that code. Check it with your friend.",
    });
    const guest = player(server, "guest", "Bob");
    await guest.session.join(code);
    await lost.session.join(code);
    expect(lost.session.state.message).toMatchObject({
      code: "SEAT_TAKEN",
      text: "That game is full.",
    });
    // A link to a full lobby says so at once, without a preview.
    await lost.session.openLink(code);
    expect(lost.session.state.screen).toBe("HOME");
    expect(lost.session.state.message?.code).toBe("SEAT_TAKEN");
    const record = server.match(code);
    if (record === null) throw new Error("no match");
    server.forceMatch({ ...record, code: "QQQQQ", rulesetId: "pulp-wars-old" });
    await lost.session.join("QQQQQ");
    expect(lost.session.state.message).toMatchObject({
      code: "RULESET_MISMATCH",
      text: "Your friend is on a different version — reload to update.",
    });
    await host.session.start();
    await settle();
    await lost.session.join(code);
    expect(lost.session.state.message).toMatchObject({
      code: "NOT_LOBBY",
      text: "That game has already started.",
    });
  });

  it("drops a preview whose seat another player takes", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    const slow = player(server, "slow", "Sol");
    await slow.session.openLink(code);
    expect(slow.session.state.screen).toBe("PREVIEW");
    const fast = player(server, "fast", "Fay");
    await fast.session.join(code);
    await settle();
    expect(slow.session.state.screen).toBe("HOME");
    expect(slow.session.state.message?.code).toBe("SEAT_TAKEN");
  });
});

describe("the lobby", () => {
  it("shows the host's settings to the guest live, and keeps them legal", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const guest = player(server, "guest", "Bob");
    await guest.session.join(host.session.state.code ?? "");
    host.session.setOptions({ aiSeats: 2, difficulty: "HARD" });
    await settle();
    expect(guest.session.state.match?.options?.aiSeats).toBe(2);
    expect(guest.session.state.options.difficulty).toBe("HARD");
    // The guest cannot change them.
    guest.session.setOptions({ aiSeats: 0 });
    await settle();
    expect(host.session.state.options.aiSeats).toBe(2);
    // A new map takes its regular size for the seats.
    host.session.setOptions({ mapType: "PANGEA" });
    expect(host.session.state.options.width).toBe(
      onlineBoardSizeV7("PANGEA", 2),
    );
    // More AI seats than the map holds is never offered: it is cut back.
    const most = onlineMaxAiSeatsV7("DRY_LAND");
    host.session.setOptions({ mapType: "DRY_LAND" });
    host.session.setOptions({ aiSeats: 99 });
    expect(host.session.state.options.aiSeats).toBe(most);
  });

  it("blocks Start while both humans chose the same faction", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    host.session.setPick("UNDEAD");
    await host.session.host();
    const guest = player(server, "guest", "Bob");
    await guest.session.join(host.session.state.code ?? "");
    guest.session.setPick("UNDEAD");
    await settle();
    expect(host.session.startBlocker()).toMatch(/same faction/);
    await host.session.start();
    expect(host.session.state.screen).toBe("LOBBY");
    guest.session.setPick("RANDOM");
    await settle();
    expect(host.session.startBlocker()).toBeNull();
  });

  it("starts: both browsers get the same resolved match and a lockstep client", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session, 1);
    host.session.setPick("GOBLIN");
    await host.session.host();
    const guest = player(server, "guest", "Bob");
    await guest.session.join(host.session.state.code ?? "");
    await host.session.start();
    await settle();
    const hostHandoff = host.session.state.handoff;
    const guestHandoff = guest.session.state.handoff;
    expect(host.session.state.screen).toBe("STARTED");
    expect(guest.session.state.screen).toBe("STARTED");
    if (hostHandoff === null || guestHandoff === null)
      throw new Error("no hand-off");
    expect(hostHandoff.mySeat).toBe(0);
    expect(guestHandoff.mySeat).toBe(1);
    expect(hostHandoff.match.status).toBe("ACTIVE");
    const setup = hostHandoff.client.setup;
    expect(setup).toEqual(guestHandoff.client.setup);
    expect(setup.humanSeats).toEqual([0, 1]);
    expect(setup.aiCount).toBe(2);
    expect(setup.factions[0]).toBe("GOBLIN");
    // The guest's Random and the AI seat drew distinct other factions.
    expect(new Set(setup.factions).size).toBe(3);
    expect(hostHandoff.client.drivenSeats).toEqual([0, 2]);
    expect(guestHandoff.client.drivenSeats).toEqual([1]);
    expect(server.moves(hostHandoff.code)).toEqual([]);
  });

  it("guest Leave frees the seat; host Leave closes the lobby for the guest", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    const guest = player(server, "guest", "Bob");
    await guest.session.join(code);
    await guest.session.leave();
    await settle();
    expect(guest.session.state.screen).toBe("HOME");
    expect(guest.location.current).toBe("https://example.test/pulp_wars/");
    expect(guest.storage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBeNull();
    expect(host.session.state.match?.seats[1].uid).toBe("");
    const again = player(server, "again", "Al");
    await again.session.join(code);
    await host.session.leave();
    await settle();
    expect(host.session.state.screen).toBe("HOME");
    expect(server.match(code)?.status).toBe("ABANDONED");
    expect(again.session.state.screen).toBe("HOME");
    expect(again.session.state.message).toMatchObject({
      kind: "info",
      code: "CLOSED",
      text: "The host closed the game.",
    });
  });

  it("is resumed after a reload, from the address or from memory", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    // The reloaded page: the same uid and storage, the code in the address.
    host.session.destroy();
    const reloaded = player(server, "host", null, {
      storage: host.storage,
      location: new FakeLocation(host.location.current),
    });
    await reloaded.session.enter();
    expect(reloaded.session.state.screen).toBe("LOBBY");
    expect(reloaded.session.state.mySeat).toBe(0);
    // Without the address: the remembered code.
    reloaded.session.destroy();
    const remembered = player(server, "host", null, { storage: host.storage });
    expect(remembered.session.rememberedCode).toBe(code);
    await remembered.session.enter();
    expect(remembered.session.state.screen).toBe("LOBBY");
    // A stranger's remembered code is dropped without a word.
    const storage = new MemoryStorage();
    storage.setItem(ONLINE_LOBBY_STORAGE_KEY_V7, code);
    const stranger = player(server, "stranger", "Sam", { storage });
    const guest = player(server, "guest", "Bob");
    await guest.session.join(code);
    await stranger.session.enter();
    expect(stranger.session.state.screen).toBe("HOME");
    expect(stranger.session.state.message).toBeNull();
    expect(storage.getItem(ONLINE_LOBBY_STORAGE_KEY_V7)).toBeNull();
  });

  it("resumes a started match straight to the hand-off", async () => {
    const server = createMemoryOnlineServerV7();
    const host = player(server, "host", "Ada");
    smallBoard(host.session);
    await host.session.host();
    const code = host.session.state.code ?? "";
    const guest = player(server, "guest", "Bob");
    await guest.session.join(code);
    await host.session.start();
    await settle();
    const back = player(server, "guest", null, { storage: guest.storage });
    await back.session.enter();
    await settle();
    expect(back.session.state.screen).toBe("STARTED");
    expect(back.session.state.handoff?.mySeat).toBe(1);
  });
});
