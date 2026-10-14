/**
 * What a ground sampled by map place costs the board to draw
 * (docs/art/TEXTURED_GROUNDS.md). The real game in a muted headless Chrome
 * over a 16 x 16 map that is all one faction's land, redrawn many times,
 * on each server named: the one of this checkout, and to compare one of a
 * checkout whose ground is tiles (with this file's scenes module copied to
 * the same path). No match is played and no PixelLab call is made.
 *
 *   npx vite --host localhost --port 6593 --strictPort &
 *   CHROME_PATH=... npx tsx scripts/art/textured-grounds/draw-timing.ts \
 *     [http://localhost:6593/ [http://localhost:6594/]]
 */
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  connect,
  evaluate,
  mountExpression,
  waitFor,
} from "../look-switch-review";

const MODULE = "scripts/art/faction-grounds/review-scenes.ts";
const REDRAWS = 400;
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const bases =
    process.argv.length > 2
      ? process.argv.slice(2)
      : ["http://localhost:6593/"];
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  const port = 10_700 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "textured-timing-"));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
      "--hide-scrollbars",
      "--no-first-run",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const targets = (await (
          await fetch(`http://localhost:${port}/json/list`)
        ).json()) as { type: string; webSocketDebuggerUrl: string }[];
        target = targets.find((item) => item.type === "page");
      } catch {
        // Chrome is still starting.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined) throw new Error("Chrome did not start");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // DRAW_TIMING_SCENES (comma-separated) times some scenes only.
    for (const scene of process.env.DRAW_TIMING_SCENES?.split(",") ?? [
      "sceneMartianField",
      "sceneDwarfField",
      "sceneNeutralField",
      "sceneUndeadField",
      "sceneDinosaurField",
      "sceneGoblinField",
    ])
      for (const round of [0, 1, 2])
        for (const base of bases) {
          const url = new URL(base);
          url.searchParams.set("art", "chibi");
          await evaluate(connection, `globalThis.__TIMING_OLD__ = true`).catch(
            () => undefined,
          );
          await connection.send("Page.navigate", { url: url.href });
          await waitFor(
            connection,
            `globalThis.__TIMING_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
          );
          await evaluate(connection, mountExpression(MODULE, scene));
          await waitFor(
            connection,
            `document.querySelector('canvas.board-canvas-v7') !== null`,
          );
          // The art loads asynchronously; time only steady redraws.
          await delay(2500);
          const milliseconds = await evaluate<number>(
            connection,
            `(() => {
              const host = globalThis.__SWITCH_REVIEW__.boardHost;
              for (let i = 0; i < 20; i += 1) { host.zoom('IN'); host.zoom('OUT'); }
              const started = performance.now();
              for (let i = 0; i < ${REDRAWS / 2}; i += 1) { host.zoom('IN'); host.zoom('OUT'); }
              return (performance.now() - started) / ${REDRAWS};
            })()`,
          );
          console.log(
            `${scene} round ${round + 1} ${base}: ${milliseconds.toFixed(3)} ms a redraw`,
          );
        }
    connection.close();
  } finally {
    browser.kill();
  }
}

await main();
