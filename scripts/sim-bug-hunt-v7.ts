/**
 * Bug hunt by headless simulation (`pulp_wars-2yc.94`, round two
 * `pulp_wars-2yc.97`). User-authorised only: it plays whole Normal-AI
 * matches, so it is never part of a routine gate (CLAUDE.md, "no
 * whole-game simulations unless the user asks").
 *
 * It plays a batch of matches covering all nine factions and checks, after
 * every command, the invariants the browser relies on:
 *
 * - the active seat is always offered at least one command, and END_TURN
 *   whenever no reward choice is pending;
 * - every command the Normal AI (or the random seat) picks is offered by
 *   `queryPlayerCommandsV7` and accepted by the reducer without throwing
 *   (and, at every turn start, a sample of other offered commands is
 *   accepted too: offered == accepted);
 * - the replay log appends, the canonical events and the seat-0 projected
 *   events parse, and the presentation's feedback plan and board playback
 *   plan build;
 * - the state parses through the state schema (with its cross-reference
 *   invariants: Coins, Favour, Hit Points, legal tiles, territory) with the
 *   same canonical hash, after every command;
 * - the match invariants of round two: the round never goes back, an
 *   eliminated seat never returns, the active seat is in play, an unlocked
 *   or spent achievement stays so, `MATCH_ENDED` comes exactly with the
 *   outcome, a Domination win leaves no hostile seat, a Perfection match
 *   ends with round 30, and a mission's clock never runs past its end;
 * - save -> load round-trips to the same canonical hash, under the size cap;
 *   at a few command indexes (mid-turn too) the match is resumed the
 *   browser's way: `parseSaveV7` with the replay `DEFER`red, play continues
 *   from the loaded state, and `verifySaveReplayV7` must agree;
 * - at every turn start, the queries the browser makes for the seat (views
 *   for every seat, offered commands, economic and combat previews, unit
 *   selections and tile-action plans, the dock, the technology tree, scores,
 *   achievement deeds, the mission tracker) do not throw;
 * - at the match end, the summary, the star grade, the tribe-star record,
 *   the mission stars and the campaign record (on in-memory storage) do
 *   not throw and agree with the outcome;
 * - no AI exception, stall, or turn-command cap breach.
 *
 * Slow spots (an AI turn over 2 s of AI time, a browser query over 200 ms,
 * a deferred load over 200 ms) are findings, listed in the summary, not
 * failures; only far slower ones fail.
 *
 * Usage (drives one child process per match, `--jobs` at a time):
 *
 *   node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch ai \
 *     --out <dir> [--jobs 6] [--only 3,5] [--timeout-minutes 40]
 *
 * Batches of round one: `ai` (every seat Normal AI), `random` (seat 0 plays
 * random legal commands, every other seat Normal AI), and `mixed` (seat 0
 * plays a random legal command 40% of the time, the Normal AI's otherwise).
 * Round two: `ai2` (30 all-AI skirmishes: 9-seat 25 x 25 boards,
 * Perfection, curiosities off, every difficulty, co-op, long games, naval
 * Archipelagos, Dry Land, the Showcase), `random2` (20, every faction as a
 * random seat 0 twice), and `missions2` (the ten campaign missions, the
 * tutorial and the labs, seat 0 mixed).
 * `--seed-offset N` plays the batch on other seeds (on a mission, other
 * random choices); `--sample N` applies N offered commands at each turn
 * start (12 by default; every offered command when N is at least the
 * offer); `--keep-saves` writes each match's final save to
 * `<dir>/<match>.save.json`. `--repro <failure.json>` reloads a failure and
 * prints its unparsed events. A failure writes
 * `<dir>/<match>-failure-<n>.json` with the seed, setup, command index,
 * actor, command, error, and a repro save (`save`, the state before the
 * failing command, loadable by `parseSaveV7`). Every match writes
 * `<dir>/<match>.json` with its summary and `<dir>/<match>.progress` with
 * its last command index (to locate a hang).
 */
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalTurnCommandV7,
} from "../src/ai/index";
import {
  PERFECTION_ROUNDS_V7,
  allowedBoardSizesV7,
  appendReplayCommandV7,
  applyCommandV7,
  arePlayersHostileV7,
  canonicalHash,
  canonicalJson,
  createPlayableGameV7,
  createReplayV7,
  difficultyHeadStartCoinsV7,
  gameModeOfV7,
  matchSummaryV7,
  missionByIdV7,
  missionMatchSetupV7,
  missionStatusV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewEconomicV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPublicSelectionV7,
  queryScoreV7,
  queryStarGradeV7,
  queryTechnologyTreeV7,
  queryThreatenedTilesV7,
  scoresV7,
  viewForV7,
  type BoardSizeV7,
  type CommandV7,
  type DifficultyV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameModeV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type ReplayFileV7,
} from "../src/engine/index";
import type { PlayerId } from "../src/engine/model/ids";
import {
  CampaignProgressStoreV7,
  MAX_SAVE_BYTES_V7,
  TribeStarsStoreV7,
  campaignCompletionsV7,
  createSaveEnvelopeV7,
  parseSaveV7,
  tribeStarResultV7,
  verifySaveReplayV7,
  type SaveEnvelopeV7,
  type StorageAdapter,
} from "../src/persistence/index";
import {
  campaignMissionV7,
  campaignNewlyOpenedV7,
} from "../src/campaign/progress-v7";

// The presentation modules read `import.meta.env` (Vite); outside Vite it
// is undefined, so the loader hook below gives them the production values.
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.includes("/src/") || result.source === undefined) return result;
    const text =
      typeof result.source === "string"
        ? result.source
        : Buffer.from(result.source as Uint8Array).toString("utf8");
    return text.includes("import.meta.env")
      ? {
          ...result,
          source: text.replaceAll(
            "import.meta.env",
            '({ BASE_URL: "/", DEV: false, PROD: true, MODE: "production" })',
          ),
        }
      : result;
  },
});
const { dockCommandsV7 } = await import("../src/render/blocked-actions-v7");
const { tileActionPlanForSelectionV7 } =
  await import("../src/render/canvas/tile-actions-v7");
const { feedbackPlanV7 } = await import("../src/render/feedback-plan-v7");
const { corePresentationPlanV7 } =
  await import("../src/render/canvas/presentation-plan-v7");
const { achievementDeedV7, listedAchievementIdsV7 } =
  await import("../src/render/achievement-presentation-v7");
const { missionMarkersV7, missionOutcomeLineV7, missionTrackerV7 } =
  await import("../src/render/mission-presentation-v7");

interface MatchSpecV7 {
  readonly name: string;
  /** The board seed; on a mission (whose board is fixed), the random seat's. */
  readonly seed: number;
  readonly factions: readonly FactionIdV7[];
  readonly mapType: MapTypeV7;
  readonly size: BoardSizeV7;
  readonly maxRounds: number;
  readonly curiosities?: boolean;
  readonly gameMode?: GameModeV7;
  readonly headStart?: 5 | 10 | 20;
  /** The new-game screen's difficulty: its level and head start on this board. */
  readonly difficulty?: DifficultyV7;
  readonly cooperative?: boolean;
  /** A registered mission (`MISSION_REGISTRY_V7`) played from its setup. */
  readonly mission?: string;
  /** Seat 0's faction on a mission with a choice (its first by default). */
  readonly missionFaction?: FactionIdV7;
  /** Seat whose moves are random legal commands. */
  readonly randomSeat?: number;
  /** The share of the random seat's decisions that are random (default 1). */
  readonly randomRate?: number;
}

const F = {
  H: "ORIGINAL",
  U: "UNDEAD",
  G: "GOBLIN",
  D: "DINOSAUR",
  M: "MARTIAN",
  I: "ICE_FOLK",
  W: "DWARF",
  C: "CANDY",
  X: "CULT",
} as const satisfies Record<string, FactionIdV7>;
type FactionLetterV7 = keyof typeof F;
const factions = (letters: string): readonly FactionIdV7[] =>
  [...letters].map((letter) => F[letter as FactionLetterV7]);

