import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";

/**
 * Phone UI review (bead pulp_wars-eu3r.9). It walks every Ruleset 7 screen
 * and panel at phone sizes, 390 x 844 at DPR 2 and 320 x 720 at DPR 2 in
 * portrait, and the match scenes also at 844 x 390 in landscape: the title
 * and main menu, the new-game screen (modes, tribe picker, nine seats, and
 * the Cult's own setup with the AIs allied and a head start),
 * the tribe stars, the campaign and a briefing, settings, every Gallery tab
 * with a unit and a curiosity detail, the loading screen, the HUD with the
 * coach line, the match menu, the leaderboard with a score breakdown, the
 * Perfection HUD, the technology tree and a technology, Help, settings and
 * achievements in a match, the city, unit and tile docks of the factions
 * with the longest names and ability lists (the giants, Candy, Ice Folk,
 * Dwarves, Goblins, Undead with the Vampire and the Banshee, Martians,
 * Dinosaurs, ships) with the unit glossary and a recruit's details, the
 * abilities being aimed (Kaboom!, Wail, Freeze, Cold Snap, Sugar Toss,
 * Assemble, Tunnel, Goblin Toss, Thunder Stomp), the curiosities' tiles, the reward choices of the reward ladder
 * (level 2 and the giant at level 6), Bomb Run aiming, the Wishing Well,
 * and the end of a match (Domination victory with its grade, Perfection
 * defeat, a flawless victory and a nine-player victory, each with a
 * breakdown open). The Cultists and nine seats (bead pulp_wars-mch9.20;
 * scenes `cult-*`, `setup-cult-allied`, `end-nine-players`): a new
 * nine-player game as the Cult before any command, its leaderboard with
 * nine rows (rivals, and the AIs allied with a head start), and its
 * technology tree. The tutorial (bead pulp_wars-0yxy; scenes `tutorial-*`):
 * its line at each of its eight steps, with the step's unit, city or tile
 * picked, the technology screen of its research step, and the farewell.
 * Tile actions (bead pulp_wars-2yc.60; scenes `tile-actions-*`): a Human
 * Knight, a Cult Hexer (and the chooser of its Attack and Ribbit on one
 * Knight), an Ice Folk Yeti's Freeze, a Martian Brain's Mind Control and
 * a Stargazer's compact star badges.
 *
 * Every state is hand-built (tests/fixtures/v7-*-ui.ts and the score
 * fixtures); no AI runs and no match is played. It needs the Vite dev
 * server, because the fixtures are imported from `tests/fixtures`.
 *
 * Each scene is captured at each size and checked in the page for: a page
 * that scrolls sideways; text outside the screen; text cut off by its box
 * (an intended ellipsis is reported but passes); text or art that spills
 * out of its button; overlapping buttons; overlapping text; and a panel
 * that scrolls sideways where it should not. The findings are written to
 * `findings.json`, and the run fails when any check fails.
 *
 * Usage: tsx scripts/browser-phone-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>] [--only=menu,setup,...] [--sizes=p390,p360,p320,l844]
 *   [--report-only]
 * `--sizes=d1440` adds a 1440 x 900 desktop capture of the named scenes;
 * `d1280` (1280 x 720) and `d1920` (1920 x 1080) add the other desktops.
 */

interface DebugTarget {
  readonly type: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): void;
  close(): void;
}
interface Coord {
  readonly x: number;
  readonly y: number;
}
interface Size {
  readonly name:
    "p390" | "p360" | "p320" | "l844" | "d1280" | "d1440" | "d1920";
  readonly width: number;
  readonly height: number;
  /** Captured only when `--sizes` names it (the desktop comparison). */
  readonly onRequest?: boolean;
}
interface Problem {
  readonly check: string;
  readonly fails: boolean;
  readonly detail: string;
}
interface Scene {
  readonly name: string;
  /** Match scenes are also captured in landscape. */
  readonly match: boolean;
  /** Selectors of panels meant to scroll sideways (the Gallery's tables). */
  readonly sideways?: readonly string[];
  /** Captures the whole page height (front screens that scroll). */
  readonly full?: boolean;
  run(connection: Connection): Promise<void>;
}

const SIZES: readonly Size[] = [
  { name: "p390", width: 390, height: 844 },
  { name: "p360", width: 360, height: 640 },
  { name: "p320", width: 320, height: 720 },
  { name: "l844", width: 844, height: 390 },
  // A desktop window, for a side-by-side look at a front screen (bead
  // pulp_wars-2yc.44); not one of the phone sizes.
  { name: "d1440", width: 1440, height: 900, onRequest: true },
  // The technology tree's other desktops (bead pulp_wars-2yc.66).
  { name: "d1280", width: 1280, height: 720, onRequest: true },
  { name: "d1920", width: 1920, height: 1080, onRequest: true },
];

const args = process.argv.slice(2);
const baseUrl = new URL(
  args.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const only = args
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",");
const sizes = args
  .find((argument) => argument.startsWith("--sizes="))
  ?.slice("--sizes=".length)
  .split(",");
