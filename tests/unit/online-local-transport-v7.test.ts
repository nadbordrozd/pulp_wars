import { describe, expect, it } from "vitest";
import { RULESET_7_ID } from "../../src/engine/v7/types";
import { onlineTransportModeV7 } from "../../src/online/browser";
import {
  LOCAL_ONLINE_UID_KEY_V7,
  createLocalOnlineTransportV7,
  localOnlineUidV7,
  type LocalChannelV7,
} from "../../src/online/local-transport";
import { onlineOptionsJsonV7 } from "../../src/online/match";
import type { OnlineMatchRecordV7 } from "../../src/online/types";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

/** One BroadcastChannel name shared by "tabs": a message reaches the others. */
function channelBus() {
  const members = new Set<{
    listeners: Set<(event: { readonly data: unknown }) => void>;
  }>();
  return (): LocalChannelV7 => {
    const self = {
      listeners: new Set<(event: { readonly data: unknown }) => void>(),
    };
    members.add(self);
    return {
      postMessage(message) {
        for (const member of members)
          if (member !== self)
            for (const listener of member.listeners)
              queueMicrotask(() => listener({ data: message }));
      },
      addEventListener: (_type, listener) => void self.listeners.add(listener),
      removeEventListener: (_type, listener) =>
        void self.listeners.delete(listener),
    };
  };
}

describe("the two-tab local transport", () => {
  it("gives each tab its own uid, kept across a reload", () => {
    const session = memoryStorage();
    const uid = localOnlineUidV7(session, sequenceRandomV7([0.5]));
    expect(uid).toBe("local-80000000");
    expect(session.map.get(LOCAL_ONLINE_UID_KEY_V7)).toBe(uid);
    expect(localOnlineUidV7(session, sequenceRandomV7([0.25]))).toBe(uid);
    expect(localOnlineUidV7(memoryStorage(), sequenceRandomV7([0.25]))).toBe(
      "local-40000000",
    );
  });

  it("lets two tabs host, join and see each other's writes", async () => {
    const shared = memoryStorage();
    const bus = channelBus();
    const tabA = createLocalOnlineTransportV7({
      storage: shared,
      uid: "local-aaaaaaaa",
      channel: bus(),
      pollMs: 0,
      random: sequenceRandomV7([0.3]),
    });
    const tabB = createLocalOnlineTransportV7({
      storage: shared,
      uid: "local-bbbbbbbb",
      channel: bus(),
      pollMs: 0,
    });
    const created = await tabA.createMatch({
      rulesetId: RULESET_7_ID,
      hostName: "Ada",
      hostPick: "RANDOM",
      optionsJson: onlineOptionsJsonV7(onlineOptionsFixtureV7()),
    });
    if (!created.ok) throw new Error(created.error.code);
    const seen: (OnlineMatchRecordV7 | null)[] = [];
    const stop = tabA.watchMatch(created.value.code, (record) =>
      seen.push(record),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen.map((record) => record?.guestUid)).toEqual([""]);
    const joined = await tabB.joinMatch(created.value.code, {
      name: "Bo",
      pick: "CANDY",
      ready: true,
    });
    expect(joined.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen.map((record) => record?.guestUid)).toEqual([
      "",
      "local-bbbbbbbb",
    ]);
    // The same rules as Firestore: the seat is taken now.
    const tabC = createLocalOnlineTransportV7({
      storage: shared,
      uid: "local-cccccccc",
      pollMs: 0,
    });
    const third = await tabC.joinMatch(created.value.code, {
      name: "Cy",
      pick: "RANDOM",
      ready: true,
    });
    expect(!third.ok && third.error.code).toBe("SEAT_TAKEN");
    stop();
  });
});

describe("which transport a page uses", () => {
  const env = {
    production: true,
    hostname: "nadbordrozd.github.io",
    search: "",
    webdriver: false,
  };
  it("is Firestore only on the deployed site", () => {
    expect(onlineTransportModeV7(env)).toBe("FIRESTORE");
    expect(onlineTransportModeV7({ ...env, production: false })).toBe("LOCAL");
    expect(onlineTransportModeV7({ ...env, hostname: "localhost" })).toBe(
      "LOCAL",
    );
    expect(onlineTransportModeV7({ ...env, webdriver: true })).toBe("LOCAL");
    expect(onlineTransportModeV7({ ...env, search: "?online=local" })).toBe(
      "LOCAL",
    );
    expect(onlineTransportModeV7({ ...env, search: "?browser-smoke=1" })).toBe(
      "LOCAL",
    );
  });
});