const AI_BATCH_V7: readonly MatchSpecV7[] = [
  {
    name: "a01-HX-continents11",
    seed: 101,
    factions: factions("HX"),
    mapType: "CONTINENTS",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a02-UC-lakes11",
    seed: 102,
    factions: factions("UC"),
    mapType: "LAKES",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a03-GW-archipelago14",
    seed: 103,
    factions: factions("GW"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 90,
  },
  {
    name: "a04-DI-pangea11",
    seed: 104,
    factions: factions("DI"),
    mapType: "PANGEA",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a05-MHU-archipelago16",
    seed: 105,
    factions: factions("MHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 80,
  },
  {
    name: "a06-XGDM-continents16",
    seed: 106,
    factions: factions("XGDM"),
    mapType: "CONTINENTS",
    size: 16,
    maxRounds: 70,
  },
  {
    name: "a07-IWCH-lakes16",
    seed: 107,
    factions: factions("IWCH"),
    mapType: "LAKES",
    size: 16,
    maxRounds: 70,
  },
  {
    name: "a08-CXW-archipelago14",
    seed: 108,
    factions: factions("CXW"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 80,
  },
  {
    name: "a09-HUGDMI-continents20",
    seed: 109,
    factions: factions("HUGDMI"),
    mapType: "CONTINENTS",
    size: 20,
    maxRounds: 50,
  },
  {
    name: "a10-UGDMIWCX-archipelago20",
    seed: 110,
    factions: factions("UGDMIWCX"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 45,
  },
  {
    name: "a11-XCWIMD-pangea20",
    seed: 111,
    factions: factions("XCWIMD"),
    mapType: "PANGEA",
    size: 20,
    maxRounds: 50,
  },
  {
    name: "a12-WCXHUGD-lakes20",
    seed: 112,
    factions: factions("WCXHUGD"),
    mapType: "LAKES",
    size: 20,
    maxRounds: 45,
  },
  {
    name: "a13-IG-archipelago16-perfection",
    seed: 113,
    factions: factions("IG"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 60,
    gameMode: "PERFECTION",
  },
  {
    name: "a14-UDIX-archipelago20-headstart",
    seed: 114,
    factions: factions("UDIX"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 60,
    headStart: 10,
  },
  {
    name: "a15-MWC-continents14-coop",
    seed: 115,
    factions: factions("MWC"),
    mapType: "CONTINENTS",
    size: 14,
    maxRounds: 60,
    cooperative: true,
  },
];

const RANDOM_BATCH_V7: readonly MatchSpecV7[] = [
  {
    name: "r01-HX-lakes11",
    seed: 201,
    factions: factions("HX"),
    mapType: "LAKES",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r02-UC-archipelago14",
    seed: 202,
    factions: factions("UC"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r03-GW-continents11",
    seed: 203,
    factions: factions("GW"),
    mapType: "CONTINENTS",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r04-DI-pangea11",
    seed: 204,
    factions: factions("DI"),
    mapType: "PANGEA",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r05-MHU-archipelago16",
    seed: 205,
    factions: factions("MHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r06-IXGD-lakes16",
    seed: 206,
    factions: factions("IXGD"),
    mapType: "LAKES",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r07-WCHU-archipelago16",
    seed: 207,
    factions: factions("WCHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r08-CDM-continents14",
    seed: 208,
    factions: factions("CDM"),
    mapType: "CONTINENTS",
    size: 14,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r09-XMIW-archipelago20",
    seed: 209,
    factions: factions("XMIW"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 45,
    randomSeat: 0,
  },
];

/**
 * Seat 0 plays a random legal command 40% of the time and the Normal AI's
 * otherwise, so it lives into the late game (naval play, rewards, giants)
 * while still taking paths the AI never takes. Every faction is seat 0 once.
 */
const MIXED_BATCH_V7: readonly MatchSpecV7[] = (
  [
    ["m01", "HUG", "ARCHIPELAGO", 14],
    ["m02", "UDM", "LAKES", 14],
    ["m03", "GIW", "CONTINENTS", 14],
    ["m04", "DCX", "ARCHIPELAGO", 14],
    ["m05", "MXH", "ARCHIPELAGO", 16],
    ["m06", "IHC", "LAKES", 14],
    ["m07", "WGD", "ARCHIPELAGO", 16],
    ["m08", "CMU", "CONTINENTS", 14],
    ["m09", "XIW", "ARCHIPELAGO", 16],
  ] as const
).map(([id, letters, mapType, size], index) => ({
  name: `${id}-${letters}-${mapType.toLowerCase()}${size}`,
  seed: 301 + index,
  factions: factions(letters),
  mapType,
  size,
  maxRounds: 70,
  randomSeat: 0,
  randomRate: 0.4,
}));

type SkirmishOptionsV7 = Partial<
  Omit<MatchSpecV7, "name" | "seed" | "factions" | "mapType" | "size">
>;

/** A generated-map match, named after its seats, map, size and options. */
function skirmish(
  id: string,
  seed: number,
  letters: string,
  mapType: MapTypeV7,
  size: BoardSizeV7,
  options: SkirmishOptionsV7 = {},
): MatchSpecV7 {
  const tags = [
    options.gameMode === "PERFECTION" ? "perfection" : null,
    options.curiosities === false ? "nocurio" : null,
    options.difficulty === undefined || options.difficulty === "NORMAL"
      ? null
      : options.difficulty.toLowerCase(),
    options.cooperative === true ? "coop" : null,
    options.randomSeat === undefined
      ? null
      : `rand${Math.round((options.randomRate ?? 1) * 100)}`,
  ].filter((tag) => tag !== null);
  return {
    name: [`${id}-${letters}-${mapType.toLowerCase()}${size}`, ...tags].join(
      "-",
    ),
    seed,
    factions: factions(letters),
    mapType,
    size,
    maxRounds: options.maxRounds ?? 70,
    ...options,
  };
}

/**
 * Round two, all-AI skirmishes (`pulp_wars-2yc.97`): what round one did not
 * cover. Nine seats on 25 x 25 (the Advanced size), Perfection on four
 * maps, curiosities off, every difficulty's head start, co-op at three
 * sizes, two long games, naval-heavy Archipelagos (Martian Mind Control,
 * Candy, Ice Folk at sea), Dry Land, and the Showcase.
 */
const AI2_BATCH_V7: readonly MatchSpecV7[] = [
  skirmish("b01", 401, "HUGDMIWCX", "CONTINENTS", 25, { maxRounds: 40 }),
  skirmish("b02", 402, "XCWIMDGUH", "ARCHIPELAGO", 25, { maxRounds: 40 }),
  skirmish("b03", 403, "UGDMIWCX", "LAKES", 25, {
    maxRounds: 40,
    curiosities: false,
  }),
  skirmish("b04", 404, "HDW", "DRY_LAND", 14, { gameMode: "PERFECTION" }),
  skirmish("b05", 405, "GMIC", "LAKES", 16, { gameMode: "PERFECTION" }),
  skirmish("b06", 406, "XUDHG", "CONTINENTS", 20, {
    gameMode: "PERFECTION",
    difficulty: "HARD",
  }),
  skirmish("b07", 407, "WI", "PANGEA", 11, { gameMode: "PERFECTION" }),
  skirmish("b08", 408, "CU", "ARCHIPELAGO", 16, { curiosities: false }),
  skirmish("b09", 409, "MGX", "PANGEA", 14, { curiosities: false }),
  skirmish("b10", 410, "IDWUC", "CONTINENTS", 20, {
    curiosities: false,
    maxRounds: 50,
  }),
  skirmish("b11", 411, "HG", "CONTINENTS", 11, { difficulty: "HARD" }),
  skirmish("b12", 412, "UX", "LAKES", 14, { difficulty: "HARDER" }),
  skirmish("b13", 413, "DM", "PANGEA", 11, { difficulty: "BRUTAL" }),
  skirmish("b14", 414, "CIW", "ARCHIPELAGO", 16, { difficulty: "HARD" }),
  skirmish("b15", 415, "GDHU", "DRY_LAND", 16, { difficulty: "HARDER" }),
  skirmish("b16", 416, "XMC", "CONTINENTS", 14, { difficulty: "BRUTAL" }),
  skirmish("b17", 417, "HMW", "LAKES", 14, { cooperative: true }),
  skirmish("b18", 418, "UIGC", "ARCHIPELAGO", 16, { cooperative: true }),
  skirmish("b19", 419, "DXHWM", "PANGEA", 20, {
    cooperative: true,
    difficulty: "BRUTAL",
    maxRounds: 50,
  }),
  skirmish("b20", 420, "IU", "ARCHIPELAGO", 20, { maxRounds: 150 }),
  skirmish("b21", 421, "CW", "LAKES", 25, { maxRounds: 150 }),
  skirmish("b22", 422, "MIC", "ARCHIPELAGO", 20, { maxRounds: 60 }),
  skirmish("b23", 423, "MDX", "ARCHIPELAGO", 16),
  skirmish("b24", 424, "MHG", "ARCHIPELAGO", 20, { maxRounds: 60 }),
  skirmish("b25", 425, "HU", "DRY_LAND", 11),
  skirmish("b26", 426, "WXIG", "DRY_LAND", 16),
  skirmish("b27", 427, "HUMG", "SHOWCASE", 16),
  skirmish("b28", 428, "XCWI", "SHOWCASE", 16),
  skirmish("b29", 429, "DG", "SHOWCASE", 16),
  skirmish("b30", 430, "GHXUDIC", "PANGEA", 25, { maxRounds: 45 }),
];

/** Round two: every faction a random seat 0 twice, on every map and mode. */
const RANDOM2_BATCH_V7: readonly MatchSpecV7[] = (
  [
    ["s01", "HU", "ARCHIPELAGO", 14, {}],
    ["s02", "UG", "DRY_LAND", 11, {}],
    ["s03", "GD", "LAKES", 14, {}],
    ["s04", "DM", "CONTINENTS", 14, {}],
    ["s05", "MI", "ARCHIPELAGO", 16, {}],
    ["s06", "IW", "PANGEA", 11, {}],
    ["s07", "WC", "ARCHIPELAGO", 14, {}],
    ["s08", "CX", "LAKES", 14, {}],
    ["s09", "XH", "ARCHIPELAGO", 16, {}],
    ["s10", "HDCX", "CONTINENTS", 16, { gameMode: "PERFECTION" }],
    ["s11", "UMWI", "ARCHIPELAGO", 20, { maxRounds: 50 }],
    ["s12", "GXI", "DRY_LAND", 14, { difficulty: "BRUTAL" }],
    ["s13", "DUW", "ARCHIPELAGO", 16, { cooperative: true }],
    ["s14", "MCGH", "LAKES", 16, { gameMode: "PERFECTION" }],
    ["s15", "ICD", "ARCHIPELAGO", 16, { difficulty: "HARD" }],
    ["s16", "WHM", "CONTINENTS", 14, { curiosities: false }],
    ["s17", "CGU", "PANGEA", 14, { randomRate: 0.5 }],
    ["s18", "XDIMW", "ARCHIPELAGO", 20, { randomRate: 0.5, maxRounds: 50 }],
    ["s19", "MXCD", "SHOWCASE", 16, {}],
    ["s20", "WIH", "SHOWCASE", 16, { randomRate: 0.5 }],
  ] as const
).map(([id, letters, mapType, size, options], index) =>
  skirmish(id, 501 + index, letters, mapType, size, {
    maxRounds: 60,
    randomSeat: 0,
    ...options,
  }),
);

/**
 * Round two: ten faction-campaign missions (the first of each campaign and
 * the Humans' finale; the Hollow Frontier was retired by
 * `pulp_wars-hmyk.22`), the tutorial and nine labs, seat 0
 * (the human's) played by the Normal AI with a share of random commands.
 */
function missionSpec(
  id: string,
  seed: number,
  missionId: string,
  randomRate: number,
  missionFaction?: FactionIdV7,
): MatchSpecV7 {
  const mission = missionByIdV7(missionId);
  if (mission === null) throw new Error(`Unknown mission ${missionId}`);
  const setup = missionMatchSetupV7(mission, missionFaction);
  if (setup === null) throw new Error(`No setup for ${missionId}`);
  return {
    name: `${id}-${missionId.toLowerCase().replaceAll("_", "")}${missionFaction === undefined ? "" : `-${missionFaction.toLowerCase()}`}`,
    seed,
    factions: setup.factions,
    mapType: "MISSION",
    size: setup.width,
    maxRounds: 80,
    mission: missionId,
    ...(missionFaction === undefined ? {} : { missionFaction }),
    randomSeat: 0,
    randomRate,
  };
}

const MISSIONS2_BATCH_V7: readonly MatchSpecV7[] = [
  missionSpec("c01", 601, "HUMAN_1", 0.25),
  missionSpec("c02", 602, "UNDEAD_1", 0.25),
  missionSpec("c03", 603, "DINOSAUR_1", 0.25),
  missionSpec("c04", 604, "MARTIAN_1", 0.25),
  missionSpec("c05", 605, "GOBLIN_1", 0.25),
  missionSpec("c06", 606, "DWARF_1", 0.25),
  missionSpec("c07", 607, "ICE_FOLK_1", 0.25),
  missionSpec("c08", 608, "CANDY_1", 0.25),
  missionSpec("c09", 609, "CULT_1", 0.25),
  missionSpec("c10", 610, "HUMAN_6", 0.25),
  missionSpec("c11", 611, "TUTORIAL_1", 0.5),
  missionSpec("c12", 612, "LAB_SIEGE", 0.4),
  missionSpec("c13", 613, "LAB_BACKLINE", 0.4),
  missionSpec("c14", 614, "LAB_LATE", 0.4),
  missionSpec("c15", 615, "LAB_BREAKTHROUGH_GOBLIN", 0.4),
  missionSpec("c16", 616, "LAB_UNDEAD_MID", 0.4),
  missionSpec("c17", 617, "LAB_MARTIAN_MID", 0.4),
  missionSpec("c18", 618, "LAB_DINOSAUR_MID", 0.4),
  missionSpec("c19", 619, "LAB_CULT_MID", 0.4),
  missionSpec("c20", 620, "LAB_ICE_FOLK_MID", 0.4),
];

const BATCHES_V7: Readonly<Record<string, readonly MatchSpecV7[]>> = {
  ai: AI_BATCH_V7,
  random: RANDOM_BATCH_V7,
  mixed: MIXED_BATCH_V7,
  ai2: AI2_BATCH_V7,
  random2: RANDOM2_BATCH_V7,
  missions2: MISSIONS2_BATCH_V7,
};

/** A decision slower than this fails (the browser slices it, but the user waits). */
const SLOW_DECISION_MS = 4_000;
/** An AI turn (AI time only) slower than this in total fails. */
const SLOW_TURN_MS = 45_000;
/** A human-seat query slower than this fails (the UI runs it on the main thread). */
const SLOW_QUERY_MS = 1_500;
/** A full (verifying) save load slower than this fails. */
const SLOW_LOAD_MS = 60_000;
/** Findings, not failures (`pulp_wars-2yc.97`): an AI turn over this. */
const FINDING_AI_TURN_MS = 2_000;
/** The slowest AI turn over this keeps a save of its start (`-slowturn.json`). */
const SLOW_TURN_SAVE_MS = 4_000;
/** Findings: a browser query, or a deferred load, over this. */
const FINDING_QUERY_MS = 200;
/** Offered commands applied at each turn start (`--sample N` for more). */
const SAMPLED_OFFERED_PER_TURN = 12;
const RANDOM_SEAT_MAX_COMMANDS_PER_TURN = 60;
/**
 * Where the match is resumed the browser's way (`pulp_wars-2yc.95`): odd
 * command indexes, so most fall inside a turn (an AI seat's too).
 */
const RESUME_AT_COMMANDS_V7 = [137, 611, 1499, 3001, 6007] as const;
/** The checks timed as browser queries (main-thread work). */
const BROWSER_QUERIES_V7 = new Set([
  "view",
  "view-every-seat",
  "query-commands",
  "dock",
  "tech-tree",
  "score-query",
  "star-grade",
  "economic-preview",
  "combat-preview",
  "selection-unit",
  "selection-city",
  "tile-action-plan",
  "threatened-tiles",
  "achievement-deeds",
  "mission-tracker",
  "human-boundary",
]);

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const sampleSize = Number(arg("--sample") ?? SAMPLED_OFFERED_PER_TURN);

if (arg("--repro") !== undefined) repro(arg("--repro") ?? "");
else if (arg("--run") !== undefined)
  runChild(arg("--run") ?? "", arg("--out") ?? ".");
else await runDriver();

/**
 * `--repro <failure.json>`: loads the failure's repro save, applies its
 * command, and prints the canonical and seat-0 projected events that do not
 * parse.
 */
function repro(path: string): void {
  const failure = JSON.parse(readFileSync(path, "utf8")) as {
    readonly save: unknown;
    readonly actor: PlayerId;
    readonly command: CommandV7 | null;
  };
  const loaded = parseSaveV7(JSON.stringify(failure.save));
  if (loaded.kind !== "VALID") throw new Error(`Repro save: ${loaded.kind}`);
  const state = loaded.save.state;
  process.stdout.write(
    `round ${state.round} command ${state.commandIndex} actor ${failure.actor}\n`,
  );
  if (failure.command === null) return;
  const applied = applyCommandV7(state, failure.actor, failure.command);
  if (!applied.accepted) {
    process.stdout.write(`rejected ${JSON.stringify(applied.error)}\n`);
    return;
  }
  for (const event of applied.events) {
    const parsed = parseEventEnvelopeV7({
      format: "pulp-wars-events",
      version: 7,
      commandIndex: applied.state.commandIndex,
      events: [event],
    });
    if (!parsed.ok)
      process.stdout.write(
        `canonical ${parsed.field}: ${JSON.stringify(event)}\n`,
      );
  }
  const envelope = projectEventsV7(
    state,
    applied.state,
    state.humanPlayerId,
    applied.events,
  );
  for (const event of envelope.events) {
    const parsed = parsePlayerEventEnvelopeV7({ ...envelope, events: [event] });
    if (!parsed.ok)
      process.stdout.write(
        `projected ${parsed.field}: ${JSON.stringify(event)}\n`,
      );
  }
  const plain = parseGameStateV7(JSON.parse(JSON.stringify(applied.state)));
  process.stdout.write(
    `state schema after the command: ${plain === null ? "REJECTED" : "ok"}\n`,
  );
}

async function runDriver(): Promise<void> {
  const batchName = arg("--batch") ?? "ai";
  const batch = BATCHES_V7[batchName];
  if (batch === undefined) throw new Error(`Unknown batch ${batchName}`);
  const out = arg("--out");
  if (out === undefined) throw new Error("--out <dir> is required");
  mkdirSync(out, { recursive: true });
  const jobs = Number(arg("--jobs") ?? "6");
  const timeoutMs = Number(arg("--timeout-minutes") ?? "40") * 60_000;
  const only = arg("--only")
    ?.split(",")
    .map((value) => Number(value));
  const selected = batch
    .map((spec, index) => ({ spec, index }))
    .filter(({ index }) => only === undefined || only.includes(index + 1));
  const queue = [...selected];
  const results: string[] = [];
  const started = Date.now();
  const worker = async (): Promise<void> => {
    for (;;) {
      const next = queue.shift();
      if (next === undefined) return;
      const line = await runOne(
        batchName,
        next.index,
        next.spec,
        out,
        timeoutMs,
      );
      results.push(line);
      process.stdout.write(`${line}\n`);
    }
  };
  await Promise.all(Array.from({ length: jobs }, () => worker()));
  process.stdout.write(
    `DONE ${batchName}: ${selected.length} matches in ${Math.round((Date.now() - started) / 1000)} s\n`,
  );
}

function runOne(
  batchName: string,
  index: number,
  spec: MatchSpecV7,
  out: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        ...process.execArgv,
        process.argv[1] ?? "scripts/sim-bug-hunt-v7.ts",
        "--run",
        `${batchName}:${index}`,
        "--out",
        out,
        ...(args.includes("--keep-saves") ? ["--keep-saves"] : []),
        ...["--seed-offset", arg("--seed-offset") ?? "0"],
        ...["--sample", arg("--sample") ?? String(SAMPLED_OFFERED_PER_TURN)],
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      const summaryPath = join(out, `${spec.name}.json`);
      const progressPath = join(out, `${spec.name}.progress`);
      if (signal !== null || !existsSync(summaryPath)) {
        const progress = existsSync(progressPath)
          ? readFileSync(progressPath, "utf8")
          : "none";
        resolve(
          `HANG-OR-CRASH ${spec.name} signal=${String(signal)} code=${String(code)} progress=${progress.trim()} stderr=${stderr.slice(-2000)}`,
        );
        return;
      }
      const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
        readonly termination: string;
        readonly outcome: { readonly kind: string } | null;
        readonly rounds: number;
        readonly commands: number;
        readonly failures: number;
        readonly wallSeconds: number;
        readonly maxSaveBytes: number;
        readonly maxDeferredLoadMs: number;
        readonly maxVerifyMs: number;
        readonly resumes: number;
        readonly slowest: string;
        readonly findings: readonly { readonly label: string }[];
      };
      resolve(
        `${summary.failures === 0 ? "CLEAN" : "FAILURES"} ${spec.name} failures=${summary.failures} termination=${summary.termination} outcome=${summary.outcome?.kind ?? "none"} rounds=${summary.rounds} commands=${summary.commands} wall=${summary.wallSeconds}s maxSave=${summary.maxSaveBytes} resumes=${summary.resumes} maxDeferredLoad=${summary.maxDeferredLoadMs}ms maxVerify=${summary.maxVerifyMs}ms findings=${summary.findings.map((entry) => entry.label).join(",") || "none"} slowest=${summary.slowest}`,
      );
    });
  });
}

interface FailureV7 {
  readonly check: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly actor: PlayerId | null;
  readonly command: CommandV7 | null;
}

interface FindingV7 {
  readonly label: string;
  count: number;
  maxMs: number;
  at: string;
}

/** An in-memory `localStorage` for the match-end records. */
function memoryStorageV7(): StorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

/** The browser's replay after a resume (`replayFromSaveV7` of the controller). */
function replayFromSaveV7(save: SaveEnvelopeV7): ReplayFileV7 {
  return {
    format: "pulp-wars-replay",
    version: 7,
    setup: save.setup,
    commands: [...save.acceptedCommands],
    checkpoints:
      save.commandIndex === 0
        ? []
        : [{ index: save.commandIndex, stateHash: save.stateHash }],
  };
}

/**
 * Round two's match invariants over one accepted command (`before` to
 * `after`, with its events): what the state schema cannot see, because it
 * reads one state at a time. Returns the broken rules.
 */
function matchInvariantsV7(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
): string[] {
  const broken: string[] = [];
  if (after.round < before.round)
    broken.push(`round went back ${before.round} -> ${after.round}`);
  const ended = events.filter((event) => event.kind === "MATCH_ENDED").length;
  if (before.outcome === null && after.outcome !== null && ended !== 1)
    broken.push(`outcome set with ${ended} MATCH_ENDED events`);
  if (after.outcome === null && ended !== 0)
    broken.push("MATCH_ENDED without an outcome");
  const beforeById = new Map(
    before.players.map((player) => [player.id, player]),
  );
  for (const player of after.players) {
    const prior = beforeById.get(player.id);
    if (prior === undefined) {
      broken.push(`player ${player.id} appeared`);
      continue;
    }
    if (prior.status === "ELIMINATED" && player.status !== "ELIMINATED")
      broken.push(`player ${player.id} came back from elimination`);
    for (const entitlement of player.achievementEntitlements) {
      const was = prior.achievementEntitlements.find(
        (entry) => entry.achievement === entitlement.achievement,
      );
      if (entitlement.spent && !entitlement.unlocked)
        broken.push(`${player.id} ${entitlement.achievement} spent, locked`);
      if (was?.unlocked === true && !entitlement.unlocked)
        broken.push(`${player.id} ${entitlement.achievement} locked again`);
      if (was?.spent === true && !entitlement.spent)
        broken.push(`${player.id} ${entitlement.achievement} unspent again`);
    }
  }
  if (after.players.length !== before.players.length)
    broken.push("a player disappeared");
  if (after.outcome === null) {
    const active = after.turnOrder[after.activeSeatIndex];
    const player = after.players.find((entry) => entry.id === active);
    if (player === undefined || player.status !== "ACTIVE")
      broken.push(`active seat ${String(active)} is not in play`);
    if (
      gameModeOfV7(after.setup) === "PERFECTION" &&
      after.round > PERFECTION_ROUNDS_V7
    )
      broken.push(`Perfection match still running in round ${after.round}`);
    const human = after.players.find(
      (entry) => entry.id === after.humanPlayerId,
    );
    if (human?.status === "ELIMINATED")
      broken.push("the human seat is eliminated but the match runs on");
    const mission = missionStatusV7(after);
    if (
      mission?.clock !== null &&
      mission?.clock !== undefined &&
      after.round > mission.clock.lastRound
    )
      broken.push(
        `mission ${mission.missionId} clock ran past round ${mission.clock.lastRound} (round ${after.round})`,
      );
  } else if (before.outcome === null) {
    broken.push(...outcomeInvariantsV7(after));
  }
  return broken;
}

/** The rules an ended match's outcome must keep. */
function outcomeInvariantsV7(state: GameStateV7): string[] {
  const broken: string[] = [];
  const outcome = state.outcome;
  if (outcome === null) return broken;
  const statusOf = (id: PlayerId): string | undefined =>
    state.players.find((player) => player.id === id)?.status;
  if (outcome.kind === "HEADLESS_VICTORY") {
    broken.push("a browser setup ended in HEADLESS_VICTORY");
    return broken;
  }
  const byScore = outcome.decidedBy === "SCORE";
  const byMission = outcome.cause !== undefined;
  if (outcome.kind === "VICTORY") {
    if (outcome.winnerId !== state.humanPlayerId)
      broken.push(`VICTORY for a non-human seat ${outcome.winnerId}`);
    if (statusOf(outcome.winnerId) !== "ACTIVE")
      broken.push(`winner ${outcome.winnerId} is not in play`);
    if (!byScore && !byMission)
      for (const player of state.players)
        if (
          player.status === "ACTIVE" &&
          arePlayersHostileV7(state, outcome.winnerId, player.id)
        )
          broken.push(`Domination win with hostile ${player.id} in play`);
  } else {
    if (outcome.humanId !== state.humanPlayerId)
      broken.push("DEFEAT names another seat as the human");
    if (!byScore && !byMission && statusOf(outcome.humanId) !== "ELIMINATED")
      broken.push("DEFEAT by elimination with the human still in play");
    if (outcome.defeatedByPlayerId === state.humanPlayerId)
      broken.push("the human defeated itself");
  }
  if (byScore) {
    if (gameModeOfV7(state.setup) !== "PERFECTION")
      broken.push("decided by score outside Perfection");
    const ranking = outcome.ranking ?? [];
    const ids = state.players.map((player) => player.id).sort();
    if (canonicalJson([...ranking].sort()) !== canonicalJson(ids))
      broken.push(`score ranking ${canonicalJson(ranking)} is not every seat`);
  }
  if (byMission && state.setup.mapType !== "MISSION")
    broken.push("a mission cause outside a mission");
  return broken;
}

function runChild(id: string, out: string): void {
  const [batchName = "", indexText = ""] = id.split(":");
  const listed = BATCHES_V7[batchName]?.[Number(indexText)];
  if (listed === undefined) throw new Error(`Unknown match ${id}`);
  // `--seed-offset N` replays the batch on other boards.
  const spec: MatchSpecV7 = {
    ...listed,
    seed: listed.seed + Number(arg("--seed-offset") ?? "0"),
  };
  mkdirSync(out, { recursive: true });
  const progressPath = join(out, `${spec.name}.progress`);
  const wallStarted = performance.now();
  const setup = setupFor(spec);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED ${created.error.code}`);
  let state = created.state;
  let replay: ReplayFileV7 = createReplayV7(setup);
  const failures: FailureV7[] = [];
  let failureFiles = 0;
  let maxSaveBytes = 0;
  let maxLoadMs = 0;
  let maxDeferredLoadMs = 0;
  let maxVerifyMs = 0;
  let resumes = 0;
  let randomCommands = 0;
  const commandsByKind: Record<string, number> = {};
  let slowestLabel = "none";
  let slowestMs = 0;
  const findings = new Map<string, FindingV7>();
  const randomSeed = { value: (spec.seed * 2_654_435_761) >>> 0 };
  const humanId = state.humanPlayerId;
  let turnActor: PlayerId | null = null;
  let commandsThisTurn = 0;
  let aiTurnMs = 0;
  let maxAiTurnMs = 0;
  let slowestSavedTurnMs = 0;
  let turnStartSave: SaveEnvelopeV7 | null = null;
  let lastRoundChecked = -1;
  let termination = "OUTCOME";
  let nextResume = 0;
  let endRecords: unknown = null;
  let reproBefore: {
    readonly state: GameStateV7;
    readonly replay: ReplayFileV7;
  } | null = null;

  const note = (label: string, ms: number): void => {
    if (ms > slowestMs) {
      slowestMs = ms;
      slowestLabel = `${label}@${state.commandIndex}:${Math.round(ms)}ms`;
    }
  };
  const finding = (label: string, ms: number): void => {
    const entry = findings.get(label) ?? { label, count: 0, maxMs: 0, at: "" };
    entry.count += 1;
    if (ms > entry.maxMs) {
      entry.maxMs = Math.round(ms);
      entry.at = `round ${state.round} command ${state.commandIndex}`;
    }
    findings.set(label, entry);
  };
  const fail = (
    check: string,
    error: unknown,
    actor: PlayerId | null,
    command: CommandV7 | null,
    reproState: GameStateV7 = reproBefore?.state ?? state,
    reproReplay: ReplayFileV7 = reproBefore?.replay ?? replay,
  ): void => {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
        : String(error);
    const failure: FailureV7 = {
      check,
      message,
      commandIndex: reproState.commandIndex,
      round: reproState.round,
      actor,
      command,
    };
    failures.push(failure);
    if (failureFiles >= 8) return;
    failureFiles += 1;
    let save: unknown;
    try {
      save = createSaveEnvelopeV7(
        { state: reproState, replay: reproReplay },
        new Date(0).toISOString(),
      );
    } catch (saveError) {
      save = `save failed: ${String(saveError)}`;
    }
    writeFileSync(
      join(out, `${spec.name}-failure-${failureFiles}.json`),
      JSON.stringify(
        { match: spec.name, seed: spec.seed, setup, ...failure, save },
        null,
        1,
      ),
    );
  };
  const guard = <T>(
    check: string,
    actor: PlayerId | null,
    command: CommandV7 | null,
    run: () => T,
    slowMs = SLOW_QUERY_MS,
  ): T | undefined => {
    const started = performance.now();
    try {
      const value = run();
      const ms = performance.now() - started;
      note(check, ms);
      if (BROWSER_QUERIES_V7.has(check) && ms > FINDING_QUERY_MS)
        finding(`query:${check}`, ms);
      if (ms > slowMs)
        fail(
          `slow:${check}`,
          `${check} took ${Math.round(ms)} ms`,
          actor,
          command,
        );
      return value;
    } catch (error) {
      fail(check, error, actor, command);
      return undefined;
    }
  };

  const seatQueries = (view: PlayerViewV7, actor: PlayerId): void => {
    const offered = guard("query-commands", actor, null, () =>
      queryPlayerCommandsV7(view),
    );
    if (offered === undefined) return;
    if (offered.length === 0)
      fail(
        "no-offered-command",
        "The active seat is offered nothing",
        actor,
        null,
      );
    if (
      view.pendingChoices.length === 0 &&
      !offered.some((command) => command.kind === "END_TURN")
    )
      fail(
        "no-end-turn",
        "END_TURN is not offered and no choice is pending",
        actor,
        null,
      );
    guard("dock", actor, null, () => dockCommandsV7(view, offered));
    guard("tech-tree", actor, null, () => queryTechnologyTreeV7(view));
    guard("score-query", actor, null, () => queryScoreV7(view));
    guard("star-grade", actor, null, () => queryStarGradeV7(view));
    guard("achievement-deeds", actor, null, () => {
      for (const achievement of listedAchievementIdsV7(view.setup.mapType))
        achievementDeedV7(achievement, view);
    });
    if (view.mission !== undefined)
      guard("mission-tracker", actor, null, () => {
        missionTrackerV7(view);
        missionMarkersV7(view);
        missionOutcomeLineV7(view);
      });
    for (const command of offered)
      guard("economic-preview", actor, command, () =>
        previewEconomicV7(view, command),
      );
    for (const command of offered)
      if (command.kind === "ATTACK")
        guard("combat-preview", actor, command, () =>
          queryCombatPreviewV7(view, command.unitId, command.targetUnitId),
        );
    for (const unit of view.units) {
      guard("selection-unit", actor, null, () =>
        queryPublicSelectionV7(view, unit.at),
      );
      if (unit.ownerId === view.viewer.id)
        guard("tile-action-plan", actor, null, () =>
          tileActionPlanForSelectionV7(view, offered, unit.id),
        );
      else
        guard("threatened-tiles", actor, null, () =>
          queryThreatenedTilesV7(view, unit.id),
        );
    }
    for (const city of view.cities)
      guard("selection-city", actor, null, () =>
        queryPublicSelectionV7(view, city.at),
      );
  };

  const offeredAcceptedSample = (view: PlayerViewV7, actor: PlayerId): void => {
    const offered = queryPlayerCommandsV7(view);
    const byKind = new Map<string, CommandV7[]>();
    for (const command of offered) {
      const list = byKind.get(command.kind) ?? [];
      list.push(command);
      byKind.set(command.kind, list);
    }
    // `--sample N` at least the offer's size applies every offered command.
    const sample: CommandV7[] =
      sampleSize >= offered.length ? [...offered] : [];
    const kinds = [...byKind.values()];
    for (
      let pass = 0;
      sample.length < Math.min(sampleSize, offered.length) &&
      pass < Math.max(4, sampleSize);
      pass += 1
    )
      for (const list of kinds) {
        if (sample.length >= sampleSize) break;
        const pick = list[nextRandom(randomSeed, list.length)];
        if (pick !== undefined && !sample.includes(pick)) sample.push(pick);
      }
    for (const command of sample) {
      try {
        const applied = applyCommandV7(state, actor, command);
        if (!applied.accepted)
          fail(
            "offered-rejected",
            `Offered ${command.kind} rejected: ${applied.error.code} ${JSON.stringify(applied.error.params)}`,
            actor,
            command,
          );
        else {
          // The selection the UI keeps after a command.
          const after = viewForV7(applied.state, actor);
          if ("unitId" in command && applied.state.outcome === null) {
            const afterOffered = queryPlayerCommandsV7(after);
            tileActionPlanForSelectionV7(after, afterOffered, command.unitId);
          }
          const broken = matchInvariantsV7(
            state,
            applied.state,
            applied.events,
          );
          if (broken.length > 0)
            fail(
              "offered-invariants",
              `Offered ${command.kind}: ${broken.join("; ")}`,
              actor,
              command,
            );
        }
      } catch (error) {
        fail("offered-throws", error, actor, command);
      }
    }
  };

  const serializeSave = (): string | undefined =>
    guard("save-write", null, null, () => {
      const envelope = createSaveEnvelopeV7(
        { state, replay },
        new Date(Date.UTC(2026, 9, 17)).toISOString(),
      );
      const text = JSON.stringify(envelope);
      const bytes = new TextEncoder().encode(text).byteLength;
      maxSaveBytes = Math.max(maxSaveBytes, bytes);
      if (bytes > MAX_SAVE_BYTES_V7)
        throw new Error(`Save is ${bytes} bytes, over ${MAX_SAVE_BYTES_V7}`);
      return text;
    });

  /** The deferred load the browser makes on resume; returns the save. */
  const deferredLoad = (serialized: string): SaveEnvelopeV7 | undefined =>
    guard("save-load-deferred", null, null, () => {
      const started = performance.now();
      const loaded = parseSaveV7(serialized, { replay: "DEFER" });
      const ms = performance.now() - started;
      maxDeferredLoadMs = Math.max(maxDeferredLoadMs, ms);
      if (ms > FINDING_QUERY_MS) finding("deferred-load", ms);
      if (loaded.kind !== "VALID")
        throw new Error(
          `Save did not load: ${loaded.kind} ${loaded.diagnostic}`,
        );
      if (canonicalHash(loaded.save.state) !== canonicalHash(state))
        throw new Error("Loaded state hash differs");
      return loaded.save;
    });

  /** What the browser's history worker checks after a resume. */
  const verifyReplay = (save: SaveEnvelopeV7): void => {
    guard(
      "save-verify",
      null,
      null,
      () => {
        const started = performance.now();
        const verified = verifySaveReplayV7(save);
        maxVerifyMs = Math.max(maxVerifyMs, performance.now() - started);
        if (!verified.ok) throw new Error(verified.diagnostic);
      },
      SLOW_LOAD_MS,
    );
  };

  const saveRoundTrip = (full: boolean): void => {
    // What the browser does after an accepted command (queue and flush).
    const serialized = serializeSave();
    if (serialized === undefined) return;
    const save = deferredLoad(serialized);
    if (!full || save === undefined) return;
    // Every other reader: the log is replayed from the setup.
    guard(
      "save-load",
      null,
      null,
      () => {
        const started = performance.now();
        const loaded = parseSaveV7(serialized);
        maxLoadMs = Math.max(maxLoadMs, performance.now() - started);
        if (loaded.kind !== "VALID")
          throw new Error(
            `Save did not load: ${loaded.kind} ${loaded.diagnostic}`,
          );
        if (canonicalHash(loaded.save.state) !== canonicalHash(state))
          throw new Error("Loaded state hash differs");
      },
      SLOW_LOAD_MS,
    );
  };

  /**
   * Resume the browser's way (`pulp_wars-2yc.95`): save, load with the
   * replay deferred, go on from the loaded state with a fresh AI run (the
   * browser restarts the seat's turn count), and check the history.
   */
  const resume = (): void => {
    const serialized = serializeSave();
    if (serialized === undefined) return;
    const save = deferredLoad(serialized);
    if (save === undefined) return;
    verifyReplay(save);
    state = save.state;
    replay = replayFromSaveV7(save);
    commandsThisTurn = 0;
    resumes += 1;
  };

  /** The browser's match-end records and the summary's agreement with them. */
  const matchEnd = (): void => {
    guard("match-end", humanId, null, () => {
      const broken = outcomeInvariantsV7(state);
      const summary = matchSummaryV7(state);
      if (summary === null) broken.push("no match summary at the end");
      const view = viewForV7(state, humanId);
      const grade = queryStarGradeV7(view);
      queryScoreV7(view);
      queryPlayerCommandsV7(view);
      for (const player of state.turnOrder) viewForV7(state, player);
      const tribe = tribeStarResultV7(state);
      const tribeStore = new TribeStarsStoreV7(memoryStorageV7());
      const tribeRecorded = tribe === null ? null : tribeStore.record(tribe).ok;
      if (tribe !== null && tribeRecorded !== true)
        broken.push("tribe stars did not record");
      const mission = state.setup.mapType === "MISSION";
      if (mission && tribe !== null) broken.push("a mission recorded stars");
      const human = state.outcome?.kind === "VICTORY";
      if (
        !mission &&
        state.setup.mapType !== "SHOWCASE" &&
        human &&
        summary?.recordable === true &&
        tribe === null &&
        (summary.grade.stars ?? 0) > 0
      )
        broken.push("a skirmish win with stars recorded nothing");
      let campaign: unknown = null;
      if (mission) {
        const status = missionStatusV7(state);
        if (status === null) broken.push("no mission status at the end");
        const bonus = status?.bonus.length ?? 0;
        if (human) {
          if (
            status?.stars === null ||
            status?.stars === undefined ||
            status.stars < 1 ||
            status.stars > 1 + bonus
          )
            broken.push(`mission win with stars ${String(status?.stars)}`);
        } else if (status?.stars !== null && status?.stars !== undefined)
          broken.push(`mission loss with stars ${status.stars}`);
        const missionId = state.setup.mission?.id ?? "";
        const found = campaignMissionV7(missionId);
        if (human && found !== null) {
          const store = new CampaignProgressStoreV7(memoryStorageV7());
          const stars = Math.min(3, Math.max(1, status?.stars ?? 1));
          const recorded = store.recordWin(
            found.campaign.id,
            missionId,
            state.round,
            stars as 1 | 2 | 3,
          );
          if (!recorded.ok) broken.push("campaign win did not record");
          else
            campaign = {
              firstWin: recorded.firstWin,
              opened: campaignNewlyOpenedV7(
                campaignCompletionsV7(recorded.before),
                campaignCompletionsV7(recorded.progress),
              ),
              stars,
            };
        }
      }
      endRecords = {
        grade:
          grade === null
            ? null
            : { stars: grade.grade.stars, recordable: summary?.recordable },
        tribe,
        campaign,
        missionStars: missionStatusV7(state)?.stars ?? null,
      };
      if (broken.length > 0) throw new Error(broken.join("; "));
    });
  };

  while (state.outcome === null) {
    reproBefore = null;
    if (state.round > spec.maxRounds) {
      termination = "ROUND_CAP";
      break;
    }
    if (failures.length >= 25) {
      termination = "TOO_MANY_FAILURES";
      break;
    }
    const resumeAt = RESUME_AT_COMMANDS_V7[nextResume];
    if (resumeAt !== undefined && state.commandIndex >= resumeAt) {
      nextResume += 1;
      resume();
    }
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) {
      fail("no-active-player", "turnOrder has no active seat", null, null);
      termination = "ERROR";
      break;
    }
    const turnStart = actor !== turnActor;
    if (turnStart) {
      if (turnActor !== null && turnActor !== humanId) {
        maxAiTurnMs = Math.max(maxAiTurnMs, aiTurnMs);
        const faction =
          state.players.find((player) => player.id === turnActor)?.faction ??
          "?";
        if (aiTurnMs > FINDING_AI_TURN_MS)
          finding(`ai-turn:${faction}`, aiTurnMs);
        // The slowest turns keep a save of their start, to profile.
        if (
          aiTurnMs > SLOW_TURN_SAVE_MS &&
          aiTurnMs > slowestSavedTurnMs &&
          turnStartSave !== null
        ) {
          slowestSavedTurnMs = aiTurnMs;
          writeFileSync(
            join(out, `${spec.name}-slowturn.json`),
            JSON.stringify({
              match: spec.name,
              actor: turnActor,
              faction,
              aiTurnMs: Math.round(aiTurnMs),
              save: turnStartSave,
            }),
          );
        }
        if (aiTurnMs > SLOW_TURN_MS)
          fail(
            "slow-ai-turn",
            `AI turn took ${Math.round(aiTurnMs)} ms`,
            turnActor,
            null,
          );
      }
      turnActor = actor;
      commandsThisTurn = 0;
      aiTurnMs = 0;
      turnStartSave =
        actor === humanId
          ? null
          : createSaveEnvelopeV7({ state, replay }, new Date(0).toISOString());
      writeFileSync(
        progressPath,
        `${state.commandIndex} round=${state.round} actor=${actor}\n`,
      );
    }
    if (state.round !== lastRoundChecked && state.activeSeatIndex === 0) {
      lastRoundChecked = state.round;
      if (state.round % 10 === 0 || state.round === 2)
        saveRoundTrip(state.round === 2);
      for (const player of state.turnOrder)
        guard("view-every-seat", player, null, () => viewForV7(state, player));
      guard("scores", null, null, () => scoresV7(state));
    }
    const view = guard("view", actor, null, () => viewForV7(state, actor));
    if (view === undefined) {
      termination = "ERROR";
      break;
    }
    if (turnStart) {
      seatQueries(view, actor);
      offeredAcceptedSample(view, actor);
    }
    const isRandomSeat =
      spec.randomSeat !== undefined && view.viewer.seat === spec.randomSeat;
    let command: CommandV7 | null = null;
    let decisionMs = 0;
    if (
      isRandomSeat &&
      nextRandom(randomSeed, 1000) < (spec.randomRate ?? 1) * 1000
    ) {
      command = randomCommand(view, commandsThisTurn, randomSeed);
      randomCommands += 1;
    } else {
      const started = performance.now();
      try {
        const work = new NormalPolicyWorkV7(view);
        const decision = work.runSlice(Number.MAX_SAFE_INTEGER);
        if (decision === null) throw new Error("Policy work did not drain");
        command = chooseNormalTurnCommandV7(
          view,
          commandsThisTurn,
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
          decision,
        );
      } catch (error) {
        fail("ai-policy", error, actor, null);
        termination = "ERROR";
        break;
      }
      decisionMs = performance.now() - started;
      note("ai-decision", decisionMs);
      if (decisionMs > SLOW_DECISION_MS)
        fail(
          "slow-ai-decision",
          `decision took ${Math.round(decisionMs)} ms`,
          actor,
          command,
        );
    }
    if (command === null) {
      fail("ai-stall", "No command chosen", actor, null);
      termination = "STALL";
      break;
    }
    const encoded = canonicalJson(command);
    if (
      !queryPlayerCommandsV7(view).some(
        (candidate) => canonicalJson(candidate) === encoded,
      )
    ) {
      fail(
        "not-offered",
        `Chosen ${command.kind} is not offered`,
        actor,
        command,
      );
      termination = "ERROR";
      break;
    }
    const before = state;
    let applied: ReturnType<typeof applyCommandV7>;
    const reducerStarted = performance.now();
    try {
      applied = applyCommandV7(state, actor, command);
    } catch (error) {
      fail("reducer-throws", error, actor, command);
      termination = "ERROR";
      break;
    }
    if (actor !== humanId)
      aiTurnMs += decisionMs + (performance.now() - reducerStarted);
    if (!applied.accepted) {
      fail(
        "reducer-rejects",
        `${command.kind} rejected: ${applied.error.code} ${JSON.stringify(applied.error.params)}`,
        actor,
        command,
      );
      termination = "ERROR";
      break;
    }
    if (applied.state.commandIndex !== before.commandIndex + 1) {
      fail("no-progress", "commandIndex did not advance", actor, command);
      termination = "STALL";
      break;
    }
    const replayBefore = replay;
    try {
      replay = appendReplayCommandV7(replay, command, applied.state);
    } catch (error) {
      fail("replay-append", error, actor, command);
      termination = "ERROR";
      break;
    }
    // Checks after the command save the state before it as the repro.
    reproBefore = { state: before, replay: replayBefore };
    state = applied.state;
    commandsThisTurn += 1;
    commandsByKind[command.kind] = (commandsByKind[command.kind] ?? 0) + 1;
    const events = applied.events;
    guard("event-schema", actor, command, () => {
      const parsed = parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: state.commandIndex,
        events,
      });
      if (!parsed.ok) {
        const bad = events.find(
          (event) =>
            !parseEventEnvelopeV7({
              format: "pulp-wars-events",
              version: 7,
              commandIndex: state.commandIndex,
              events: [event],
            }).ok,
        );
        throw new Error(
          `Event envelope invalid at ${parsed.field}: ${JSON.stringify(bad).slice(0, 400)}`,
        );
      }
    });
    // The browser's accepted boundary for the human seat.
    guard("human-boundary", actor, command, () => {
      const beforeView = viewForV7(before, humanId);
      const afterView = viewForV7(state, humanId);
      const envelope = projectEventsV7(before, state, humanId, events);
      const parsed = parsePlayerEventEnvelopeV7(envelope);
      if (!parsed.ok) {
        const bad = envelope.events.find(
          (event) =>
            !parsePlayerEventEnvelopeV7({ ...envelope, events: [event] }).ok,
        );
        throw new Error(
          `Player event envelope invalid at ${parsed.field}: ${JSON.stringify(bad).slice(0, 400)}`,
        );
      }
      feedbackPlanV7(beforeView, envelope, afterView);
      // The board's playback of the same boundary.
      corePresentationPlanV7(beforeView, envelope, afterView);
      if (state.outcome === null && "unitId" in command && actor === humanId)
        tileActionPlanForSelectionV7(
          afterView,
          queryPlayerCommandsV7(afterView),
          command.unitId,
        );
    });
    // Round two: the full state schema (Coins, Favour, Hit Points, legal
    // tiles, territory) after every command, not only at End Turn.
    guard("state-schema", actor, command, () => {
      const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
      if (parsed === null) throw new Error("State schema rejected the state");
      if (canonicalHash(parsed) !== canonicalHash(state))
        throw new Error("Parsed state hash differs");
    });
    guard("match-invariants", actor, command, () => {
      const broken = matchInvariantsV7(before, state, events);
      if (broken.length > 0) throw new Error(broken.join("; "));
    });
    if (command.kind === "END_TURN")
      guard("project-every-seat", actor, command, () => {
        for (const player of state.turnOrder)
          if (player !== humanId)
            projectEventsV7(before, state, player, events);
      });
  }
  if (state.outcome !== null) {
    termination = "OUTCOME";
    reproBefore = null;
    matchEnd();
  }
  saveRoundTrip(true);
  if (args.includes("--keep-saves"))
    writeFileSync(
      join(out, `${spec.name}.save.json`),
      JSON.stringify(
        createSaveEnvelopeV7({ state, replay }, new Date(0).toISOString()),
      ),
    );
  writeFileSync(
    join(out, `${spec.name}.json`),
    JSON.stringify(
      {
        match: spec.name,
        seed: spec.seed,
        setup,
        termination,
        outcome: state.outcome,
        rounds: state.round,
        commands: state.commandIndex,
        failures: failures.length,
        failureList: failures.map((failure) => ({
          ...failure,
          message: failure.message.slice(0, 600),
        })),
        wallSeconds: Math.round((performance.now() - wallStarted) / 1000),
        maxSaveBytes,
        maxLoadMs: Math.round(maxLoadMs),
        maxDeferredLoadMs: Math.round(maxDeferredLoadMs),
        maxVerifyMs: Math.round(maxVerifyMs),
        maxAiTurnMs: Math.round(maxAiTurnMs),
        resumes,
        slowest: slowestLabel,
        findings: [...findings.values()],
        endRecords,
        randomCommands,
        commandsByKind,
        alivePlayers: state.players.filter(
          (player) => player.status === "ACTIVE",
        ).length,
      },
      null,
      1,
    ),
  );
}

function setupFor(spec: MatchSpecV7): MatchSetupV7 {
  if (spec.mission !== undefined) {
    const mission = missionByIdV7(spec.mission);
    if (mission === null) throw new Error(`Unknown mission ${spec.mission}`);
    const setup = missionMatchSetupV7(mission, spec.missionFaction);
    if (setup === null) throw new Error(`No setup for ${spec.mission}`);
    return setup;
  }
  const seats = spec.factions.length;
  const base = {
    rulesetId: "pulp-wars-poc-7r116",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    seed: spec.seed,
    aiCount: (seats - 1) as MatchSetupV7["aiCount"],
    aiMode: spec.cooperative === true ? "COOPERATIVE" : "RIVAL",
    humanColor: "CORAL",
    factions: spec.factions,
  } as const;
  if (spec.mapType === "SHOWCASE")
    return {
      ...base,
      width: 16,
      height: 16,
      aiDifficulty: "NORMAL",
      mapType: "SHOWCASE",
      curiosities: false,
    };
  const allowed = allowedBoardSizesV7(spec.mapType, seats);
  const size =
    allowed.find((width) => width >= spec.size) ?? allowed.at(-1) ?? spec.size;
  const difficulty = spec.difficulty ?? "NORMAL";
  const headStart =
    difficulty === "NORMAL"
      ? spec.headStart
      : difficultyHeadStartCoinsV7(difficulty, spec.mapType, size, seats - 1) ||
        undefined;
  return {
    ...base,
    width: size,
    height: size,
    aiDifficulty: difficulty,
    mapType: spec.mapType,
    curiosities: spec.curiosities ?? true,
    gameMode: spec.gameMode ?? "DOMINATION",
    ...(headStart === undefined ? {} : { aiHeadStart: { coins: headStart } }),
  };
}

/** Mulberry32 step on a mutable seed; returns an integer in [0, bound). */
function nextRandom(seed: { value: number }, bound: number): number {
  seed.value = (seed.value + 0x6d2b79f5) >>> 0;
  let t = seed.value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const unit = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  return Math.floor(unit * Math.max(1, bound));
}

/**
 * A random legal command: a kind first (uniform over the offered kinds, so
 * rare abilities are tried), then a command of that kind. END_TURN is drawn
 * rarely until the turn has had its share of commands.
 */
function randomCommand(
  view: PlayerViewV7,
  commandsThisTurn: number,
  seed: { value: number },
): CommandV7 | null {
  const offered = queryPlayerCommandsV7(view);
  if (offered.length === 0) return null;
  const endTurn = offered.find((command) => command.kind === "END_TURN");
  if (
    endTurn !== undefined &&
    (commandsThisTurn >= RANDOM_SEAT_MAX_COMMANDS_PER_TURN ||
      nextRandom(seed, 100) < 4)
  )
    return endTurn;
  const byKind = new Map<string, CommandV7[]>();
  for (const command of offered) {
    if (command.kind === "END_TURN" && offered.length > 1) continue;
    const list = byKind.get(command.kind) ?? [];
    list.push(command);
    byKind.set(command.kind, list);
  }
  const kinds = [...byKind.values()];
  const list = kinds[nextRandom(seed, kinds.length)] ?? [];
  return list[nextRandom(seed, list.length)] ?? endTurn ?? offered[0] ?? null;
}