const reportOnly = args.includes("--report-only");
const output = await prepareSmokeOutput({
  args,
  name: "phone-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-phone-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 11_120 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-phone-ui-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=844,844",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const REVIEW = "globalThis.__PHONE_REVIEW__";
const errors: string[] = [];
const findings: Record<string, readonly Problem[]> = {};

/** The places of the tutorial board (src/render/tutorial-v7.ts). */
const TUTORIAL_PLACE = {
  capital: { x: 2, y: 8 },
  fruit: { x: 1, y: 9 },
  walker: { x: 4, y: 8 },
  village: { x: 5, y: 8 },
  attacker: { x: 3, y: 7 },
} as const;

/** A tutorial scene: its name, the step, and what is done after mounting. */
const TUTORIAL_SCENES: readonly (readonly [
  string,
  string,
  ((connection: Connection) => Promise<void>)?,
])[] = [
  ["tutorial-research", "RESEARCH"],
  ["tutorial-research-tech", "RESEARCH", (c) => click(c, "tech")],
  [
    "tutorial-research-detail",
    "RESEARCH",
    async (c) => {
      await click(c, "tech");
      await click(c, "tech-gathering");
    },
  ],
  ["tutorial-harvest", "HARVEST"],
  [
    "tutorial-harvest-picked",
    "HARVEST",
    (c) => activate(c, TUTORIAL_PLACE.fruit),
  ],
  ["tutorial-resources", "RESOURCES"],
  ["tutorial-move", "MOVE"],
  ["tutorial-move-picked", "MOVE", (c) => activate(c, TUTORIAL_PLACE.walker)],
  ["tutorial-train", "TRAIN"],
  [
    "tutorial-train-picked",
    "TRAIN",
    (c) => activate(c, TUTORIAL_PLACE.capital),
  ],
  ["tutorial-attack", "ATTACK"],
  [
    "tutorial-attack-picked",
    "ATTACK",
    (c) => activate(c, TUTORIAL_PLACE.attacker),
  ],
  ["tutorial-end-turn", "END_TURN"],
  ["tutorial-capture", "CAPTURE"],
  [
    "tutorial-capture-picked",
    "CAPTURE",
    (c) => activate(c, TUTORIAL_PLACE.village),
  ],
  [
    "tutorial-farewell",
    "CAPTURE",
    async (c) => {
      await activate(c, TUTORIAL_PLACE.village);
      await click(c, "command-capture");
      await delay(2_500);
    },
  ],
];

const SCENES: readonly Scene[] = [
  // ---------- Front screens ----------
  {
    name: "menu",
    match: false,
    run: async (c) => {
      await front(c);
    },
  },
  {
    name: "setup",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "new-game");
    },
  },
  {
    name: "setup-9-seats-perfection",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "new-game");
      await click(c, "game-mode-perfection");
      await click(c, "tribe-dwarf");
      await click(c, "seed-mode-seed");
      // The most opponents the form offers, so every seat card shows.
      await evaluate(
        c,
        `(() => { const select = Array.from(document.querySelectorAll('.v7-setup-form select')).find((node) => node.closest('label')?.textContent?.toLowerCase().includes('opponents')); if (!(select instanceof HTMLSelectElement)) return; select.value = select.options[select.options.length - 1].value; select.dispatchEvent(new Event('change', { bubbles: true })); select.dispatchEvent(new Event('input', { bubbles: true })); })()`,
      );
      await delay(500);
    },
  },
  {
    // The Cult's own setup (`pulp_wars-mch9.20`): the Cult tribe chosen,
    // eight opponents allied against it, with the largest head start.
    name: "setup-cult-allied",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "new-game");
      await click(c, "tribe-cult");
      await evaluate(
        c,
        `(() => { const set = (id, value) => { const select = document.querySelector(id); if (!(select instanceof HTMLSelectElement)) throw new Error('no ' + id); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }; const count = document.querySelector('#v7-ai-count'); set('#v7-ai-count', count.options[count.options.length - 1].value); set('#v7-ai-mode', 'COOPERATIVE'); set('#v7-ai-head-start', '20'); })()`,
      );
      await delay(500);
    },
  },
  {
    // AI head start (`pulp_wars-w49.39`): the longest choice selected.
    name: "setup-ai-head-start",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "new-game");
      await evaluate(
        c,
        `(() => { const select = document.querySelector('#v7-ai-head-start'); if (!(select instanceof HTMLSelectElement)) throw new Error('no AI head start control'); select.value = '20'; select.dispatchEvent(new Event('change', { bubbles: true })); select.scrollIntoView({ block: 'center' }); })()`,
      );
      await delay(400);
    },
  },
  {
    name: "tribe-stars",
    match: false,
    run: async (c) => {
      await front(c);
      await click(c, "new-game");
      await click(c, "star-rules");
    },
  },
  {
    name: "campaign",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "campaign");
    },
  },
  {
    // The campaign map with the testing cheat on (`pulp_wars-hmyk.3`): its
    // badge beside the title, and a tapped closed plate's note.
    name: "campaign-map-cheat",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "campaign");
      // The cheat's word, typed on the campaign screen.
      await evaluate(
        c,
        `[...'pulpwars'].forEach((key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })))`,
      );
      await click(c, "campaign-open-candy");
    },
  },
  {
    // The prologue's mission list, opened from its plate on the map.
    name: "campaign-frontier",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
    },
  },
  {
    name: "campaign-briefing",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
      await click(c, "mission-frontier_4");
      await click(c, "mission-frontier_1");
    },
  },
  {
    // The roster with progress (`pulp_wars-v642.1`): three missions won
    // with one, two and three stars, the fourth open, the rest to come.
    name: "campaign-progress",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await evaluate(c, CAMPAIGN_PROGRESS);
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
    },
  },
  {
    // A briefing with a faction choice, star goals and an unlock.
    name: "campaign-briefing-choice",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await evaluate(c, CAMPAIGN_PROGRESS);
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
      await click(c, "mission-frontier_4");
    },
  },
  // Missions 7 and 8 (`pulp_wars-v642.3`): the briefing of each (opened
  // from the roster with the missions before it won), its first turn with
  // the tracker and the marks, and its Victory dialog.
  ...(
    [
      ["mission-7-briefing", "frontier_7", 6],
      ["mission-8-briefing", "frontier_8", 7],
    ] as const
  ).map(([name, card, won]): Scene => ({
    name,
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await evaluate(c, campaignProgressThrough(won));
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
      await click(c, `mission-${card}`);
    },
  })),
  ...(
    [
      ["mission-7-hud", "FRONTIER_7", "null"],
      [
        "mission-7-victory",
        "FRONTIER_7",
        "{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: 'PLACES_CAPTURED' }",
      ],
      ["mission-8-hud", "FRONTIER_8", "null"],
      [
        "mission-8-victory",
        "FRONTIER_8",
        "{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: 'TARGETS_KILLED' }",
      ],
    ] as const
  ).map(([name, mission, outcome]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        missionState(mission, outcome),
      );
    },
  })),
  // Missions 9 and 10 (`pulp_wars-v642.4`): the briefing of a mission
  // with an ally and two opponents.
  ...(["frontier_9", "frontier_10"] as const).map((mission): Scene => ({
    name: `campaign-briefing-${mission.replace("frontier_", "m")}`,
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await evaluate(c, CAMPAIGN_PROGRESS_NINE);
      await click(c, "campaign");
      await click(c, "campaign-open-frontier");
      await click(c, `mission-${mission}`);
    },
  })),
  // A mission in play: the objective tracker and the board's marks; and
  // the mission's Victory and Defeat dialogs.
  ...(
    [
      // Missions 9 and 10 (`pulp_wars-v642.4`): four seats, an ally, a
      // place to hold or to take, and the win dialog of each.
      ["mission-hud-m9", "FRONTIER_9", "null"],
      ["mission-hud-m10", "FRONTIER_10", "null"],
      [
        "mission-victory-m9",
        "FRONTIER_9",
        "{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: 'SURVIVED' }",
      ],
      [
        "mission-victory-m10",
        "FRONTIER_10",
        "{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: 'PLACES_CAPTURED' }",
      ],
      ["mission-hud-capture", "FRONTIER_2", "null"],
      ["mission-hud-escort", "TEST_ESCORT", "null"],
      ["mission-hud-deadline", "TEST_CAPTURE", "null"],
      ["mission-hud-survive", "TEST_SURVIVE", "null"],
      ["mission-hud-kill", "TEST_KILL", "null"],
      [
        "mission-victory",
        "FRONTIER_2",
        "{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: 'PLACES_CAPTURED' }",
      ],
      [
        "mission-defeat",
        "FRONTIER_4",
        "{ kind: 'DEFEAT', humanId: live.humanPlayerId, defeatedByPlayerId: live.players[1].id }",
      ],
    ] as const
  ).map(([name, mission, outcome]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        missionState(mission, outcome),
      );
    },
  })),
  // Missions 5 and 6 (`pulp_wars-v642.2`): each one's briefing, its first
  // turn with the tracker and the marks, and both of its end dialogs.
  ...(
    [
      ["frontier-5", "FRONTIER_5", 4, "ESCORT_ARRIVED", "ESCORT_LOST"],
      ["frontier-6", "FRONTIER_6", 5, "SURVIVED", "PLACE_LOST"],
    ] as const
  ).flatMap(([slug, mission, wonBefore, won, lost]): Scene[] => [
    {
      name: `campaign-briefing-${slug}`,
      match: false,
      full: true,
      run: async (c) => {
        await front(c);
        await evaluate(c, campaignProgressThrough(wonBefore));
        await click(c, "campaign");
        await click(c, "campaign-open-frontier");
        await click(c, `mission-${mission.toLowerCase()}`);
      },
    },
    ...(
      [
        ["hud", "null"],
        [
          "victory",
          `{ kind: 'VICTORY', winnerId: live.humanPlayerId, cause: '${won}' }`,
        ],
        [
          "defeat",
          `{ kind: 'DEFEAT', humanId: live.humanPlayerId, defeatedByPlayerId: live.players[1].id, cause: '${lost}' }`,
        ],
      ] as const
    ).map(([what, outcome]): Scene => ({
      name: `mission-${what}-${slug}`,
      match: true,
      run: async (c) => {
        await mount(
          c,
          "/tests/fixtures/v7-score-ui.ts",
          "null",
          missionState(mission, outcome),
        );
      },
    })),
  ]),
  {
    name: "settings",
    match: false,
    full: true,
    run: async (c) => {
      await front(c);
      await click(c, "front-settings");
    },
  },
  ...(["units", "buildings", "terrain", "curiosities", "sounds"] as const).map(
    (tab): Scene => ({
      name: `gallery-${tab}`,
      match: false,
      // The faction tables are a grid of nine columns: they scroll inside
      // their frame with the first column and the header fixed.
      ...(tab === "units" || tab === "buildings" || tab === "terrain"
        ? { sideways: [".v7-gallery-scroll"] }
        : {}),
      run: async (c) => {
        await front(c);
        await click(c, "gallery");
        await click(c, `gallery-tab-${tab}`);
        await delay(800);
      },
    }),
  ),
  {
    name: "gallery-filters",
    match: false,
    sideways: [".v7-gallery-scroll"],
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      await evaluate(
        c,
        `document.querySelector('.v7-gallery-filters')?.setAttribute('open', '')`,
      );
      await delay(300);
    },
  },
  // The Monuments (bead pulp_wars-2yc.44): eight rows by every faction.
  ...(["MONUMENT", "MONUMENT_LAND_BARON"] as const).map((row): Scene => ({
    name: row === "MONUMENT" ? "gallery-monuments" : "gallery-monuments-lower",
    match: false,
    sideways: [".v7-gallery-scroll"],
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      await click(c, "gallery-tab-buildings");
      await delay(800);
      // The row's head under the sticky faction header.
      await evaluate(
        c,
        `(() => { const scroll = document.querySelector('.v7-gallery-scroll'); const row = document.querySelector('.v7-gallery-table tr[data-row="${row}"]'); const head = document.querySelector('.v7-gallery-table thead'); if (scroll === null || row === null || head === null) throw new Error('no Monument row'); row.scrollIntoView({ block: 'start' }); scroll.scrollTop -= head.getBoundingClientRect().height; })()`,
      );
      await delay(600);
    },
  })),
  {
    name: "gallery-monuments-right",
    match: false,
    sideways: [".v7-gallery-scroll"],
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      await click(c, "gallery-tab-buildings");
      await delay(800);
      // The last factions' columns of the same rows.
      await evaluate(
        c,
        `(() => { const scroll = document.querySelector('.v7-gallery-scroll'); const row = document.querySelector('.v7-gallery-table tr[data-row="MONUMENT"]'); const head = document.querySelector('.v7-gallery-table thead'); if (scroll === null || row === null || head === null) throw new Error('no Monument row'); row.scrollIntoView({ block: 'start' }); scroll.scrollTop -= head.getBoundingClientRect().height; scroll.scrollLeft = scroll.scrollWidth; })()`,
      );
      await delay(600);
    },
  },
  {
    name: "gallery-monument-detail",
    match: false,
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      await click(c, "gallery-tab-buildings");
      await evaluate(
        c,
        `document.querySelector('[data-action="gallery-open-building"][data-row="MONUMENT_LAND_BARON"][data-faction="ICE_FOLK"]')?.click()`,
      );
      await delay(1_200);
    },
  },
  {
    name: "gallery-unit-detail",
    match: false,
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      // The Dwarf Engineer: a long ability list.
      await evaluate(
        c,
        `Array.from(document.querySelectorAll('[data-action="gallery-open-unit"]')).find((node) => node.textContent?.includes('Engineer'))?.click()`,
      );
      await delay(1_200);
    },
  },
  {
    name: "gallery-curiosity-detail",
    match: false,
    run: async (c) => {
      await front(c);
      await click(c, "gallery");
      await click(c, "gallery-tab-curiosities");
      await evaluate(
        c,
        `Array.from(document.querySelectorAll('[data-action="gallery-open-curiosity"]')).find((node) => node.textContent?.includes('Wishing'))?.click()`,
      );
      await delay(1_200);
    },
  },
  {
    name: "loading",
    match: false,
    run: async (c) => {
      await front(c);
      await evaluate(
        c,
        `(async () => {
          const { mountLoadingScreenV7 } = await import('/src/render/dom/loading-screen-v7.ts');
          globalThis.__PULP_WARS_APP__?.destroy();
          const root = document.querySelector('#app');
          root.replaceChildren();
          mountLoadingScreenV7(document, root, { motion: 'REDUCED' }).update({ settled: 37, total: 100 });
        })()`,
        true,
      );
      await delay(400);
    },
  },
  // ---------- The match ----------
  {
    name: "hud-coach",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scoreDominationLiveFixtureV7()",
      );
    },
  },
  // The tutorial (bead pulp_wars-0yxy): its line at every step, with what
  // the step asks for picked, the technology screen of the research step,
  // and the farewell after the capture. Each state is the tutorial board
  // with the script's commands applied; no AI runs.
  ...TUTORIAL_SCENES.map(([name, step, after]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-tutorial-ui.ts",
        `tutorialFixtureV7('${step}').state`,
        undefined,
        `fixtures.tutorialFixtureV7('${step}').storage`,
      );
      await after?.(c);
    },
  })),
  {
    name: "match-menu",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scoreDominationLiveFixtureV7()",
      );
      await click(c, "compact-menu");
    },
  },
  {
    name: "leaderboard-breakdown",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scoreDominationLiveFixtureV7()",
      );
      await click(c, "compact-menu");
      await click(c, "leaderboard");
      await evaluate(
        c,
        `document.querySelector('.v7-leaderboard-row[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
      );
      await delay(500);
    },
  },
  // The alliance setting (bead pulp_wars-2yc.45): "AIs allied" with the
  // team mark on every AI row, in turn order and in Perfection's ranking.
  ...(
    [
      ["leaderboard-allied", "scoreDominationAlliedFixtureV7()"],
      ["leaderboard-allied-perfection", "scorePerfectionAlliedFixtureV7()"],
    ] as const
  ).map(([name, fixture]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-score-ui.ts", fixture);
      await click(c, "compact-menu");
      await click(c, "leaderboard");
      await delay(500);
    },
  })),
  // The Cultists and nine seats (bead pulp_wars-mch9.20): a new nine-player
  // game as the Cult, before any command.
  {
    name: "cult-first-turn",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-score-ui.ts", "null", nineSeatCult());
    },
  },
  {
    name: "cult-leaderboard-nine",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-score-ui.ts", "null", nineSeatCult());
      await click(c, "compact-menu");
      await click(c, "leaderboard");
      await evaluate(
        c,
        `document.querySelector('.v7-leaderboard-row[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
      );
      await delay(500);
    },
  },
  {
    name: "cult-leaderboard-nine-allied",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        nineSeatCult("COOPERATIVE", 20),
      );
      await click(c, "compact-menu");
      await click(c, "leaderboard");
      await delay(500);
    },
  },
  {
    name: "cult-tech-tree",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-score-ui.ts", "null", nineSeatCult());
      await click(c, "tech");
      await delay(500);
    },
  },
  {
    name: "hud-perfection",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scorePerfectionLiveFixtureV7()",
      );
    },
  },
  {
    name: "tech-tree",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-dwarf-ui.ts", "dwarfUiFixtureV7()");
      await click(c, "tech");
      await delay(500);
    },
  },
  {
    name: "tech-interaction",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        nineSeatFaction("ORIGINAL"),
      );
      await click(c, "tech");
      await delay(300);
      const result: Record<string, boolean> = {};

      const roots = ["gathering", "hunting", "scouting", "drill", "shorecraft"];
      for (const root of roots) {
        await physicalTap(c, `[data-action="tech-${root}"]`);
        result[`fitTap${root}`] = await exists(c, ".v7-tech-detail");
        if (root === "gathering") {
          result.researchButtonPresent = await exists(
            c,
            '[data-action="research-gathering"]',
          );
          if (result.researchButtonPresent)
            await physicalTap(c, '[data-action="research-gathering"]');
          await delay(600);
          result.pointerResearchApplied = await evaluate(
            c,
            `document.querySelector('[data-action="tech-gathering"]')?.classList.contains('state-owned') === true`,
          );
        } else if (result[`fitTap${root}`]) {
          await physicalKey(c, "Escape", "Escape", 27);
          result[`escapeRestored${root}`] = await evaluate(
            c,
            `document.activeElement?.getAttribute('data-action') === 'tech-${root}' && document.querySelector('.v7-tech-detail') === null`,
          );
        }
      }

      const beforeDrag = await stageTransform(c);
      // From the empty ground at the bottom right (the zoom controls float
      // over the top left).
      await physicalDrag(c, ".v7-tech-graph", 0.92, 0.92, 0.75, 0.78);
      result.pointerDragPanned = (await stageTransform(c)) !== beforeDrag;
      result.pointerDragDidNotOpenDetail = !(await exists(
        c,
        ".v7-tech-detail",
      ));
      await physicalTap(c, '[data-action="tech-hunting"]');
      result.tapAfterDragOpenedDetail = await exists(c, ".v7-tech-detail");
      if (result.tapAfterDragOpenedDetail)
        await physicalKey(c, "Escape", "Escape", 27);
      await physicalTap(c, '[data-action="tech-fit"]');

      const beforePinch = await zoom(c);
      await physicalPinch(c, ".v7-tech-graph");
      result.touchPinchZoomed =
        (await zoom(c)) > beforePinch && !(await exists(c, ".v7-tech-detail"));
      const beforeWheel = await zoom(c);
      await physicalWheel(c, ".v7-tech-graph", -180);
      result.wheelZoomed = (await zoom(c)) > beforeWheel;
      await physicalTap(c, '[data-action="tech-fit"]');
      result.fitButtonReset = (await zoom(c)) === 1;

      await evaluate(c, `document.querySelector('.v7-tech-graph')?.focus()`);
      const beforeKeyboard = await stageTransform(c);
      await physicalKey(c, "ArrowRight", "ArrowRight", 39);
      await physicalKey(c, "+", "Equal", 187);
      result.keyboardPanZoomed =
        (await stageTransform(c)) !== beforeKeyboard && (await zoom(c)) > 1;
      const zoomBeforeResize = await zoom(c);
      await rawViewport(c, 390, 844);
      result.resizePreservedZoom = (await zoom(c)) === zoomBeforeResize;
      await rawViewport(c, 360, 640);
      await physicalKey(c, "f", "KeyF", 70);
      result.keyboardFitReset = (await zoom(c)) === 1;
      await evaluate(
        c,
        `${REVIEW}.techInteraction = ${JSON.stringify(result)}`,
      );
      const failed = Object.entries(result).filter(([, passed]) => !passed);
      if (failed.length > 0)
        throw new Error(
          `Technology interaction failures: ${failed.map(([name]) => name).join(", ")} ${JSON.stringify(result)}`,
        );
      await delay(300);
    },
  },
  ...(
    [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
      "CULT",
    ] as const
  ).map((faction): Scene => ({
    name: `tech-tree-${faction.toLowerCase().replaceAll("_", "-")}`,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        nineSeatFaction(faction),
      );
      await click(c, "tech");
      await delay(500);
    },
  })),
  ...(["ORIGINAL", "CULT", "GOBLIN", "CANDY"] as const).flatMap(
    (faction): Scene[] => [
      {
        // Zoomed in until every name and price shows (bead pulp_wars-2yc.58).
        name: `tech-zoom-${faction.toLowerCase()}`,
        match: true,
        run: async (c) => {
          await mount(
            c,
            "/tests/fixtures/v7-score-ui.ts",
            "null",
            nineSeatFaction(faction),
          );
          await click(c, "tech");
          await delay(300);
          for (let step = 0; step < 12; step += 1) {
            if (
              await evaluate(
                c,
                `document.querySelector('.v7-tech-stage')?.getAttribute('data-labels') === 'show'`,
              )
            )
              break;
            await click(c, "tech-zoom-in");
          }
          await delay(300);
        },
      },
      {
        // A tier-2 technology's popup over the fitted tree.
        name: `tech-popup-${faction.toLowerCase()}`,
        match: true,
        run: async (c) => {
          await mount(
            c,
            "/tests/fixtures/v7-score-ui.ts",
            "null",
            nineSeatFaction(faction),
          );
          await click(c, "tech");
          await delay(300);
          await click(c, "tech-roads");
          await delay(500);
        },
      },
    ],
  ),
  {
    name: "tech-detail",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scoreDominationLiveFixtureV7()",
      );
      await click(c, "tech");
      await evaluate(
        c,
        `Array.from(document.querySelectorAll('[data-action^="tech-"]:not([data-action="tech-branch-select"])')).at(-1)?.click()`,
      );
      await delay(600);
    },
  },
  ...(["help", "settings", "achievements"] as const).map((item): Scene => ({
    name: `match-${item}`,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "scoreDominationLiveFixtureV7()",
      );
      await click(c, "compact-menu");
      await click(c, item);
      await delay(400);
    },
  })),
  {
    name: "city-dock",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-dwarf-ui.ts", "dwarfUiFixtureV7()");
      await activate(c, await ownCapital(c));
    },
  },
  {
    name: "city-recruit-help",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-dwarf-ui.ts", "dwarfUiFixtureV7()");
      await activate(c, await ownCapital(c));
      await evaluate(
        c,
        `document.querySelector('[data-action^="train-help-"]')?.click()`,
      );
      await delay(500);
    },
  },
  ...(
    [
      ["giant-juggernaut", "giantsCrushFixtureV7()", "crush", "juggernaut"],
      [
        "giant-abomination",
        "giantsSwallowFixtureV7()",
        "swallow",
        "abomination",
      ],
      ["giant-troll", "giantsTossFixtureV7()", "toss", "troll"],
      ["giant-brontosaurus", "giantsStompFixtureV7()", "stomp", "brontosaurus"],
      [
        "giant-colossus",
        "giantsOverstrideFixtureV7()",
        "overstride",
        "colossus",
      ],
      ["giant-frost", "giantsGlacialFixtureV7()", "glacial", "frostGiant"],
      ["giant-titan", "giantsSiegeFixtureV7()", "siege", "titan"],
    ] as const
  ).map(([name, fixture, group, unit]): Scene => ({
    name: `dock-${name}`,
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-giants-ui.ts", fixture);
      await activate(c, await fixtureCoord(c, `GIANTS_UI_V7.${group}.${unit}`));
    },
  })),
  {
    // AI head start (`pulp_wars-w49.39`): a match's Settings say what it
    // was started with.
    name: "match-settings-ai-head-start",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "",
        `(() => { const base = fixtures.scoreDominationLiveFixtureV7(); const next = engine.parseGameStateV7(JSON.parse(JSON.stringify({ ...base, setup: { ...base.setup, aiHeadStart: { coins: 20 } } }))); if (next === null) throw new Error('head start state refused'); return next; })()`,
      );
      await click(c, "compact-menu");
      await click(c, "settings");
      await evaluate(
        c,
        `document.querySelector('.v7-match-ai-head-start')?.scrollIntoView({ block: 'end' })`,
      );
      await delay(400);
    },
  },
  {
    name: "dock-giant-glossary",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-giants-ui.ts",
        "giantsTossFixtureV7()",
      );
      await activate(c, await fixtureCoord(c, "GIANTS_UI_V7.toss.troll"));
      await click(c, "unit-help");
      await delay(400);
    },
  },
  ...(
    [
      ["candy-confectioner", "confectioner"],
      ["candy-trooper", "trooper"],
      ["candy-stuck-enemy", "stuckEnemy"],
    ] as const
  ).map(([name, unit]): Scene => ({
    name: `dock-${name}`,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-candy-ui.ts",
        "candyRedesignFixtureV7()",
      );
      await activate(c, await fixtureCoord(c, `CANDY_REDESIGN_V7.${unit}`));
    },
  })),
  {
    name: "dock-candy-glossary",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-candy-ui.ts",
        "candyRedesignFixtureV7()",
      );
      await activate(
        c,
        await fixtureCoord(c, "CANDY_REDESIGN_V7.confectioner"),
      );
      await click(c, "unit-help");
      await delay(400);
    },
  },
  ...(
    [
      ["ice-witch", "witch"],
      ["ice-mammoth", "mammoth"],
      ["ice-giant", "giant"],
      ["ice-frozen-enemy", "frozenEnemy"],
    ] as const
  ).map(([name, unit]): Scene => ({
    name: `dock-${name}`,
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-ice-folk-ui.ts",
        "iceFolkUiFixtureV7()",
      );
      await activate(c, await fixtureCoord(c, `ICE_FOLK_UI_V7.${unit}`));
    },
  })),
  ...(
    [
      ["dwarf-engineer", "engineer"],
      ["dwarf-gyrocopter", "gyrocopter"],
      ["dwarf-mole", "mole"],
      ["dwarf-mound", "mound"],
      ["dwarf-titan", "titan"],
    ] as const
  ).map(([name, unit]): Scene => ({
    name: `dock-${name}`,
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-dwarf-ui.ts", "dwarfUiFixtureV7()");
      await activate(c, await fixtureCoord(c, `DWARF_UI_V7.${unit}`));
    },
  })),
  {
    name: "dwarf-bomb-run-landings",
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-dwarf-ui.ts", "dwarfUiFixtureV7()");
      await activate(c, await fixtureCoord(c, "DWARF_UI_V7.gyrocopter"));
      await click(c, "dwarf-bomb-run");
      await delay(400);
      await evaluate(
        c,
        `${REVIEW}.boardHost.activate(${REVIEW}.fixtures.DWARF_UI_V7.bombTarget)`,
      );
      await delay(700);
    },
  },
  // Tile actions (bead pulp_wars-2yc.60): a selected unit's action badges
  // (a Human Knight has none, its Moves and Attacks keep their marks), and
  // the chooser of a tile with an Attack and a Ribbit.
  ...(
    [
      ["knight", "tileActionsKnightFixtureV7", "knight", null],
      ["hexer", "tileActionsHexerFixtureV7", "hexer", null],
      ["hexer-chooser", "tileActionsHexerFixtureV7", "hexer", "hexed"],
      ["yeti", "tileActionsYetiFixtureV7", "yeti", null],
      ["brain", "tileActionsBrainFixtureV7", "brain", null],
      ["stargazer", "tileActionsStargazerFixtureV7", "stargazer", null],
    ] as const
  ).map(([name, fixture, unit, tile]): Scene => ({
    name: `tile-actions-${name}`,
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-tile-actions-ui.ts", `${fixture}()`);
      await activate(c, await fixtureCoord(c, `TILE_ACTIONS_UI_V7.${unit}`));
      if (tile !== null) {
        await evaluate(
          c,
          `${REVIEW}.boardHost.activate(${REVIEW}.fixtures.TILE_ACTIONS_UI_V7.${tile})`,
        );
        await delay(500);
      }
    },
  })),
  {
    name: "barricade-attack",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-dwarf-ui.ts",
        "dwarfBarricadeVictimFixtureV7()",
      );
      await activate(
        c,
        await fixtureCoord(c, "DWARF_BARRICADE_VICTIM_V7.fighter"),
      );
      // The cursor on the whole Barricade: the attack bracket and its HP.
      await keys(c, ["ArrowRight", "ArrowUp"]);
      await delay(400);
    },
  },
  {
    name: "barricade-tile",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-dwarf-ui.ts",
        "dwarfBarricadeVictimFixtureV7()",
      );
      await activate(
        c,
        await fixtureCoord(c, "DWARF_BARRICADE_VICTIM_V7.wholeBarricade"),
      );
    },
  },
  {
    name: "wishing-well",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-curiosities-round2-ui.ts",
        "round2SaucerUiFixtureV7()",
      );
      await activate(c, await fixtureCoord(c, "ROUND2_UI_V7.pilgrim"));
    },
  },
  {
    name: "saucer-camp",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-curiosities-round2-ui.ts",
        "round2SaucerUiFixtureV7()",
      );
      await activate(c, await fixtureCoord(c, "ROUND2_UI_V7.camp"));
    },
  },
  // ---------- More factions: docks, ability buttons and aiming ----------
  ...(
    [
      // Goblins.
      [
        "dock-goblin-kaboom",
        "v7-goblin-ui",
        "goblinShowcaseFixtureV7()",
        "GOBLIN_SHOWCASE_V7.kaboom",
        [],
      ],
      [
        "goblin-kaboom-aim",
        "v7-goblin-ui",
        "goblinShowcaseFixtureV7()",
        "GOBLIN_SHOWCASE_V7.kaboom",
        ["command-kaboom"],
      ],
      [
        "dock-goblin-bomb-chucker",
        "v7-goblin-ui",
        "goblinShowcaseFixtureV7()",
        "GOBLIN_SHOWCASE_V7.bombChucker",
        [],
      ],
      [
        "dock-goblin-warboss",
        "v7-goblin-ui",
        "goblinShowcaseFixtureV7()",
        "GOBLIN_SHOWCASE_V7.warboss",
        [],
      ],
      [
        "dock-goblin-scrap-buggy",
        "v7-goblin-ui",
        "goblinShowcaseFixtureV7()",
        "GOBLIN_SHOWCASE_V7.scrapBuggy",
        [],
      ],
      [
        "dock-goblin-berserk",
        "v7-goblin-ui",
        "goblinBerserkActiveFixtureV7()",
        "GOBLIN_BERSERK_V7.goblin",
        [],
      ],
      // Undead, the Vampire and the Banshee.
      [
        "dock-undead-necromancer",
        "v7-undead-ui",
        "undeadShowcaseFixtureV7()",
        "UNDEAD_SHOWCASE_V7.necromancer",
        [],
      ],
      [
        "dock-undead-lich",
        "v7-undead-ui",
        "undeadShowcaseFixtureV7()",
        "UNDEAD_SHOWCASE_V7.lich",
        [],
      ],
      [
        "dock-undead-ghoul",
        "v7-undead-ui",
        "undeadShowcaseFixtureV7()",
        "UNDEAD_SHOWCASE_V7.ghoul",
        [],
      ],
      [
        "dock-undead-zombie",
        "v7-undead-ui",
        "undeadShowcaseFixtureV7()",
        "UNDEAD_SHOWCASE_V7.zombie",
        [],
      ],
      [
        "dock-vampire-bat-escape",
        "v7-vampire-banshee-ui",
        "vampireBatEscapeFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.escape.vampire",
        [],
      ],
      [
        "dock-vampire-feast",
        "v7-vampire-banshee-ui",
        "vampireFeastFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.feast.vampire",
        [],
      ],
      [
        "dock-vampire-glossary",
        "v7-vampire-banshee-ui",
        "vampireBatEscapeFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.escape.vampire",
        ["unit-help"],
      ],
      [
        "dock-banshee",
        "v7-vampire-banshee-ui",
        "bansheeWailFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.wail.banshee",
        [],
      ],
      [
        "banshee-wail-preview",
        "v7-vampire-banshee-ui",
        "bansheeWailFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.wail.banshee",
        ["command-wail"],
      ],
      [
        "dock-terror-enemy",
        "v7-vampire-banshee-ui",
        "bansheeTerrorFixtureV7()",
        "VAMPIRE_BANSHEE_UI_V7.wail.survivor",
        [],
      ],
      // Ice Folk: Freeze and Frozen.
      [
        "dock-freeze-yeti",
        "v7-frozen-sea-ui",
        "frozenFreezeUiFixtureV7()",
        "FROZEN_UI_V7.yeti",
        [],
      ],
      [
        "freeze-aim",
        "v7-frozen-sea-ui",
        "frozenFreezeUiFixtureV7()",
        "FROZEN_UI_V7.yeti",
        ["freeze"],
      ],
      [
        "dock-icebound-ship",
        "v7-frozen-sea-ui",
        "frozenIceboundUiFixtureV7()",
        "FROZEN_UI_V7.frozenShip",
        [],
      ],
      [
        "ice-cold-snap-aim",
        "v7-ice-folk-ui",
        "iceFolkUiFixtureV7()",
        "ICE_FOLK_UI_V7.witch",
        ["ice-folk-cold-snap"],
      ],
      // Candy and Dwarf aiming.
      [
        "candy-sugar-toss-aim",
        "v7-candy-ui",
        "candyUiFixtureV7()",
        "CANDY_UI_V7.gunner",
        ["candy-sugar-toss"],
      ],
      [
        "dwarf-assemble-aim",
        "v7-dwarf-ui",
        "dwarfUiFixtureV7()",
        "DWARF_UI_V7.engineer",
        ["dwarf-assemble"],
      ],
      [
        "dwarf-tunnel-aim",
        "v7-dwarf-ui",
        "dwarfUiFixtureV7()",
        "DWARF_UI_V7.mole",
        ["dwarf-tunnel"],
      ],
      // Giants: a signature being aimed.
      [
        "giant-toss-aim",
        "v7-giants-ui",
        "giantsTossFixtureV7()",
        "GIANTS_UI_V7.toss.troll",
        ["giant-toss"],
      ],
      [
        "giant-stomp-aim",
        "v7-giants-ui",
        "giantsStompFixtureV7()",
        "GIANTS_UI_V7.stomp.brontosaurus",
        ["giant-stomp"],
      ],
      // Martians and Dinosaurs.
      [
        "dock-martian-brain",
        "v7-martian-ui",
        "martianUiFixtureV7()",
        "MARTIAN_UI_V7.brain",
        [],
      ],
      [
        "dock-martian-mothership",
        "v7-martian-ui",
        "martianUiFixtureV7()",
        "MARTIAN_UI_V7.mothership",
        [],
      ],
      [
        "dock-martian-saucer",
        "v7-martian-ui",
        "martianUiFixtureV7()",
        "MARTIAN_UI_V7.saucer",
        [],
      ],
      [
        "dock-martian-projector",
        "v7-martian-ui",
        "martianUiFixtureV7()",
        "MARTIAN_UI_V7.projector",
        [],
      ],
      [
        "dock-dinosaur-shaman",
        "v7-dinosaur-ui",
        "dinosaurShowcaseFixtureV7()",
        "DINOSAUR_SHOWCASE_V7.shaman",
        [],
      ],
      [
        "dock-dinosaur-egg",
        "v7-dinosaur-ui",
        "dinosaurShowcaseFixtureV7()",
        "DINOSAUR_SHOWCASE_V7.tRexEgg",
        [],
      ],
      [
        "dock-dinosaur-triceratops",
        "v7-dinosaur-ui",
        "dinosaurShowcaseFixtureV7()",
        "DINOSAUR_SHOWCASE_V7.triceratops",
        [],
      ],
      [
        "dock-dinosaur-city",
        "v7-dinosaur-ui",
        "dinosaurCityFixtureV7()",
        "DINOSAUR_CITY_V7.capital",
        [],
      ],
      // Ships.
      [
        "dock-naval-boarder",
        "v7-naval-ui",
        "navalBoardingUiFixtureV7()",
        "NAVAL_UI_V7.boarder",
        [],
      ],
      [
        "dock-naval-submarine",
        "v7-naval-ui",
        "navalSubmarineUiFixtureV7()",
        "NAVAL_UI_V7.ownSubmarine",
        [],
      ],
      // Curiosities, both rounds: the tile docks.
      [
        "dock-curiosity-lair",
        "v7-curiosities-ui",
        "curiositiesUiFixtureV7()",
        "CURIOSITIES_UI_V7.lair",
        [],
      ],
      [
        "dock-curiosity-fountain",
        "v7-curiosities-ui",
        "curiositiesUiFixtureV7()",
        "CURIOSITIES_UI_V7.fountain",
        [],
      ],
      [
        "dock-curiosity-shrine",
        "v7-curiosities-ui",
        "curiositiesUiFixtureV7()",
        "CURIOSITIES_UI_V7.shrine",
        [],
      ],
      [
        "dock-curiosity-wreck",
        "v7-curiosities-ui",
        "curiositiesUiFixtureV7()",
        "CURIOSITIES_UI_V7.wreck",
        [],
      ],
      [
        "dock-curiosity-gate",
        "v7-curiosities-round2-ui",
        "round2SaucerUiFixtureV7()",
        "ROUND2_UI_V7.gateA",
        [],
      ],
      [
        "dock-curiosity-gate-traveller",
        "v7-curiosities-round2-ui",
        "round2SaucerUiFixtureV7()",
        "ROUND2_UI_V7.traveller",
        [],
      ],
      [
        "dock-curiosity-bigfoot",
        "v7-curiosities-round2-ui",
        "round2SaucerUiFixtureV7()",
        "ROUND2_UI_V7.bigfoot",
        [],
      ],
      [
        "dock-curiosity-graveyard",
        "v7-curiosities-round2-ui",
        "round2GraveyardUiFixtureV7()",
        "ROUND2_UI_V7.camp",
        [],
      ],
    ] as const
  ).map(([name, module, build, at, then]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(c, `/tests/fixtures/${module}.ts`, build);
      await activate(c, await fixtureCoord(c, at));
      for (const action of then) await click(c, action);
      if (then.length > 0) await delay(400);
    },
  })),
  {
    name: "reward-level-2",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-dinosaur-arena.ts",
        "rewardStateV7('MILITIA', 'ICE_FOLK').state",
      );
    },
  },
  {
    name: "reward-giant",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-giants-ui.ts",
        "giantsRewardFixtureV7()",
      );
    },
  },
  ...(
    [
      ["end-domination-victory", "scoreDominationVictoryFixtureV7()"],
      ["end-perfection-defeat", "scorePerfectionDefeatFixtureV7()"],
      ["end-flawless-victory", "scoreFlawlessVictoryFixtureV7()"],
    ] as const
  ).map(([name, fixture]): Scene => ({
    name,
    match: true,
    run: async (c) => {
      await mount(c, "/tests/fixtures/v7-score-ui.ts", fixture);
      await evaluate(
        c,
        `document.querySelector('.v7-results .v7-result-seat[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
      );
      await delay(500);
    },
  })),
  {
    name: "end-nine-players",
    match: true,
    run: async (c) => {
      await mount(
        c,
        "/tests/fixtures/v7-score-ui.ts",
        "null",
        NINE_PLAYER_VICTORY,
      );
      await evaluate(
        c,
        `document.querySelector('.v7-results .v7-result-seat[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
      );
      await delay(500);
    },
  },
];

/** Every faction, the Cult in the human's seat. */
const NINE_FACTIONS = `['CULT', 'ORIGINAL', 'UNDEAD', 'GOBLIN', 'DINOSAUR', 'MARTIAN', 'ICE_FOLK', 'DWARF', 'CANDY']`;

/**
 * A new nine-player game as the Cult on a 25 x 25 Dry Land board, built in
 * the page: the first seed on which the human moves first, so the HUD
 * shows the player's own first turn. Nothing is played.
 */
function nineSeatCult(
  mode: "RIVAL" | "COOPERATIVE" = "RIVAL",
  headStart: 0 | 5 | 10 | 20 = 0,
): string {
  return `(() => {
  const builders = globalThis.__PHONE_BUILDERS__;
  for (let seed = 4127; seed < 4327; seed += 1) {
    const created = engine.createPlayableGameV7({ ...builders.browserSetupV7(seed, 3), aiCount: 8, aiMode: '${mode}', width: 25, height: 25, factions: ${NINE_FACTIONS}${headStart === 0 ? "" : `, aiHeadStart: { coins: ${headStart} }`} });
    if (!created.ok) throw new Error('nine-seat setup failed: ' + JSON.stringify(created));
    const live = created.state;
    if (live.turnOrder[live.activeSeatIndex] === live.humanPlayerId) return live;
  }
  throw new Error('no seed gives the human the first turn');
})()`;
}

/** A fresh nine-seat match with the requested faction in the human seat. */
function nineSeatFaction(faction: string): string {
  const roster = [
    faction,
    ...[
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
      "CULT",
    ].filter((entry) => entry !== faction),
  ];
  return `(() => {
  const builders = globalThis.__PHONE_BUILDERS__;
  for (let seed = 4127; seed < 4327; seed += 1) {
    const created = engine.createPlayableGameV7({ ...builders.browserSetupV7(seed, 3), aiCount: 8, width: 25, height: 25, factions: ${JSON.stringify(roster)} });
    if (!created.ok) throw new Error('nine-seat faction setup failed: ' + JSON.stringify(created));
    const live = created.state;
    if (live.turnOrder[live.activeSeatIndex] === live.humanPlayerId) return live;
  }
  throw new Error('no seed gives the human the first turn');
})()`;
}

/**
 * A nine-player Domination victory as the Cult, built in the page from a
 * fresh nine-seat setup: every rival eliminated by the human (no turn is
 * played).
 */
/**
 * Campaign progress for the roster scenes (`pulp_wars-v642.1`): missions 1
 * to 3 won with three, two and one star (the third in the format written
 * before stars existed).
 */
const CAMPAIGN_PROGRESS = `localStorage.setItem('pulpWars.campaign.v1', JSON.stringify({ format: 'pulp-wars-campaign-progress', version: 1, completed: {
  FRONTIER_1: { firstWonAt: '2026-10-14T10:00:00.000Z', bestRounds: 11, stars: 3 },
  FRONTIER_2: { firstWonAt: '2026-10-14T11:00:00.000Z', bestRounds: 19, stars: 2 },
  FRONTIER_3: { firstWonAt: '2026-10-14T12:00:00.000Z', bestRounds: 17 } } }))`;

/** Campaign progress with the first `count` missions won, three stars each. */
function campaignProgressThrough(count: number): string {
  const completed = Array.from(
    { length: count },
    (_, index) =>
      `FRONTIER_${String(index + 1)}: { firstWonAt: '2026-10-14T10:00:00.000Z', bestRounds: 12, stars: 3 }`,
  ).join(", ");
  return `localStorage.setItem('pulpWars.campaign.v1', JSON.stringify({ format: 'pulp-wars-campaign-progress', version: 1, completed: { ${completed} } }))`;
}

/**
 * Campaign progress with missions 1 to 9 won (`pulp_wars-v642.4`), so that
 * the briefings of missions 9 and 10 open.
 */
const CAMPAIGN_PROGRESS_NINE = `localStorage.setItem('pulpWars.campaign.v1', JSON.stringify({ format: 'pulp-wars-campaign-progress', version: 1, completed: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => ['FRONTIER_' + String(number), { firstWonAt: '2026-10-14T10:00:00.000Z', bestRounds: 16, stars: 3 }])) }))`;

/**
 * A mission's initial state, built by the mission builder (no command is
 * played), with `outcome` written over it for the end dialogs.
 */
function missionState(missionId: string, outcome: string): string {
  return `(() => {
  const mission = engine.missionByIdV7('${missionId}');
  const setup = engine.missionMatchSetupV7(mission, mission.seats[0].faction.choice?.[0] ?? mission.seats[0].faction);
  const live = engine.buildMissionStateV7(mission, setup);
  return { ...live, outcome: ${outcome} };
})()`;
}

const NINE_PLAYER_VICTORY = `(() => {
  const builders = globalThis.__PHONE_BUILDERS__;
  const created = engine.createPlayableGameV7({ ...builders.browserSetupV7(4127, 3), aiCount: 8, width: 25, height: 25, factions: ${NINE_FACTIONS} });
  if (!created.ok) throw new Error('nine-seat setup failed: ' + JSON.stringify(created));
  const live = created.state;
  const human = live.humanPlayerId;
  return { ...live, round: 18,
    players: live.players.map((player) => player.id === human ? player : { ...player, status: 'ELIMINATED' }),
    cities: live.cities.map((city) => ({ ...city, ownerId: human })),
    units: live.units.filter((unit) => unit.ownerId === human),
    scoreLedger: live.scoreLedger.map((entry, index) => entry.playerId === human ? entry : { ...entry, eliminatedBy: human, eliminatedAt: 100 + index }),
    outcome: { kind: 'VICTORY', winnerId: human } };
})()`;

try {
  let connection = await openPage(await waitForTarget());
  for (const size of SIZES) {
    if (
      sizes === undefined ? size.onRequest === true : !sizes.includes(size.name)
    )
      continue;
    for (const scene of SCENES) {
      if (only !== undefined && !only.includes(scene.name)) continue;
      if (size.name === "l844" && !scene.match) continue;
      const key = `${scene.name}-${size.name}`;
      try {
        await setViewport(connection, size);
        await scene.run(connection);
        await delay(300);
        findings[key] = await check(connection, scene, size);
        await capture(connection, `${key}.png`, scene.full === true);
      } catch (error) {
        // One retry on a fresh tab: a headless renderer under load can
        // stop answering (every call times out).
        console.log(`${key}: retrying on a fresh tab (${String(error)})`);
        connection.close();
        connection = await openPage(await freshTarget());
        try {
          await setViewport(connection, size);
          await scene.run(connection);
          await delay(300);
          findings[key] = await check(connection, scene, size);
          await capture(connection, `${key}.png`, scene.full === true);
        } catch (retryError) {
          errors.push(`${key}: ${String(retryError)}`);
          console.log(`${key}: error ${String(retryError)}`);
          continue;
        }
      }
      // Written after every scene, so an interrupted run keeps its findings.
      await writeFile(
        path.join(output.directory, "findings.json"),
        `${JSON.stringify({ findings, errors }, null, 2)}\n`,
      );
      const problems = findings[key] ?? [];
      const failing = problems.filter((problem) => problem.fails);
      console.log(
        `${key}: ${failing.length === 0 ? "ok" : `${failing.length} failing`}${problems.length > failing.length ? ` (${problems.length - failing.length} noted)` : ""}`,
      );
    }
  }
  const failing = Object.entries(findings).flatMap(([key, problems]) =>
    problems
      .filter((problem) => problem.fails)
      .map((problem) => `${key}: ${problem.check}: ${problem.detail}`),
  );
  await writeFile(
    path.join(output.directory, "findings.json"),
    `${JSON.stringify({ findings, failing, errors }, null, 2)}\n`,
  );
  connection.close();
  if (errors.length > 0)
    throw new Error(`Browser errors:\n${errors.join("\n")}`);
  if (failing.length > 0 && !reportOnly)
    throw new Error(`Phone layout problems:\n${failing.join("\n")}`);
  await output.publish();
  console.log(`Phone UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** The layout checks, run in the page on the top layer (a modal if open). */
async function check(
  connection: Connection,
  scene: Scene,
  size: Size,
): Promise<readonly Problem[]> {
  const problems = (await evaluate(
    connection,
    `(() => {
      const sideways = ${JSON.stringify(scene.sideways ?? [])};
      const W = document.documentElement.clientWidth;
      const H = window.innerHeight;
      const problems = [];
      const add = (check, fails, detail) => problems.push({ check, fails, detail });
      const techInteraction = globalThis.__PHONE_REVIEW__?.techInteraction;
      if (techInteraction !== undefined)
        for (const [interaction, passed] of Object.entries(techInteraction))
          add('tech-interaction-' + interaction, passed !== true, passed === true ? 'passed with physical CDP input' : 'failed');
      const name = (node) => {
        let label = node.tagName.toLowerCase();
        if (node.classList.length > 0) label += '.' + Array.from(node.classList).slice(0, 2).join('.');
        if (node.dataset?.action) label += '[' + node.dataset.action + ']';
        const words = (node.textContent ?? '').trim().replace(/\\s+/g, ' ').slice(0, 36);
        return words === '' ? label : label + ' "' + words + '"';
      };
      if (window.innerWidth !== ${size.width}) add('viewport', true, 'layout width ' + window.innerWidth + ', expected ${size.width}');
      const overflow = document.documentElement.scrollWidth - W;
      if (overflow > 0) add('page-sideways', true, 'the page scrolls ' + overflow + 'px sideways');
      const modals = Array.from(document.querySelectorAll('dialog[open], [aria-modal="true"]')).filter((node) => node.getClientRects().length > 0);
      const root = modals.at(-1) ?? document.body;
      const shown = (node) => {
        if (node.closest('canvas, svg, [hidden], details:not([open]) > :not(summary), .v7-title-scene')) return false;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = node.getBoundingClientRect();
        // Screen-reader-only text is a 1 px box.
        return rect.width > 2 && rect.height > 2;
      };
      const ownText = (node) => Array.from(node.childNodes).some((child) => child.nodeType === 3 && child.textContent.trim() !== '');
      const nodes = Array.from(root.querySelectorAll('*')).filter(shown);
      const scrollerOf = (node) => {
        for (let up = node.parentElement; up !== null && up !== document.body; up = up.parentElement) {
          const style = getComputedStyle(up);
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX + ' ' + style.overflowY)) return up;
        }
        return null;
      };
      // The box of a node that shows: cut by every clipping ancestor.
      const seenCache = new Map();
      const seen = (node) => {
        const cached = seenCache.get(node);
        if (cached !== undefined) return cached;
        const box = seenBox(node);
        seenCache.set(node, box);
        return box;
      };
      const seenBox = (node) => {
        let rect = node.getBoundingClientRect();
        let left = rect.left, right = rect.right, top = rect.top, bottom = rect.bottom;
        for (let up = node.parentElement; up !== null && up !== document.documentElement; up = up.parentElement) {
          const style = getComputedStyle(up);
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX + ' ' + style.overflowY)) {
            const box = up.getBoundingClientRect();
            left = Math.max(left, box.left); right = Math.min(right, box.right);
            top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom);
          }
        }
        return { left, right, top, bottom };
      };
      for (const node of nodes) {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if (ownText(node)) {
          if (scrollerOf(node) === null && (rect.right > W + 1 || rect.left < -1))
            add('off-screen', true, name(node) + ' spans ' + Math.round(rect.left) + ' to ' + Math.round(rect.right));
          if (node.scrollWidth > node.clientWidth + 1 && /(hidden|clip)/.test(style.overflowX)) {
            const ellipsis = style.textOverflow === 'ellipsis';
            add(ellipsis ? 'ellipsis' : 'text-clipped', !ellipsis, name(node) + ' ' + node.clientWidth + ' of ' + node.scrollWidth + 'px');
          }
          if (node.scrollHeight > node.clientHeight + 2 && /(hidden|clip)/.test(style.overflowY) && style.webkitLineClamp === 'none')
            add('text-clipped', true, name(node) + ' ' + node.clientHeight + ' of ' + node.scrollHeight + 'px high');
        }
        if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1 && !sideways.some((selector) => node.matches(selector)))
          add('panel-sideways', true, name(node).split(' "')[0] + ' ' + node.clientWidth + ' of ' + node.scrollWidth + 'px');
        // A list that scrolls inside a dialog that scrolls too.
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2) {
          for (let up = node.parentElement; up !== null && up !== document.body; up = up.parentElement) {
            const outer = getComputedStyle(up);
            if (/(auto|scroll)/.test(outer.overflowY) && up.scrollHeight > up.clientHeight + 2) {
              add('nested-scroll', true, name(node).split(' "')[0] + ' scrolls inside ' + name(up).split(' "')[0]);
              break;
            }
          }
        }
        // Text or a control that spills out of the plate (a bordered box)
        // it sits in.
        const plate = node.parentElement;
        if (plate !== null && plate !== root && (ownText(node) || node.matches('select, input, button')) && style.position !== 'absolute' && style.position !== 'fixed') {
          for (let up = plate; up !== null && up !== root && up !== document.body; up = up.parentElement) {
            const box = getComputedStyle(up);
            if (parseFloat(box.borderLeftWidth) + parseFloat(box.borderRightWidth) + parseFloat(box.borderTopWidth) + parseFloat(box.borderBottomWidth) < 2) continue;
            if (!/visible/.test(box.overflowX)) break;
            const outer = up.getBoundingClientRect();
            const spill = Math.max(outer.left - rect.left, rect.right - outer.right);
            if (spill > 3) add('spills-out', true, name(node) + ' leaves ' + name(up).split(' "')[0] + ' by ' + Math.round(spill) + 'px');
            break;
          }
        }
      }
      const controls = nodes.filter((node) => node.matches('button, a[href], select, input, [role="button"], [role="tab"]'));
      // Text and art that spill out of a button.
      for (const control of controls) {
        const box = control.getBoundingClientRect();
        for (const inner of control.querySelectorAll('*')) {
          if (!shown(inner) || !(ownText(inner) || inner.matches('img'))) continue;
          // A technology badge's name, price chip and trophy sit outside
          // its round button by design, in the space the layout keeps clear.
          if (inner.closest('.v7-tech-name, .v7-tech-cost, .v7-tech-check, .v7-tech-achievement')) continue;
          const rect = inner.getBoundingClientRect();
          const spill = Math.max(box.left - rect.left, rect.right - box.right, box.top - rect.top, rect.bottom - box.bottom);
          if (spill > 3) add('spills-out', true, name(inner) + ' leaves ' + name(control).split(' "')[0] + ' by ' + Math.round(spill) + 'px');
        }
      }
      // Overlaps, among the controls and among the text a player reads, in
      // the same layer: a menu, a dialog, the dock or a sheet laid over
      // other things (its own positioned layer) covers them by design.
      // A sticky box is a layer by itself: what scrolls under a table's
      // pinned header or first column is covered by design.
      const layerOf = (node) => {
        if (getComputedStyle(node).position === 'sticky') return node;
        for (let up = node.parentElement; up !== null; up = up.parentElement)
          if (up === document.body || /^(absolute|fixed|sticky)$/.test(getComputedStyle(up).position)) return up;
        return document.body;
      };
      // A text element's box is its text's own lines, not its padding.
      const boxOf = (node) => {
        if (!ownText(node)) return node.getBoundingClientRect();
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (const child of node.childNodes) {
          if (child.nodeType !== 3 || child.textContent.trim() === '') continue;
          const range = document.createRange();
          range.selectNodeContents(child);
          for (const rect of range.getClientRects()) {
            left = Math.min(left, rect.left); right = Math.max(right, rect.right);
            top = Math.min(top, rect.top); bottom = Math.max(bottom, rect.bottom);
          }
        }
        return left === Infinity ? node.getBoundingClientRect() : { left, right, top, bottom };
      };
      // A small badge laid on a card (a train card's "?") is part of it.
      const badgeOn = (a, b) => {
        const inside = (p, q) => p.left >= q.left - 1 && p.right <= q.right + 1 && p.top >= q.top - 1 && p.bottom <= q.bottom + 1;
        const on = (badge, card) => getComputedStyle(badge).position === 'absolute' &&
          (inside(badge.getBoundingClientRect(), card.getBoundingClientRect()) || badge.parentElement === card.parentElement);
        return on(a, b) || on(b, a);
      };
      const area = (a, b) => {
        if (layerOf(a) !== layerOf(b) || badgeOn(a, b)) return null;
        const r = boxOf(a), t = boxOf(b);
        if (r.right <= t.left || t.right <= r.left || r.bottom <= t.top || t.bottom <= r.top) return null;
        const p = seen(a), q = seen(b);
        const w = Math.min(p.right, q.right, r.right, t.right) - Math.max(p.left, q.left, r.left, t.left);
        const h = Math.min(p.bottom, q.bottom, r.bottom, t.bottom) - Math.max(p.top, q.top, r.top, t.top);
        return w > 3 && h > 3 ? Math.round(w) + 'x' + Math.round(h) : null;
      };
      for (let i = 0; i < controls.length; i += 1)
        for (let j = i + 1; j < controls.length; j += 1) {
          const a = controls[i], b = controls[j];
          if (a.contains(b) || b.contains(a)) continue;
          const overlap = area(a, b);
          if (overlap !== null) add('controls-overlap', true, name(a) + ' and ' + name(b) + ' (' + overlap + ')');
        }
      const texts = nodes.filter(ownText);
      for (let i = 0; i < texts.length; i += 1)
        for (let j = i + 1; j < texts.length; j += 1) {
          const a = texts[i], b = texts[j];
          if (a.contains(b) || b.contains(a)) continue;
          const overlap = area(a, b);
          if (overlap !== null) add('text-overlap', true, name(a) + ' and ' + name(b) + ' (' + overlap + ')');
        }
      // Text that runs under a button it is not part of.
      for (const text of texts)
        for (const control of controls) {
          if (control.contains(text) || text.contains(control)) continue;
          const overlap = area(text, control);
          if (overlap !== null) add('text-under-control', true, name(text) + ' under ' + name(control).split(' "')[0] + ' (' + overlap + ')');
        }
      // The dock's actions are what a player came for: none may start
      // below the dock's visible bottom (behind its own scroll).
      const dock = document.querySelector('.v7-selection-dock');
      if (dock !== null && modals.length === 0 && shown(dock)) {
        const box = dock.getBoundingClientRect();
        if (dock.scrollHeight > dock.clientHeight + 2) add('dock-scrolls', false, 'the dock scrolls ' + (dock.scrollHeight - dock.clientHeight) + 'px');
        // The first row of actions must show; a long list (a city's
        // training) may scroll on from there.
        const actions = Array.from(dock.querySelectorAll('.v7-context-actions button, .v7-board-pick button')).filter(shown);
        const firstRow = Math.min(...actions.map((action) => action.getBoundingClientRect().top));
        for (const action of actions) {
          const rect = action.getBoundingClientRect();
          if (rect.top > firstRow + 2) continue;
          if (rect.bottom > Math.min(box.bottom, H) + 2) add('action-hidden', true, name(action) + ' ends ' + Math.round(rect.bottom - Math.min(box.bottom, H)) + 'px below the dock');
        }
      }
      // The compact technology graph has transformed, absolutely positioned
      // targets. Generic layer checks treat each node as its own layer, so
      // enforce its visible bounds and pairwise target separation directly.
      const techGraph = document.querySelector('.v7-tech-graph');
      if (techGraph !== null) {
        const graphBox = techGraph.getBoundingClientRect();
        const graphContent = {
          left: graphBox.left + techGraph.clientLeft,
          top: graphBox.top + techGraph.clientTop,
          right: graphBox.left + techGraph.clientLeft + techGraph.clientWidth,
          bottom: graphBox.top + techGraph.clientTop + techGraph.clientHeight,
        };
        const cards = Array.from(techGraph.querySelectorAll('.v7-tech-card'));
        if (cards.length !== 25) add('tech-node-count', true, cards.length + ' technology nodes, expected 25');
        const edges = techGraph.querySelectorAll('.v7-tech-edge');
        if (edges.length !== 20) add('tech-edge-count', true, edges.length + ' technology edges, expected 20');
        // At Fit the whole tree, every badge and its shown name and price,
        // is inside the graph; zoomed in, parts are off screen by design.
        const fitted = techGraph.getAttribute('data-zoom') === '1' && document.querySelector('.v7-tech-detail') === null;
        const visible = (element) => element !== null && getComputedStyle(element).display !== 'none';
        const inside = (rect) => rect.left >= graphContent.left - 0.5 && rect.right <= graphContent.right + 0.5 && rect.top >= graphContent.top - 0.5 && rect.bottom <= graphContent.bottom + 0.5;
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          if (fitted && !inside(rect))
            add('tech-node-clipped', true, name(card).split(' "')[0] + ' exceeds graph content bounds');
          for (const extra of card.querySelectorAll('.v7-tech-cost, .v7-tech-check, .v7-tech-name'))
            if (fitted && visible(extra) && !inside(extra.getBoundingClientRect()))
              add('tech-badge-clipped', true, name(card).split(' "')[0] + ' ' + extra.className + ' exceeds graph content bounds');
          // The whole tree fits a phone at Fit with badges still about 1 cm.
          if (fitted && ${size.name === "p390" || size.name === "p360" || size.name === "p320"} && rect.width < ${size.name === "p320" ? 27 : 31})
            add('tech-target-small', true, name(card).split(' "')[0] + ' is ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px');
          // The art sits whole inside its round badge: never cropped.
          const artFrame = card.querySelector('.v7-tech-art');
          const image = artFrame?.querySelector('img');
          if (image !== null && image !== undefined && image.complete && image.naturalWidth > 0) {
            const art = artFrame.getBoundingClientRect();
            const ratio = image.naturalWidth / image.naturalHeight;
            const scale = Math.min(art.width / image.naturalWidth, art.height / image.naturalHeight);
            const drawnWidth = image.naturalWidth * scale, drawnHeight = image.naturalHeight * scale;
            if (getComputedStyle(image).objectFit !== 'contain' || Math.abs(drawnWidth / drawnHeight - ratio) > 0.02)
              add('tech-art-cropped', true, name(card).split(' "')[0] + ' art is not contained');
            const cx = (rect.left + rect.right) / 2, cy = (rect.top + rect.bottom) / 2;
            const ax = (art.left + art.right) / 2, ay = (art.top + art.bottom) / 2;
            const corner = Math.hypot(Math.abs(ax - cx) + drawnWidth / 2, Math.abs(ay - cy) + drawnHeight / 2);
            if (corner > rect.width / 2 + 1)
              add('tech-art-cropped', true, name(card).split(' "')[0] + ' art reaches past its badge');
          }
        }
        // Round badges: centre distance, not their square boxes.
        for (let i = 0; i < cards.length; i += 1)
          for (let j = i + 1; j < cards.length; j += 1) {
            const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
            const gap = Math.hypot((a.left + a.right - b.left - b.right) / 2, (a.top + a.bottom - b.top - b.bottom) / 2) - (a.width + b.width) / 2;
            if (gap < 1)
              add('tech-node-overlap', true, name(cards[i]).split(' "')[0] + ' and ' + name(cards[j]).split(' "')[0] + ' overlap by ' + Math.round(-gap) + 'px');
          }
        // Names and prices show for every node exactly when the stage says
        // so, and then never cover another node, name or price.
        const stage = techGraph.querySelector('.v7-tech-stage');
        const labelsOn = stage?.getAttribute('data-labels') === 'show';
        const shownNames = cards.filter((card) => visible(card.querySelector('.v7-tech-name')));
        const unselected = cards.filter((card) => !card.matches(':hover, :focus-visible'));
        if (labelsOn ? shownNames.length !== 25 : shownNames.some((card) => unselected.includes(card)))
          add('tech-label-scale', true, shownNames.length + ' names shown with labels ' + (labelsOn ? 'on' : 'off'));
        // A 1440 x 900 or larger desktop shows every name at Fit (bead
        // pulp_wars-2yc.66); the graph's size and badge are noted.
        if (fitted && ${size.name === "d1440" || size.name === "d1920"} && innerWidth === ${size.width} && !labelsOn)
          add('tech-desktop-names', true, 'names hidden at Fit on a desktop');
        if (fitted && cards.length > 0)
          add('tech-graph-size', false, techGraph.clientWidth + 'x' + techGraph.clientHeight + ' graph (' + (techGraph.getAttribute('data-tech-graph-shape') ?? '') + '), badges ' + Math.round(cards[0].getBoundingClientRect().width) + 'px');
        const parts = cards.flatMap((card) => [
          { owner: card, kind: 'badge', element: card },
          ...Array.from(card.querySelectorAll('.v7-tech-name, .v7-tech-cost, .v7-tech-check')).filter(visible).map((element) => ({ owner: card, kind: element.className, element })),
        ]);
        for (let i = 0; i < parts.length; i += 1)
          for (let j = i + 1; j < parts.length; j += 1) {
            const first = parts[i], second = parts[j];
            if (first.owner === second.owner || (first.kind === 'badge' && second.kind === 'badge')) continue;
            const a = first.element.getBoundingClientRect(), b = second.element.getBoundingClientRect();
            const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (width > 1 && height > 1)
              add('tech-label-overlap', true, name(first.owner).split(' "')[0] + ' ' + first.kind + ' and ' + name(second.owner).split(' "')[0] + ' ' + second.kind + ' overlap ' + Math.round(width) + 'x' + Math.round(height) + 'px');
          }
      }
      // A control on screen that something else covers (not its own parts).
      for (const control of controls) {
        const p = seen(control);
        if (p.right - p.left < 4 || p.bottom - p.top < 4) continue;
        const x = (p.left + p.right) / 2, y = (p.top + p.bottom) / 2;
        if (x < 0 || y < 0 || x > W || y > H) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit === null || control.contains(hit) || hit.contains(control)) continue;
        if (getComputedStyle(control).pointerEvents === 'none') continue;
        add('control-covered', layerOf(hit) === layerOf(control), name(control).split(' "')[0] + ' under ' + name(hit).split(' "')[0]);
      }
      return problems;
    })()`,
  )) as Problem[];
  // One line per problem.
  const unique = new Map<string, Problem>();
  for (const problem of problems)
    unique.set(`${problem.check}|${problem.detail}`, problem);
  return [...unique.values()];
}

/** The front of the game: the main menu, with no stored match or picks. */
async function front(connection: Connection): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-action="new-game"]') !== null`,
  );
  await delay(600);
}

