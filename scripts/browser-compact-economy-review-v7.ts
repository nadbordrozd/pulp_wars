import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
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
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}
const baseUrl = "http://localhost:6173/?ruleset=7";
const outputRoot = await mkdtemp(
  path.join(os.tmpdir(), "pulp-wars-v7-compact-economy-"),
);
const chrome =
  process.env.CHROME_PATH ??
  "/Users/nadbor/.local/opt/chrome-headless-153/chrome-headless-shell-mac-x64/chrome-headless-shell";
const port = 10700 + (process.pid % 100);
const userData = path.join(
  process.env.TMPDIR ?? "/tmp",
  `pulp-wars-v7-compact-${process.pid}`,
);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
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
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  await viewport(connection, 1024, 768, 1);
  await setValue(connection, "#v7-seed", "20");
  await click(connection, '[data-action="launch"]');
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.ai.active; })()`,
  );
  const canvasBefore = await rect(connection, ".board-canvas-v7");
  const hud = await evaluate(
    connection,
    `(async () => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const m = await import('/src/render/dom/app-view-v7.ts'); const expected = s.view.cities.filter(c => c.ownerId === s.view.viewer.id).reduce((n,c) => n + (m.cityIncomeForViewerV7(s.view,c.id) ?? 0),0); const coins = document.querySelector('.v7-coins'); return { expected, balance: s.view.viewer.coins, displayed: coins?.textContent, iconIds: [...(coins?.querySelectorAll('img') ?? [])].map(icon => icon.dataset.assetId), accessible: coins?.getAttribute('aria-label') }; })()`,
  );
  assert(
    (hud as { expected: number; balance: number; displayed: string })
      .displayed ===
      `${(hud as { balance: number }).balance} (+${(hud as { expected: number }).expected}/turn)` &&
      JSON.stringify((hud as { iconIds: string[] }).iconIds) ===
        JSON.stringify(["ui-hud-gold-coin-v7"]) &&
      (hud as { accessible: string }).accessible.includes("Coins"),
    `HUD format or single coin icon mismatch: ${JSON.stringify(hud)}`,
  );
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock[data-selection-kind="unit"]') !== null`,
  );
  const unit1024 = await layout(connection);
  const unitHelpControl = await evaluate(
    connection,
    `(() => { const button=document.querySelector('[data-action="unit-help"]'); const glyph=button?.querySelector('.v7-unit-help-glyph'); if(!button||!glyph)throw Error('Unit help missing'); const b=button.getBoundingClientRect(),g=glyph.getBoundingClientRect(); return { hitWidth:b.width, hitHeight:b.height, visualWidth:g.width, visualHeight:g.height, centered:Math.abs((b.left+b.width/2)-(g.left+g.width/2))<=1 && Math.abs((b.top+b.height/2)-(g.top+g.height/2))<=1, label:button.getAttribute('aria-label') }; })()`,
  );
  assert(
    (unitHelpControl as { hitWidth: number; hitHeight: number }).hitWidth >=
      44 &&
      (unitHelpControl as { hitHeight: number }).hitHeight >= 44 &&
      (unitHelpControl as { visualWidth: number; visualHeight: number })
        .visualWidth === 28 &&
      (unitHelpControl as { visualHeight: number }).visualHeight === 28 &&
      (unitHelpControl as { centered: boolean }).centered &&
      (unitHelpControl as { label: string }).label.startsWith(
        "About selected ",
      ),
    `Unit help appearance or target mismatch: ${JSON.stringify(unitHelpControl)}`,
  );
  const emptyActionText = "No direct action is currently offered";
  assert(
    !(await evaluate(
      connection,
      `document.body.textContent.includes('${emptyActionText}')`,
    )),
    "Empty-action filler visible with selected unit",
  );
  const naturalModifier = await evaluate(
    connection,
    `(() => { const selection = document.querySelector('.v7-selection-dock[data-selection-kind="unit"]'); const modifiers = [...selection.querySelectorAll('.v7-stat-modifier')]; return modifiers.map(node => ({ value: node.textContent, explanation: node.getAttribute('aria-label') })); })()`,
  );
  assert(
    (naturalModifier as unknown[]).length > 0,
    "Natural public unit modifier missing",
  );
  await capture(connection, "compact-1024-unit-dpr1.png");
  assert(
    unit1024.height <= 190 && unit1024.horizontal && !unit1024.pageOverflow,
    `1024 unit dock failed: ${JSON.stringify(unit1024)}`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-stat-modifier')?.focus()`,
  );
  await capture(connection, "compact-1024-natural-modifier-focus.png");
  const rightTooltip = await evaluate(
    connection,
    `(() => { const dd=[...document.querySelectorAll('.v7-unit-stats dd')].at(-1); if(!dd)throw Error('Right stat absent'); const button=document.createElement('button'); button.className='v7-stat-modifier'; button.textContent='+5'; button.dataset.tooltip='Promotion: veteran experience adds five to this stat after promotion.'; button.setAttribute('aria-label',button.dataset.tooltip); button.dataset.reviewSynthetic='promotion-visual-only'; dd.append(button); button.focus(); const r=button.getBoundingClientRect(),pseudo=getComputedStyle(button,'::after'); return { left:r.left, right:r.left+parseFloat(pseudo.width), viewport:innerWidth, display:pseudo.display, wordBreak:pseudo.wordBreak, overflowWrap:pseudo.overflowWrap }; })()`,
  );
  assert(
    (
      rightTooltip as {
        right: number;
        viewport: number;
        display: string;
        wordBreak: string;
      }
    ).right <= (rightTooltip as { right: number; viewport: number }).viewport &&
      (rightTooltip as { display: string }).display === "block" &&
      (rightTooltip as { wordBreak: string }).wordBreak === "normal",
    `Right modifier tooltip clips or breaks: ${JSON.stringify(rightTooltip)}`,
  );
  await capture(connection, "compact-1024-promoted-plus5-synthetic.png");
  await click(connection, '[data-action="unit-help"]');
  await waitFor(
    connection,
    `document.querySelector('.v7-unit-help-dialog[aria-modal="true"]') !== null`,
  );
  const help = await evaluate(
    connection,
    `(() => { const modal=document.querySelector('.v7-unit-help-dialog'); const close=modal?.querySelector('[data-action="close-unit-help"]'); const m=modal?.getBoundingClientRect(),c=close?.getBoundingClientRect(); return { active: document.activeElement?.getAttribute('data-action'), abilities: modal?.querySelector('.v7-abilities')?.textContent, status: modal?.querySelector('.v7-readiness-label')?.textContent, visible: Boolean(m && c && m.width >= 300 && m.height >= 160 && m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight && c.width >= 44 && c.height >= 44 && c.top >= m.top && c.bottom <= m.bottom) }; })()`,
  );
  assert(
    (help as { visible?: boolean }).visible === true &&
      Boolean((help as { abilities?: string }).abilities) &&
      Boolean((help as { status?: string }).status),
    "Unit details missing abilities/current state",
  );
  await capture(connection, "compact-1024-unit-help.png");
  await key(connection, "Escape", "Escape");
  await waitFor(
    connection,
    `document.querySelector('.v7-unit-help-dialog') === null`,
  );
  const focusReturn = await evaluate(
    connection,
    `document.activeElement?.getAttribute('data-action')`,
  );
  assert(
    focusReturn === "unit-help",
    `Unit help focus return failed: ${focusReturn}`,
  );
  await evaluate(
    connection,
    `document.querySelector('.board-canvas-v7')?.focus()`,
  );
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock[data-selection-kind="city"]') !== null`,
  );
  const city1024 = await layout(connection);
  assert(
    !(await evaluate(
      connection,
      `document.body.textContent.includes('${emptyActionText}')`,
    )),
    "Empty-action filler visible with selected city",
  );
  assert(
    Math.abs(unit1024.height - city1024.height) <= 2 &&
      city1024.horizontal &&
      !city1024.pageOverflow,
    `1024 city geometry failed: ${JSON.stringify({ unit1024, city1024 })}`,
  );
  assertSameRect(canvasBefore, await rect(connection, ".board-canvas-v7"));
  await capture(connection, "compact-1024-city-dpr1.png");
  const manyActions = await evaluate(
    connection,
    `(() => { const dock=document.querySelector('.v7-selection-dock'); let row=dock?.querySelector(':scope > .v7-context-actions'); if(!dock)throw Error('City dock absent'); if(!row){row=document.createElement('div');row.className='v7-context-actions';row.dataset.reviewSynthetic='many-actions-row';dock.append(row)}; for(let i=0;i<12;i++){const button=document.createElement('button');button.className='v7-context-action';button.dataset.reviewSynthetic='many-actions-layout-only';const img=document.createElement('img');img.className='v7-art-frame';img.src=dock.querySelector('.v7-identity-art img')?.src ?? '';img.alt='';button.append(img);const label=document.createElement('span');label.textContent='Action '+(i+1);button.append(label);row.append(button)}; return { client:row.clientWidth, scroll:row.scrollWidth, height:dock.getBoundingClientRect().height, page:document.documentElement.scrollWidth, viewport:document.documentElement.clientWidth }; })()`,
  );
  assert(
    (
      manyActions as {
        scroll: number;
        client: number;
        page: number;
        viewport: number;
      }
    ).scroll > (manyActions as { scroll: number; client: number }).client &&
      Math.abs((manyActions as { height: number }).height - city1024.height) <=
        2 &&
      (manyActions as { page: number; viewport: number }).page <=
        (manyActions as { page: number; viewport: number }).viewport,
    `Action row did not contain overflow: ${JSON.stringify(manyActions)}`,
  );
  await capture(connection, "compact-1024-city-many-actions-synthetic.png");
  await evaluate(
    connection,
    `document.querySelectorAll('[data-review-synthetic="many-actions-layout-only"], [data-review-synthetic="many-actions-row"]').forEach(n=>n.remove())`,
  );
  await evaluate(
    connection,
    `(() => { const n=document.querySelector('.v7-population-value'); if(!n)throw Error('Population missing'); n.lastChild.textContent='-4 / 2'; n.dataset.reviewSynthetic='negative-population-visual-only'; })()`,
  );
  await capture(
    connection,
    "compact-1024-city-negative-population-synthetic.png",
  );
  await viewport(connection, 1440, 900, 2);
  const city1440 = await layout(connection);
  const hud1440 = await evaluate(
    connection,
    `(() => { const coins=document.querySelector('.v7-coins'); return { displayed: coins?.textContent, iconIds: [...(coins?.querySelectorAll('img') ?? [])].map(icon => icon.dataset.assetId) }; })()`,
  );
  assert(
    city1440.horizontal &&
      !city1440.pageOverflow &&
      (hud1440 as { displayed: string }).displayed ===
        (hud as { displayed: string }).displayed &&
      JSON.stringify((hud1440 as { iconIds: string[] }).iconIds) ===
        JSON.stringify(["ui-hud-gold-coin-v7"]),
    `1440 city geometry or HUD failed: ${JSON.stringify({ city1440, hud1440 })}`,
  );
  await capture(connection, "compact-1440-city-dpr2.png");
  await click(connection, '[data-action="tech"]');
  await waitFor(
    connection,
    `document.querySelector('.v7-tech-cost img[data-asset-id="ui-hud-gold-coin-v7"]') !== null`,
  );
  await capture(connection, "compact-1440-tech-costs-dpr2.png");
  await click(connection, '[data-action="close-overlay"]');
  const reward = await evaluate(
    connection,
    `(async () => { const controller=globalThis.__PULP_WARS_APP__.controller; const steps=[]; for(let i=0;i<12 && controller.snapshot().view.pendingChoices.length===0;i++){const s=controller.snapshot(); const command=s.offeredCommands.find(c=>c.kind==='HARVEST_FRUIT'||c.kind==='HUNT_GAME') ?? s.offeredCommands.find(c=>c.kind==='RESEARCH'&&c.tech==='HUNTING') ?? s.offeredCommands.find(c=>c.kind==='END_TURN'); if(!command)break; const result=await controller.dispatch(command);if(!result.accepted)throw Error('Natural reward progression rejected '+command.kind);steps.push(command.kind==='RESEARCH'?command.tech:command.kind);if(command.kind==='END_TURN')await controller.progressAiTurns();}const s=controller.snapshot();return { steps, pending:s.view.pendingChoices.length, coins:s.view.viewer.coins, offered:[...new Set(s.offeredCommands.map(c=>c.kind))], visibleGame:s.view.board.tiles.filter(t=>t.explored&&t.resource==='GAME').length }; })()`,
  );
  assert(
    (reward as { pending: number }).pending > 0,
    `Natural reward fixture unavailable: ${JSON.stringify(reward)}`,
  );
  await waitFor(
    connection,
    `document.querySelector('.v7-mandatory-choice') !== null`,
  );
  const rewardIcons = await evaluate(
    connection,
    `[...document.querySelectorAll('.v7-reward-action img')].map(node=>node.dataset.assetId)`,
  );
  assert(
    (rewardIcons as string[]).length >= 2 &&
      (rewardIcons as string[]).includes("ui-hud-gold-coin-v7"),
    `Reward gold coin missing: ${JSON.stringify(rewardIcons)}`,
  );
  await capture(connection, "compact-1440-reward-dpr2.png");
  const evidence = {
    source: "NATURAL_SEED20_CONTROLLER_WITH_LABELED_SYNTHETIC_LAYOUT_CASES",
    hud,
    hud1440,
    unitHelpControl,
    naturalModifier,
    rightTooltip,
    unit1024,
    city1024,
    manyActions,
    city1440,
    reward,
    rewardIcons,
    help,
    focusReturn,
    canvasBefore,
    canvasAfter: await rect(connection, ".board-canvas-v7"),
  };
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  connection.close();
  console.log(`Ruleset 7 compact economy review passed: ${outputRoot}`);
} finally {
  browser.kill();
}

