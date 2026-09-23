import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

export interface SmokeCommandOptions {
  readonly timeoutMs?: number;
  readonly stage?: string;
}

export interface SmokeConnection {
  send(
    method: string,
    params?: object,
    options?: SmokeCommandOptions,
  ): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): () => void;
  close(): void;
}

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}

/** Own only this spawned browser; attach before the application starts loading. */
export async function launchSmokeBrowser(options: {
  readonly chrome: string;
  readonly args: readonly string[];
  readonly port: number;
  readonly timeoutMs?: number;
}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const browser = spawn(options.chrome, [...options.args, "about:blank"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  let failure: string | undefined;
  let stderr = "";
  let connection: SmokeConnection | undefined;
  browser.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-4_000);
  });
  browser.on("error", (error) => {
    failure = `Chrome launch failed: ${error.message}`;
    connection?.close();
  });
  browser.on("exit", (code, signal) => {
    failure = `Chrome exited (code=${code}, signal=${signal})`;
    connection?.close();
  });
  const deadline = Date.now() + timeoutMs;
  let lastObservation = "debugging endpoint not yet available";
  try {
    while (Date.now() < deadline) {
      if (failure !== undefined) throw new Error(failure);
      let target: DebugTarget | undefined;
      try {
        const response = await fetch(
          `http://localhost:${options.port}/json/list`,
          {
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(1_000, deadline - Date.now())),
            ),
          },
        );
        if (response.ok) {
          const targets = (await response.json()) as readonly DebugTarget[];
          lastObservation = JSON.stringify(
            targets.map(({ type, url }) => ({ type, url })),
          );
          target = targets.find(
            (candidate) =>
              candidate.type === "page" && candidate.url === "about:blank",
          );
        } else lastObservation = `debug endpoint HTTP ${response.status}`;
      } catch (error) {
        lastObservation =
          error instanceof Error ? error.message : String(error);
      }
      if (failure !== undefined) throw new Error(failure);
      if (target !== undefined) {
        connection = await connectSmokeTarget(
          target.webSocketDebuggerUrl,
          Math.max(1, deadline - Date.now()),
        );
        if (failure !== undefined) throw new Error(failure);
        return {
          connection,
          close() {
            connection?.close();
            browser.kill();
          },
        };
      }
      await delay(100);
    }
    throw new Error(`Chrome blank page target timed out after ${timeoutMs}ms`);
  } catch (error) {
    connection?.close();
    browser.kill();
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; debugging port=${options.port}; last observation=${lastObservation}; Chrome stderr=${stderr || "(empty)"}`,
      { cause: error },
    );
  }
}

/** Bound transport failures without replaying commands or application assertions. */
export async function connectSmokeTarget(
  webSocketUrl: string,
  openTimeoutMs = 15_000,
  commandTimeoutMs = 30_000,
): Promise<SmokeConnection> {
  const socket = new WebSocket(webSocketUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        finish(new Error(`CDP connection timed out after ${openTimeoutMs}ms`)),
      openTimeoutMs,
    );
    function finish(error?: Error) {
      clearTimeout(timer);
      socket.removeEventListener("open", opened);
      socket.removeEventListener("error", failed);
      socket.removeEventListener("close", failed);
      if (error !== undefined) {
        socket.close();
        reject(error);
      } else resolve();
    }
    function opened() {
      finish();
    }
    function failed() {
      finish(new Error("CDP connection closed or failed before opening"));
    }
    socket.addEventListener("open", opened);
    socket.addEventListener("error", failed);
    socket.addEventListener("close", failed);
  });
  if (socket.readyState !== WebSocket.OPEN) {
    socket.close();
    throw new Error("CDP connection closed immediately after opening");
  }
  let nextId = 1;
  let closed = false;
  const pending = new Map<
    number,
    {
      readonly method: string;
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
      readonly timer: ReturnType<typeof setTimeout>;
    }
  >();
  const listeners = new Set<(method: string, params: unknown) => void>();
  function disconnect() {
    closed = true;
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(
        new Error(`${request.method}: CDP connection closed or failed`),
      );
    }
    pending.clear();
  }
  socket.addEventListener("close", disconnect);
  socket.addEventListener("error", disconnect);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      readonly id?: number;
      readonly method?: string;
      readonly params?: unknown;
      readonly result?: unknown;
      readonly error?: { readonly message?: string };
    };
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error !== undefined)
        request.reject(
          new Error(
            `${request.method}: ${message.error.message ?? "CDP command failed"}`,
          ),
        );
      else request.resolve(message.result);
    } else if (message.method !== undefined) {
      for (const listener of listeners)
        listener(message.method, message.params);
    }
  });
  return {
    send(method, params = {}, options = {}) {
      const timeoutMs = options.timeoutMs ?? commandTimeoutMs;
      const diagnostic =
        options.stage === undefined ? method : `${method} (${options.stage})`;
      if (closed || socket.readyState !== WebSocket.OPEN)
        return Promise.reject(
          new Error(`${diagnostic}: CDP connection is closed`),
        );
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(
            new Error(
              `${diagnostic}: CDP command timed out after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs);
        pending.set(id, { method: diagnostic, resolve, reject, timer });
        try {
          socket.send(JSON.stringify({ id, method, params }));
        } catch (error) {
          pending.delete(id);
          clearTimeout(timer);
          reject(
            new Error(
              `${diagnostic}: CDP send failed: ${error instanceof Error ? error.message : String(error)}`,
              { cause: error },
            ),
          );
        }
      });
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      disconnect();
      socket.close();
    },
  };
}