/**
 * Replaces the running app with a `Ruleset7DomAppView` over a local fixture
 * controller (the shared fixture mount of the other reviews; a finished
 * state shows the end of the match). `build` is an expression with
 * `fixtures` and `engine` in scope; `override`, when given, replaces it.
 */
async function mount(
  connection: Connection,
  module: string,
  build: string,
  override?: string,
  /** An expression for the view's settings storage (the tutorial's record). */
  storage?: string,
): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import(${JSON.stringify(module)});
      globalThis.__PHONE_BUILDERS__ = await import('/tests/fixtures/v7-builders.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      let state = ${override ?? `fixtures.${build}`};
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        const done = state.outcome !== null && state.outcome !== undefined;
        return { phase: done ? 'COMPLETE' : 'ACTIVE', view, offeredCommands: done ? [] : engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        async dispatch(command) {
          const beforeState = state;
          const beforeView = engine.viewForV7(beforeState, beforeState.humanPlayerId);
          const applied = engine.applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!applied.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: applied.error };
          state = applied.state;
          const afterView = engine.viewForV7(state, state.humanPlayerId);
          const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, applied.events);
          const boundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
          for (const subscriber of boundarySubscribers) subscriber(boundary);
          const next = snapshot();
          for (const subscriber of subscribers) subscriber(next);
          return { accepted: true, beforeView, afterView, playerEvents };
        },
        async launch() { throw new Error('fixture launch unavailable'); },
        async resume() { return true; },
        async returnToMenu() { return false; },
        async progressAiTurns() { return { ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'fixture' }; },
        async restart() { return { ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'fixture' }; },
        async deleteStoredSave() { return false; },
        setFastForward() {},
        exportSafeLog() { return null; },
        exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
      };
      const root = document.querySelector('#app');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: ${storage ?? "null"}, artSet: 'CHIBI' });
      ${REVIEW} = { boardHost, view, fixtures, engine, state: () => state };
    })()`,
    true,
  );
  await delay(1_400);
}

async function fixtureCoord(
  connection: Connection,
  pathExpression: string,
): Promise<Coord> {
  return (await evaluate(
    connection,
    `${REVIEW}.fixtures.${pathExpression}`,
  )) as Coord;
}

async function ownCapital(connection: Connection): Promise<Coord> {
  return (await evaluate(
    connection,
    `(() => { const state = ${REVIEW}.state(); const view = ${REVIEW}.engine.viewForV7(state, state.humanPlayerId); return view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital)?.at; })()`,
  )) as Coord;
}

/** Selects what stands at `at` (the keyboard cursor, then Enter-like). */
async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Enter: 13,
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
  };
  for (const key of names)
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: codes[key],
      });
  await delay(300);
}

async function click(connection: Connection, action: string): Promise<void> {
  const found = await evaluate(
    connection,
    `(() => { const node = document.querySelector('[data-action="${action}"]'); node?.click(); return node !== null; })()`,
  );
  if (found !== true) throw new Error(`No control ${action}`);
  await delay(500);
}

async function pointIn(
  connection: Connection,
  selector: string,
  xFraction = 0.5,
  yFraction = 0.5,
): Promise<Coord> {
  return evaluate<Coord>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width * ${xFraction}, y: rect.top + rect.height * ${yFraction} }; })()`,
  );
}