async function layout(connection: Connection): Promise<{
  height: number;
  horizontal: boolean;
  pageOverflow: boolean;
  actionScroll: number;
  actionClient: number;
}> {
  return evaluate(
    connection,
    `(() => { const dock=document.querySelector('.v7-selection-dock'); const identity=dock?.querySelector('.v7-identity'); const stats=dock?.querySelector('.v7-unit-stats,.v7-city-stats'); const actions=dock?.querySelector('.v7-context-actions'); if(!dock||!identity||!stats) throw Error('Dock parts missing'); const i=identity.getBoundingClientRect(),s=stats.getBoundingClientRect(),a=actions?.getBoundingClientRect(); return {height:dock.getBoundingClientRect().height,horizontal:!a || (i.right <= s.left+1 && s.right <= a.left+1),pageOverflow:document.documentElement.scrollWidth > document.documentElement.clientWidth,actionScroll:actions?.scrollWidth??0,actionClient:actions?.clientWidth??0}; })()`,
  );
}

async function viewport(
  connection: Connection,
  width: number,
  height: number,
  dpr: number,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: width <= 390,
  });
  await delay(120);
}

async function rect(
  connection: Connection,
  selector: string,
): Promise<{ readonly width: number; readonly height: number }> {
  return evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })()`,
  );
}

function assertSameRect(
  expected: { readonly width: number; readonly height: number },
  actual: { readonly width: number; readonly height: number },
): void {
  assert(
    expected.width === actual.width && expected.height === actual.height,
    `Canvas geometry changed: ${JSON.stringify({ expected, actual })}`,
  );
}

async function setValue(
  connection: Connection,
  selector: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLInputElement)) throw new Error('Input missing'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
}

async function click(connection: Connection, selector: string): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); node.scrollIntoView({ block: 'center', inline: 'center' }); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`,
  );
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function key(
  connection: Connection,
  keyValue: string,
  code: string,
): Promise<void> {
  const keyCode: Readonly<Record<string, number>> = {
    Tab: 9,
    Enter: 13,
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Home: 36,
  };
  const windowsVirtualKeyCode = keyCode[code];
  if (windowsVirtualKeyCode === undefined)
    throw new Error(`Unknown key ${code}`);
  await connection.send("Input.dispatchKeyEvent", {
    type: keyValue === "Enter" ? "keyDown" : "rawKeyDown",
    ...(keyValue === "Enter" ? { text: "\r" } : {}),
    key: keyValue,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
}

async function capture(connection: Connection, name: string): Promise<void> {
  await assertImagesDecoded(connection, "img", 0, true);
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(outputRoot, name),
    Buffer.from(response.data, "base64"),
  );
}

async function assertImagesDecoded(
  connection: Connection,
  selector: string,
  expectedCount: number,
  visibleOnly = false,
): Promise<{
  readonly count: number;
  readonly assetIds: readonly string[];
}> {
  const result = await evaluate<{
    readonly count: number;
    readonly assetIds: readonly string[];
    readonly broken: readonly string[];
  }>(
    connection,
    `(async () => { const intersectsViewport = (image) => { const rect = image.getBoundingClientRect(); const style = getComputedStyle(image); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight; }; const images = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((node) => node instanceof HTMLImageElement && (${String(visibleOnly)} ? intersectsViewport(node) : true)); await Promise.all(images.map(async (image) => { try { await image.decode(); } catch { /* Report exact broken state below. */ } })); const broken = images.filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || !image.currentSrc).map((image) => image.dataset.assetId ?? image.getAttribute('src') ?? '(missing source)'); return { count: images.length, assetIds: images.map((image) => image.dataset.assetId ?? '(unlabelled image)'), broken }; })()`,
  );
  if (
    (expectedCount > 0 && result.count !== expectedCount) ||
    result.broken.length > 0
  )
    throw new Error(
      `Image decode contract failed for ${selector}: ${JSON.stringify(result)}`,
    );
  return { count: result.count, assetIds: result.assetIds };
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
      readonly text?: string;
    };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (
      await evaluate<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`Chrome timed out waiting for ${expression}`);
}

async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
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
      // Chrome may not have opened its debugging port yet.
    }
    await delay(100);
  }
  throw new Error("Chrome debugging target did not become ready");
}

async function connect(webSocketUrl: string): Promise<Connection> {
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
      readonly method: string;
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
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