/** Match this navigation's loader: the target URL and an old load event are insufficient. */
export async function navigateSmokePage(
  connection: SmokeConnection,
  url: string,
  timeoutMs = 30_000,
): Promise<void> {
  await connection.send("Page.setLifecycleEventsEnabled", { enabled: true });
  const loaded = new Set<string>();
  const unsubscribe = connection.onEvent((method, params) => {
    if (method !== "Page.lifecycleEvent") return;
    const event = params as {
      name?: string;
      frameId?: string;
      loaderId?: string;
    };
    if (event.name === "load") loaded.add(`${event.frameId}:${event.loaderId}`);
  });
  const deadline = Date.now() + timeoutMs;
  try {
    const result = (await connection.send("Page.navigate", { url })) as {
      readonly frameId: string;
      readonly loaderId?: string;
      readonly errorText?: string;
      readonly isDownload?: boolean;
    };
    if (result.errorText || result.isDownload || !result.loaderId) {
      throw new Error(
        `Chrome navigation failed for ${url}: ${JSON.stringify(result)}`,
      );
    }
    while (!loaded.has(`${result.frameId}:${result.loaderId}`)) {
      if (Date.now() >= deadline)
        throw new Error(
          `Chrome navigation load timed out after ${timeoutMs}ms for ${url}; frame=${result.frameId}; loader=${result.loaderId}`,
        );
      await delay(25);
    }
  } finally {
    unsubscribe();
  }
}

/** Wait for the replacement main-frame document, not only Page.reload's acknowledgement. */
export async function reloadSmokePage(
  connection: SmokeConnection,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const commandOptions = (stage: string): SmokeCommandOptions => ({
    timeoutMs: Math.max(1, deadline - Date.now()),
    stage,
  });
  await connection.send(
    "Page.setLifecycleEventsEnabled",
    { enabled: true },
    commandOptions("enable reload lifecycle events"),
  );
  const current = (await connection.send(
    "Page.getFrameTree",
    {},
    commandOptions("inspect document before reload"),
  )) as {
    readonly frameTree?: {
      readonly frame?: { readonly id?: string; readonly loaderId?: string };
    };
  };
  const frameId = current.frameTree?.frame?.id;
  const previousLoaderId = current.frameTree?.frame?.loaderId;
  if (!frameId || !previousLoaderId) {
    throw new Error(
      `Chrome reload could not identify the current main-frame document: ${JSON.stringify(current)}`,
    );
  }

  const navigatedLoaders = new Set<string>();
  const loadedLoaders = new Set<string>();
  const unsubscribe = connection.onEvent((method, params) => {
    if (method === "Page.frameNavigated") {
      const event = params as {
        readonly frame?: { readonly id?: string; readonly loaderId?: string };
      };
      const frame = event.frame;
      if (
        frame?.id === frameId &&
        frame.loaderId &&
        frame.loaderId !== previousLoaderId
      )
        navigatedLoaders.add(frame.loaderId);
      return;
    }
    if (method !== "Page.lifecycleEvent") return;
    const event = params as {
      readonly name?: string;
      readonly frameId?: string;
      readonly loaderId?: string;
    };
    if (
      event.name === "load" &&
      event.frameId === frameId &&
      event.loaderId &&
      event.loaderId !== previousLoaderId
    )
      loadedLoaders.add(event.loaderId);
  });
  try {
    await connection.send(
      "Page.reload",
      { ignoreCache: true },
      commandOptions("reload document"),
    );
    while (
      ![...navigatedLoaders].some((loaderId) => loadedLoaders.has(loaderId))
    ) {
      if (Date.now() >= deadline)
        throw new Error(
          `Chrome reload load timed out after ${timeoutMs}ms; frame=${frameId}; previousLoader=${previousLoaderId}`,
        );
      await delay(25);
    }
  } finally {
    unsubscribe();
  }
}