/** A real browser touch tap, rather than HTMLElement.click(). */
async function physicalTap(
  connection: Connection,
  selector: string,
): Promise<void> {
  const point = await pointIn(connection, selector);
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await delay(180);
}

async function physicalDrag(
  connection: Connection,
  selector: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  const from = await pointIn(connection, selector, fromX, fromY);
  const to = await pointIn(connection, selector, toX, toY);
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const end = { x: Math.round(to.x), y: Math.round(to.y) };
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mousePressed",
    ...start,
    button: "left",
    clickCount: 1,
  });
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mouseMoved",
    x: Math.round((from.x + to.x) / 2),
    y: Math.round((from.y + to.y) / 2),
    button: "left",
  });
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mouseMoved",
    ...end,
    button: "left",
  });
  await connection.send("Input.emulateTouchFromMouseEvent", {
    type: "mouseReleased",
    ...end,
    button: "left",
    clickCount: 1,
  });
  await delay(180);
}

async function physicalPinch(
  connection: Connection,
  selector: string,
): Promise<void> {
  const first = await pointIn(connection, selector, 0.43, 0.5);
  const second = await pointIn(connection, selector, 0.57, 0.5);
  const firstOut = await pointIn(connection, selector, 0.32, 0.5);
  const secondOut = await pointIn(connection, selector, 0.68, 0.5);
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { ...first, id: 1, radiusX: 2, radiusY: 2, force: 1 },
      { ...second, id: 2, radiusX: 2, radiusY: 2, force: 1 },
    ],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { ...firstOut, id: 1, radiusX: 2, radiusY: 2, force: 1 },
      { ...secondOut, id: 2, radiusX: 2, radiusY: 2, force: 1 },
    ],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await delay(180);
}

