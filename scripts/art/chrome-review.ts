import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}

interface ProtocolMessage {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}

const baseUrl = process.argv[2] ?? "http://localhost:6173";
const reviewRoot = path.join(process.cwd(), "art/pixellab/reviews");
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const port = 9227;

const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(tmpdir(), `pulp-wars-chrome-${process.pid}`)}`,
    "--window-size=1440,1000",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'hub'`,
  );
  await clickButton(connection, "New Conquest");
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'mode'`,
  );
  await clickButton(connection, "Choose Conquest");
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'setup'`,
  );
  await clickButton(connection, "Continue");
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'faction'`,
  );
  await settleImages(connection);
  await waitForExpression(
    connection,
    `(() => { const hero = document.querySelector('.faction-hero'); const image = hero?.querySelector('.faction-hero-art'); if (!(image instanceof HTMLImageElement)) return false; const style = getComputedStyle(image); const rect = image.getBoundingClientRect(); return hero?.dataset.loaded === 'true' && image.complete && image.naturalWidth > 0 && !image.hidden && style.opacity === '1' && rect.width > 100 && rect.height > 100; })()`,
  );
  await capture(connection, "chrome-faction-desktop.png");
  await clickButton(connection, "Start Conquest");
  await waitForExpression(
    connection,
    `[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Confirm Start')`,
  );
  await clickButton(connection, "Confirm Start");
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'match'`,
  );
  await settleImages(connection);
  await delay(500);
  await capture(connection, "chrome-match-desktop.png");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await renderFreshMatchFixture(connection);
  await waitForMobileStartArea(connection);
  await capture(connection, "chrome-match-mobile.png");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await renderRewardFixture(connection, 2);
  await settleImages(connection);
  await waitForRewardIcons(connection, ["workshop", "survey"]);
  await capture(connection, "chrome-reward-level2-desktop.png");
  await renderRewardFixture(connection, 3);
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await settleImages(connection);
  await waitForRewardIcons(connection, ["resources", "city-wall"]);
  await capture(connection, "chrome-reward-level3-mobile.png");
  connection.close();
  console.log(`Chrome review screenshots written to ${reviewRoot}`);
} finally {
  browser.kill();
}

async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const target = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (target !== undefined) return target;
      }
    } catch {
      // Chrome has not opened the debugging endpoint yet.
    }
    await delay(100);
  }
  throw new Error("Chrome debugging target did not become ready");
}

async function connect(webSocketUrl: string): Promise<{
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
}> {
  const socket = new WebSocket(webSocketUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP failed")), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map<
    number,
    {
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(new Error(message.error.message ?? "CDP command failed"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close(): void {
      socket.close();
    },
  };
}

async function clickButton(
  connection: {
    readonly send: (method: string, params?: object) => Promise<unknown>;
  },
  label: string,
): Promise<void> {
  const expression = `(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === ${JSON.stringify(label)}); if (!button) throw new Error('Missing button: ${label}'); button.click(); return true; })()`;
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as { readonly exceptionDetails?: { readonly text?: string } };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.text ?? `Could not click ${label}`,
    );
  await delay(100);
}

async function waitForExpression(
  connection: {
    readonly send: (method: string, params?: object) => Promise<unknown>;
  },
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = (await connection.send("Runtime.evaluate", {
      expression: `Boolean(${expression})`,
      returnByValue: true,
    })) as {
      readonly result?: { readonly value?: boolean };
      readonly exceptionDetails?: unknown;
    };
    if (
      response.exceptionDetails === undefined &&
      response.result?.value === true
    )
      return;
    await delay(100);
  }
  throw new Error(`Chrome review timed out waiting for: ${expression}`);
}

async function settleImages(connection: {
  readonly send: (method: string, params?: object) => Promise<unknown>;
}): Promise<void> {
  await connection.send("Runtime.evaluate", {
    expression:
      "Promise.all([document.fonts.ready, ...[...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }))])",
    awaitPromise: true,
    returnByValue: true,
  });
}

async function renderRewardFixture(
  connection: {
    readonly send: (method: string, params?: object) => Promise<unknown>;
  },
  level: 2 | 3,
): Promise<void> {
  const expression = `(async () => {
    const [{ bootstrapApp }, engine] = await Promise.all([
      import('/src/app/bootstrap.ts'),
      import('/src/engine/index.ts')
    ]);
    const result = engine.createGame({ rulesetId: engine.RULESET_ID, seed: ${level}, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL' });
    if (!result.ok) throw new Error(result.error.code);
    const human = result.state.players.find((player) => player.controller === 'HUMAN');
    const city = result.state.cities.find((candidate) => candidate.ownerId === human?.id);
    if (!city) throw new Error('Missing reward fixture city');
    const state = {
      ...result.state,
      cities: result.state.cities.map((candidate) => candidate.id === city.id ? { ...candidate, level: ${level}, population: 0 } : candidate),
      pendingChoice: { kind: 'CITY_REWARD', cityId: city.id, level: ${level} }
    };
    document.querySelector('#app')?.replaceChildren();
    bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, aiStepDelayMs: 100000, prefersReducedMotion: true });
    return true;
  })()`;
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as { readonly exceptionDetails?: { readonly text?: string } };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.text ??
        `Could not render level ${level} reward`,
    );
  await waitForExpression(
    connection,
    `document.querySelectorAll('.reward-choice-art').length === 2`,
  );
}

async function renderFreshMatchFixture(connection: {
  readonly send: (method: string, params?: object) => Promise<unknown>;
}): Promise<void> {
  const expression = `(async () => {
    const [{ bootstrapApp }, engine] = await Promise.all([
      import('/src/app/bootstrap.ts'),
      import('/src/engine/index.ts')
    ]);
    const result = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 6173, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL' });
    if (!result.ok) throw new Error(result.error.code);
    document.querySelector('#app')?.replaceChildren();
    bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: result.state, aiStepDelayMs: 100000, prefersReducedMotion: true });
    return true;
  })()`;
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as { readonly exceptionDetails?: { readonly text?: string } };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.text ?? "Could not render fresh mobile match",
    );
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'match' && document.querySelector('.board-canvas')?.getBoundingClientRect().width === 390`,
  );
}

