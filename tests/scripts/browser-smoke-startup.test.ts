import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connectSmokeTarget,
  launchSmokeBrowser,
  navigateSmokePage,
  reloadSmokePage,
  type SmokeConnection,
} from "../../scripts/browser-smoke-startup";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function navigationHarness() {
  const listeners = new Set<(method: string, params: unknown) => void>();
  const send = vi.fn<SmokeConnection["send"]>(async () => ({}));
  const connection: SmokeConnection = {
    send,
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {},
  };
  return {
    connection,
    send,
    listeners,
    load(frameId: string, loaderId: string) {
      for (const listener of listeners)
        listener("Page.lifecycleEvent", { name: "load", frameId, loaderId });
    },
    navigate(frameId: string, loaderId: string) {
      for (const listener of listeners)
        listener("Page.frameNavigated", {
          frame: { id: frameId, loaderId },
        });
    },
  };
}

describe("smoke document startup", () => {
  it("waits for the requested main-frame loader, ignoring blank-page and subframe loads", async () => {
    vi.useFakeTimers();
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.navigate") {
        harness.load("main", "blank");
        harness.load("child", "requested");
        return { frameId: "main", loaderId: "requested" };
      }
      return {};
    });
    let ready = false;
    const navigation = navigateSmokePage(
      harness.connection,
      "http://localhost/?ruleset=6",
    ).then(() => {
      ready = true;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).toBe(false);
    harness.load("main", "requested");
    await vi.advanceTimersByTimeAsync(25);
    await navigation;
    expect(harness.listeners.size).toBe(0);
    expect(harness.send.mock.calls.map(([method]) => method)).toEqual([
      "Page.setLifecycleEventsEnabled",
      "Page.navigate",
    ]);
  });

  it("accepts the correct load arriving before the navigation response", async () => {
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.navigate") {
        harness.load("main", "requested");
        return { frameId: "main", loaderId: "requested" };
      }
      return {};
    });
    await navigateSmokePage(
      harness.connection,
      "http://localhost/?legacy-v5=1",
    );
    expect(harness.listeners.size).toBe(0);
  });

  it("fails a stalled document with route and loader diagnostics", async () => {
    vi.useFakeTimers();
    const harness = navigationHarness();
    harness.send.mockResolvedValue({ frameId: "main", loaderId: "stalled" });
    const failure = expect(
      navigateSmokePage(harness.connection, "http://localhost/?ruleset=6", 100),
    ).rejects.toThrow(/navigation load timed out.*ruleset=6.*loader=stalled/);
    await vi.advanceTimersByTimeAsync(100);
    await failure;
    expect(harness.listeners.size).toBe(0);
  });

  it("reports navigation errors without retrying the document", async () => {
    const harness = navigationHarness();
    harness.send.mockResolvedValue({
      frameId: "main",
      errorText: "net::ERR_CONNECTION_REFUSED",
    });
    await expect(
      navigateSmokePage(harness.connection, "http://localhost/"),
    ).rejects.toThrow("net::ERR_CONNECTION_REFUSED");
    expect(
      harness.send.mock.calls.filter(([method]) => method === "Page.navigate"),
    ).toHaveLength(1);
  });

  it("waits for the newly navigated main-frame loader after reload", async () => {
    vi.useFakeTimers();
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.getFrameTree")
        return {
          frameTree: { frame: { id: "main", loaderId: "current" } },
        };
      if (method === "Page.reload") {
        harness.load("main", "current");
        harness.navigate("main", "");
        harness.load("main", "");
        harness.navigate("child", "replacement");
        harness.load("child", "replacement");
        harness.load("main", "unrelated");
      }
      return {};
    });
    let ready = false;
    const reload = reloadSmokePage(harness.connection).then(() => {
      ready = true;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).toBe(false);
    harness.navigate("main", "replacement");
    await vi.advanceTimersByTimeAsync(25);
    expect(ready).toBe(false);
    harness.load("main", "replacement");
    await vi.advanceTimersByTimeAsync(25);
    await reload;
    expect(harness.listeners.size).toBe(0);
    expect(harness.send.mock.calls.map(([method]) => method)).toEqual([
      "Page.setLifecycleEventsEnabled",
      "Page.getFrameTree",
      "Page.reload",
    ]);
    expect(harness.send.mock.calls.at(-1)?.[1]).toEqual({ ignoreCache: true });
  });

  it("accepts matching reload lifecycle events before Page.reload responds", async () => {
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.getFrameTree")
        return {
          frameTree: { frame: { id: "main", loaderId: "current" } },
        };
      if (method === "Page.reload") {
        harness.navigate("main", "replacement");
        harness.load("main", "replacement");
      }
      return {};
    });
    await reloadSmokePage(harness.connection);
    expect(harness.listeners.size).toBe(0);
  });

  it("bounds a reload whose replacement document never loads", async () => {
    vi.useFakeTimers();
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.getFrameTree")
        return {
          frameTree: { frame: { id: "main", loaderId: "current" } },
        };
      if (method === "Page.reload") harness.navigate("main", "replacement");
      return {};
    });
    const failure = expect(
      reloadSmokePage(harness.connection, 100),
    ).rejects.toThrow(
      "Chrome reload load timed out after 100ms; frame=main; previousLoader=current",
    );
    await vi.advanceTimersByTimeAsync(100);
    await failure;
    expect(harness.listeners.size).toBe(0);
  });

  it("propagates Page.reload failures and removes its lifecycle listener", async () => {
    const harness = navigationHarness();
    harness.send.mockImplementation(async (method) => {
      if (method === "Page.getFrameTree")
        return {
          frameTree: { frame: { id: "main", loaderId: "current" } },
        };
      if (method === "Page.reload") throw new Error("reload protocol failure");
      return {};
    });
    await expect(reloadSmokePage(harness.connection)).rejects.toThrow(
      "reload protocol failure",
    );
    expect(harness.listeners.size).toBe(0);
    expect(
      harness.send.mock.calls.filter(([method]) => method === "Page.reload"),
    ).toHaveLength(1);
  });

  it("reports a missing executable promptly", async () => {
    await expect(
      launchSmokeBrowser({
        chrome: "/does-not-exist/pulp-wars-chrome",
        args: [],
        port: 1,
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow(/Chrome launch failed:.*ENOENT.*debugging port=1/s);
  });

  it("reports an early browser exit with bounded stderr diagnostics", async () => {
    await expect(
      launchSmokeBrowser({
        chrome: process.execPath,
        args: ["-e", "process.stderr.write('probe failure'); process.exit(7)"],
        port: 1,
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow(/Chrome exited \(code=7.*Chrome stderr=probe failure/s);
  });

  it("bounds discovery when the debugging endpoint never answers", async () => {
    const server = createServer(() => {});
    await new Promise<void>((resolve) =>
      server.listen(0, "localhost", resolve),
    );
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Missing probe port");
    try {
      await expect(
        launchSmokeBrowser({
          chrome: process.execPath,
          args: ["-e", "setInterval(() => {}, 1000)"],
          port: address.port,
          timeoutMs: 150,
        }),
      ).rejects.toThrow(
        /Chrome blank page target timed out after 150ms.*last observation=/s,
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

class TestSocket extends EventTarget {
  static readonly OPEN = 1;
  static latest: TestSocket;
  readyState = 0;
  sent: { id: number; method: string }[] = [];
  constructor() {
    super();
    TestSocket.latest = this;
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as { id: number; method: string });
  }
  reply(data: unknown) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(data) }),
    );
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}

describe("smoke CDP transport", () => {
  async function connect() {
    vi.stubGlobal("WebSocket", TestSocket);
    const connection = connectSmokeTarget("ws://probe", 100, 100);
    TestSocket.latest.open();
    return connection;
  }

  it("bounds a stalled WebSocket handshake", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestSocket);
    const failure = expect(
      connectSmokeTarget("ws://probe", 100),
    ).rejects.toThrow("CDP connection timed out after 100ms");
    await vi.advanceTimersByTimeAsync(100);
    await failure;
    expect(TestSocket.latest.readyState).toBe(3);
  });

  it("rejects pending commands immediately when the target closes", async () => {
    const connection = await connect();
    const failure = expect(connection.send("Runtime.evaluate")).rejects.toThrow(
      "Runtime.evaluate: CDP connection closed or failed",
    );
    TestSocket.latest.close();
    await failure;
    await expect(connection.send("Page.navigate")).rejects.toThrow(
      "Page.navigate: CDP connection is closed",
    );
  });

  it("rejects a connection closed immediately after opening", async () => {
    vi.stubGlobal("WebSocket", TestSocket);
    const failure = expect(connectSmokeTarget("ws://probe")).rejects.toThrow(
      "CDP connection closed immediately after opening",
    );
    TestSocket.latest.open();
    TestSocket.latest.close();
    await failure;
  });

  it("cleans pending command timers after a synchronous send failure", async () => {
    vi.useFakeTimers();
    const connection = await connect();
    vi.spyOn(TestSocket.latest, "send").mockImplementation(() => {
      throw new Error("socket write failed");
    });
    await expect(connection.send("Page.navigate")).rejects.toThrow(
      "Page.navigate: CDP send failed: socket write failed",
    );
    expect(vi.getTimerCount()).toBe(0);
    connection.close();
  });

  it("bounds a command that never replies", async () => {
    vi.useFakeTimers();
    const connection = await connect();
    const failure = expect(connection.send("Runtime.evaluate")).rejects.toThrow(
      "Runtime.evaluate: CDP command timed out after 100ms",
    );
    await vi.advanceTimersByTimeAsync(100);
    await failure;
    connection.close();
  });

  it("allows an explicitly longer policy call without extending ordinary command limits", async () => {
    vi.useFakeTimers();
    const connection = await connect();
    let completed = false;
    const policy = connection
      .send(
        "Runtime.evaluate",
        { awaitPromise: true },
        { timeoutMs: 300, stage: "legacy drivePolicy commandLimit=20000" },
      )
      .then(() => {
        completed = true;
      });
    await vi.advanceTimersByTimeAsync(200);
    expect(completed).toBe(false);
    TestSocket.latest.reply({ id: 1, result: { outcome: "DEFEAT" } });
    await policy;
    const ordinary = expect(
      connection.send("Runtime.evaluate"),
    ).rejects.toThrow("CDP command timed out after 100ms");
    await vi.advanceTimersByTimeAsync(100);
    await ordinary;
    expect(TestSocket.latest.sent).toHaveLength(2);
    connection.close();
  });

  it("reports the named policy stage when its explicit bound expires", async () => {
    vi.useFakeTimers();
    const connection = await connect();
    const failure = expect(
      connection.send(
        "Runtime.evaluate",
        {},
        { timeoutMs: 200, stage: "legacy drivePolicy commandLimit=20000" },
      ),
    ).rejects.toThrow(
      "Runtime.evaluate (legacy drivePolicy commandLimit=20000): CDP command timed out after 200ms",
    );
    await vi.advanceTimersByTimeAsync(200);
    await failure;
    expect(TestSocket.latest.sent).toHaveLength(1);
    connection.close();
  });

  it("propagates genuine protocol failures once, with the failing command", async () => {
    const connection = await connect();
    const failure = expect(connection.send("Runtime.evaluate")).rejects.toThrow(
      "Runtime.evaluate: genuine evaluation failure",
    );
    TestSocket.latest.reply({
      id: 1,
      error: { message: "genuine evaluation failure" },
    });
    await failure;
    expect(TestSocket.latest.sent).toHaveLength(1);
    connection.close();
  });
});