async function physicalWheel(
  connection: Connection,
  selector: string,
  deltaY: number,
): Promise<void> {
  const point = await pointIn(connection, selector);
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    ...point,
    deltaX: 0,
    deltaY,
  });
  await delay(180);
}

async function physicalKey(
  connection: Connection,
  key: string,
  code: string,
  keyCode: number,
): Promise<void> {
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await delay(120);
}

async function rawViewport(
  connection: Connection,
  width: number,
  height: number,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
    screenOrientation: { type: "portraitPrimary", angle: 0 },
  });
  await delay(220);
}

async function exists(
  connection: Connection,
  selector: string,
): Promise<boolean> {
  return evaluate<boolean>(
    connection,
    `document.querySelector(${JSON.stringify(selector)}) !== null`,
  );
}

async function stageTransform(connection: Connection): Promise<string> {
  return evaluate<string>(
    connection,
    `document.querySelector('.v7-tech-stage')?.style.transform ?? ''`,
  );
}

async function zoom(connection: Connection): Promise<number> {
  return evaluate<number>(
    connection,
    `Number(document.querySelector('.v7-tech-graph')?.getAttribute('data-zoom'))`,
  );
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function setViewport(connection: Connection, size: Size): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    // The desktop comparison is a plain window at DPR 1.
    deviceScaleFactor: size.onRequest === true ? 1 : 2,
    mobile: size.onRequest !== true,
    screenOrientation:
      size.width > size.height
        ? { type: "landscapePrimary", angle: 90 }
        : { type: "portraitPrimary", angle: 0 },
  });
  await delay(200);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(
    connection,
    `localStorage.clear(); globalThis.__PHONE_REVIEW_PRIOR__ = true`,
  ).catch(() => undefined);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__PHONE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
}