async function waitForMobileStartArea(connection: {
  readonly send: (method: string, params?: object) => Promise<unknown>;
}): Promise<void> {
  await waitForExpression(
    connection,
    `(() => {
      const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
      if (!resources.some((name) => name.endsWith('/assets/pixellab/units/warrior.png')) || !resources.some((name) => name.endsWith('/assets/pixellab/buildings/city-1.png'))) return false;
      const canvas = document.querySelector('.board-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return false;
      const context = canvas.getContext('2d');
      if (!context || canvas.width < 700 || canvas.height < 700) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      let sumX = 0;
      let minimumX = canvas.width;
      let maximumX = -1;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const index = (y * canvas.width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          if (red > 160 && red > green * 1.25 && red > blue * 1.15) {
            count += 1;
            sumX += x;
            minimumX = Math.min(minimumX, x);
            maximumX = Math.max(maximumX, x);
          }
        }
      }
      if (count < 40) return false;
      const centerX = sumX / count;
      return centerX > canvas.width * 0.2 && centerX < canvas.width * 0.8 && minimumX > 4 && maximumX < canvas.width - 4;
    })()`,
  );
}

async function waitForRewardIcons(
  connection: {
    readonly send: (method: string, params?: object) => Promise<unknown>;
  },
  ids: readonly string[],
): Promise<void> {
  const endings = ids.map((id) => `/assets/pixellab/ui/reward-${id}.png`);
  await waitForExpression(
    connection,
    `(() => { const expected = ${JSON.stringify(endings)}; const images = [...document.querySelectorAll('.reward-choice-art')]; return images.length === expected.length && images.every((image, index) => image instanceof HTMLImageElement && image.src.endsWith(expected[index]) && image.complete && image.naturalWidth > 0 && !image.hidden && image.getBoundingClientRect().width >= 60); })()`,
  );
}

async function capture(
  connection: {
    readonly send: (method: string, params?: object) => Promise<unknown>;
  },
  filename: string,
): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error(`Chrome did not return screenshot data for ${filename}`);
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(
    path.join(reviewRoot, filename),
    Buffer.from(response.data, "base64"),
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