async function capture(
  connection: Connection,
  name: string,
  full: boolean,
): Promise<void> {
  let clip: object | undefined;
  if (full) {
    const metrics = (await connection.send("Page.getLayoutMetrics")) as {
      readonly cssContentSize: {
        readonly width: number;
        readonly height: number;
      };
    };
    clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: Math.min(metrics.cssContentSize.height, 4_000),
      scale: 1,
    };
  }
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    ...(clip === undefined ? {} : { clip, captureBeyondViewport: true }),
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(output.directory, name),
    Buffer.from(response.data, "base64"),
  );
}

async function evaluate(
  connection: Connection,
  expression: string,
  awaitPromise = false,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: unknown };
    readonly exceptionDetails?: unknown;
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(JSON.stringify(response.exceptionDetails).slice(0, 800));
  return response.result?.value;
}

async function waitFor(
  connection: Connection,
  expression: string,
  attempts = 150,
  intervalMilliseconds = 100,
): Promise<void> {
  const deadline = Date.now() + attempts * intervalMilliseconds + 5_000;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (Date.now() > deadline) break;
    try {
      if ((await evaluate(connection, expression)) === true) return;
    } catch {
      // The page may be navigating.
    }
    await delay(intervalMilliseconds);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function openPage(target: DebugTarget): Promise<Connection> {
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params).slice(0, 600));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  return connection;
}

/** Closes every tab and opens a new blank one. */
async function freshTarget(): Promise<DebugTarget> {
  const response = await fetch(`http://localhost:${port}/json/list`);
  const targets = (await response.json()) as readonly (DebugTarget & {
    readonly id: string;
  })[];
  const created = await fetch(`http://localhost:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  const target = (await created.json()) as DebugTarget;
  for (const old of targets)
    if (old.type === "page")
      await fetch(`http://localhost:${port}/json/close/${old.id}`).catch(
        () => undefined,
      );
  return target;
}

async function waitForTarget(): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const page = targets.find((candidate) => candidate.type === "page");
        if (page !== undefined) return page;
      }
    } catch {
      // Chrome is still starting.
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
    { resolve(value: unknown): void; reject(error: Error): void }
  >();
  const listeners = new Set<(method: string, params: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      if (message.error !== undefined)
        request.reject(new Error(message.error.message ?? "CDP failed"));
      else request.resolve(message.result);
    } else if (message.method !== undefined)
      for (const listener of listeners)
        listener(message.method, message.params);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        // A call that never answers fails the scene instead of the run.
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out`));
        }, 30_000);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(listener) {
      listeners.add(listener);
    },
    close: () => socket.close(),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
