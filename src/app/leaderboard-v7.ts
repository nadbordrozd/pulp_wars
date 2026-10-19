import { localHostV7, type AnalyticsEnvironmentV7 } from "./analytics-v7";
import { isRegularGameV7 } from "../engine/v7/game-kind";
import { queryStarGradeV7 } from "../engine/v7/score-query";
import {
  FACTION_IDS_V7,
  PERFECTION_ROUNDS_V7,
  RULESET_7_ID,
  gameModeOfV7,
  type FactionIdV7,
  type GameModeV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";
import type { StorageAdapter } from "../persistence/index";

/**
 * The public leaderboard (bead pulp_wars-2yc.104, docs/LEADERBOARD.md): one
 * board for Domination and one for Perfection, each a list of name, faction
 * and score, kept in the user's Firebase project (Cloud Firestore,
 * collection `pulpWarsScores`).
 *
 * - No Firebase SDK: the game talks to Firestore's REST API with `fetch`.
 *   A score is created with `documents:commit` and a `REQUEST_TIME`
 *   transform, so its `timestamp` is the server's time (the security rules
 *   in `firebase/firestore.rules` require exactly that).
 * - Only the deployed site talks to Firestore ({@link leaderboardModeV7}).
 *   The development server, the tests, a local preview, the review and
 *   smoke scripts and any browser driven by automation get an in-memory
 *   board ({@link memoryLeaderboardBackendV7}): nothing they do reaches the
 *   real project.
 * - It never blocks play: every request times out
 *   ({@link LEADERBOARD_TIMEOUT_MS_V7}) and every failure is a soft result
 *   the screens show as a line of text.
 * - A score is offered only for a Regular game the player won
 *   ({@link leaderboardClaimV7}), once per match (remembered in this
 *   browser).
 */

/** The user's Firebase web app (public client identifiers). */
export const FIREBASE_CONFIG_V7 = Object.freeze({
  apiKey: "AIzaSyCdblzJof77xBB-ofOYuPavGgUZef8XM1s",
  authDomain: "vibe-crawler.firebaseapp.com",
  projectId: "vibe-crawler",
  storageBucket: "vibe-crawler.firebasestorage.app",
  messagingSenderId: "211284148853",
  appId: "1:211284148853:web:062f7fdf69726c147cae3c",
});

export const LEADERBOARD_COLLECTION_V7 = "pulpWarsScores";
/** Rows a board shows. */
export const LEADERBOARD_TOP_V7 = 50;
/** A name: 1 to 16 characters after trimming. */
export const LEADERBOARD_NAME_MAX_V7 = 16;
/**
 * The highest score accepted. The score of a won match is the grade's
 * (RULESET_7_SCORE_AND_STARS.md section 5.1: at the end, or at round 30),
 * a few thousand on the largest board; ten times that is still sane.
 */
export const LEADERBOARD_SCORE_MAX_V7 = 100_000;
/** The longest Domination match accepted, in rounds. */
export const LEADERBOARD_ROUNDS_MAX_V7 = 1_000;
/** Every request gives up after this long. */
export const LEADERBOARD_TIMEOUT_MS_V7 = 8_000;
/** A board fetched this recently is shown again without a request. */
export const LEADERBOARD_CACHE_MS_V7 = 60_000;
export const LEADERBOARD_NAME_STORAGE_KEY_V7 = "pulpWars.leaderboard.name.v1";
export const LEADERBOARD_SUBMITTED_STORAGE_KEY_V7 =
  "pulpWars.leaderboard.submitted.v1";
/** Matches remembered as submitted (the oldest are forgotten). */
const SUBMITTED_KEEP_V7 = 100;
export const LEADERBOARD_PREVIEW_PARAMETER_V7 = "leaderboard-preview";

export type LeaderboardModeV7 = GameModeV7;
export const LEADERBOARD_MODES_V7: readonly LeaderboardModeV7[] = Object.freeze(
  ["DOMINATION", "PERFECTION"] as const,
);

/** The fields of one stored score, exactly (no other data). */
export interface LeaderboardSubmissionV7 {
  readonly name: string;
  readonly faction: FactionIdV7;
  readonly score: number;
  readonly mode: LeaderboardModeV7;
  readonly rounds: number;
  /** The ruleset id ("pulp-wars-poc-7r100"). */
  readonly version: string;
}

/** One row of a board. */
export interface LeaderboardEntryV7 extends LeaderboardSubmissionV7 {
  readonly id: string;
  /** The server's time (ISO), null when the store did not say. */
  readonly timestamp: string | null;
}

// ---------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------

/**
 * Letters, digits, spaces and simple punctuation, starting and ending with
 * a non-space, 1 to 16 characters. The rules hold the same pattern.
 */
export const LEADERBOARD_NAME_PATTERN_V7 =
  /^[A-Za-z0-9.,!?'_-](?:[A-Za-z0-9 .,!?'_-]{0,14}[A-Za-z0-9.,!?'_-])?$/;

/** A typed name made storable: trimmed, inner spaces collapsed. */
export function normalizeLeaderboardNameV7(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export type LeaderboardNameProblemV7 =
  "EMPTY" | "TOO_LONG" | "CHARACTERS" | "RUDE";

/** What is wrong with a (normalized) name, or null. */
export function leaderboardNameProblemV7(
  name: string,
): LeaderboardNameProblemV7 | null {
  if (name.length === 0) return "EMPTY";
  if (name.length > LEADERBOARD_NAME_MAX_V7) return "TOO_LONG";
  if (!LEADERBOARD_NAME_PATTERN_V7.test(name)) return "CHARACTERS";
  if (rudeLeaderboardNameV7(name)) return "RUDE";
  return null;
}

/** The line shown under the name field for a problem. */
export function leaderboardNameProblemTextV7(
  problem: LeaderboardNameProblemV7,
): string {
  switch (problem) {
    case "EMPTY":
      return "Type a name first.";
    case "TOO_LONG":
      return `A name is at most ${LEADERBOARD_NAME_MAX_V7} characters.`;
    case "CHARACTERS":
      return "Use letters, digits, spaces and . , ! ? ' - _ only.";
    case "RUDE":
      return "Please pick another name.";
  }
}

// A small list, kept short on purpose: the board is public, so the worst
// words are refused. Anyone can still write to the store directly
// (docs/LEADERBOARD.md); this only keeps honest players from an accident.
/** Refused anywhere in a name, spaces and punctuation ignored. */
const RUDE_ANYWHERE_V7 = Object.freeze([
  "fuck",
  "shit",
  "cunt",
  "nigg",
  "faggot",
  "whore",
  "bitch",
  "asshole",
  "retard",
  "pussy",
  "rapist",
  "hitler",
  "porn",
  "motherf",
  "wanker",
  "dildo",
  "jizz",
]);
/** Refused as a whole word (an "s" plural too). */
const RUDE_WORDS_V7 = Object.freeze([
  "ass",
  "arse",
  "fag",
  "cock",
  "dick",
  "slut",
  "rape",
  "nazi",
  "kike",
  "spic",
  "chink",
  "coon",
  "gook",
  "tit",
  "twat",
  "wank",
  "penis",
  "vagina",
  "cum",
  "anal",
  "anus",
  "sex",
  "tranny",
  "piss",
  "prick",
  "bollock",
]);

const LEET_V7: Readonly<Record<string, string>> = Object.freeze({
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "!": "i",
  $: "s",
  "@": "a",
});

/** The small built-in filter: true for a name that is refused. */
export function rudeLeaderboardNameV7(name: string): boolean {
  const plain = [...name.toLowerCase()]
    .map((character) => LEET_V7[character] ?? character)
    .join("");
  const squeezed = plain.replace(/[^a-z]/g, "");
  if (RUDE_ANYWHERE_V7.some((word) => squeezed.includes(word))) return true;
  const words = plain.split(/[^a-z]+/).filter((word) => word.length > 0);
  return words.some((word) => {
    const single = word.endsWith("s") ? word.slice(0, -1) : word;
    return RUDE_WORDS_V7.includes(word) || RUDE_WORDS_V7.includes(single);
  });
}

// ---------------------------------------------------------------------
// The score of a won match
// ---------------------------------------------------------------------

/**
 * A regular game (bead pulp_wars-2yc.103, {@link isRegularGameV7}): the
 * only kind whose wins go to the board, as only it earns tribe stars. A
 * custom game, the Showcase, a campaign mission or the tutorial never do.
 * "Play again" replays the same setup and seed, and a regular game replayed
 * that way still counts.
 */
export function leaderboardRegularGameV7(setup: MatchSetupV7): boolean {
  return isRegularGameV7(setup);
}

/** What a won match may submit, with the match it came from. */
export interface LeaderboardClaimV7 {
  /** Identifies the match, so it is submitted once. */
  readonly matchKey: string;
  readonly faction: FactionIdV7;
  readonly score: number;
  readonly mode: LeaderboardModeV7;
  readonly rounds: number;
  readonly version: string;
}

/** FNV-1a, 32 bits, as eight hex digits. */
function hashV7(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * The claim of a finished match, or null when it may not be submitted: a
 * Regular game the human won (Domination: every rival out; Perfection:
 * ranked first, or every rival out early), with a score in range.
 */
export function leaderboardClaimV7(
  view: PlayerViewV7,
  regular: (setup: MatchSetupV7) => boolean = leaderboardRegularGameV7,
): LeaderboardClaimV7 | null {
  const outcome = view.outcome;
  const summary = view.score.summary;
  if (
    outcome === null ||
    summary === null ||
    outcome.kind !== "VICTORY" ||
    outcome.winnerId !== view.humanPlayerId ||
    !regular(view.setup)
  )
    return null;
  const graded = queryStarGradeV7(view);
  if (graded === null) return null;
  const mode = gameModeOfV7(view.setup);
  // Domination is won only by putting every rival out.
  if (mode === "DOMINATION" && summary.decidedBy !== "ELIMINATION") return null;
  const score = graded.grade.score;
  const rounds = summary.endRound;
  const claim = {
    faction: graded.faction,
    score,
    mode,
    rounds,
    version: view.setup.rulesetId,
  };
  if (leaderboardFieldProblemsV7({ ...claim, name: "x" }).length > 0)
    return null;
  const setup = view.setup;
  const matchKey = `m${hashV7(
    JSON.stringify([
      setup.rulesetId,
      setup.seed,
      setup.mapType,
      setup.width,
      setup.height,
      setup.factions,
      setup.aiCount,
      setup.aiMode,
      setup.aiDifficulty,
      mode,
      rounds,
      score,
    ]),
  )}`;
  return { matchKey, ...claim };
}

/**
 * Every field the rules check, checked the same way here (except the
 * rude-word filter, which the rules cannot do). Empty when valid.
 */
export function leaderboardFieldProblemsV7(
  entry: LeaderboardSubmissionV7,
): string[] {
  const problems: string[] = [];
  const name = leaderboardNameProblemV7(entry.name);
  if (name !== null && name !== "RUDE") problems.push(`name:${name}`);
  if (!(FACTION_IDS_V7 as readonly string[]).includes(entry.faction))
    problems.push("faction");
  if (
    !Number.isSafeInteger(entry.score) ||
    entry.score < 0 ||
    entry.score > LEADERBOARD_SCORE_MAX_V7
  )
    problems.push("score");
  if (!LEADERBOARD_MODES_V7.includes(entry.mode)) problems.push("mode");
  if (
    !Number.isSafeInteger(entry.rounds) ||
    entry.rounds < 1 ||
    entry.rounds > LEADERBOARD_ROUNDS_MAX_V7 ||
    (entry.mode === "PERFECTION" && entry.rounds > PERFECTION_ROUNDS_V7)
  )
    problems.push("rounds");
  if (!/^pulp-wars-[a-z0-9-]{1,24}$/.test(entry.version))
    problems.push("version");
  return problems;
}

/** Where a score stands: 1 + the scores strictly above it. */
export function leaderboardRankV7(
  entries: readonly Pick<LeaderboardEntryV7, "score">[],
  score: number,
): number {
  return entries.filter((entry) => entry.score > score).length + 1;
}

// ---------------------------------------------------------------------
// Firestore REST
// ---------------------------------------------------------------------

type FirestoreValueV7 =
  | { readonly stringValue: string }
  | { readonly integerValue: string }
  | { readonly timestampValue: string };

const FIRESTORE_ROOT_V7 = "https://firestore.googleapis.com/v1";

/** `projects/<id>/databases/(default)/documents`. */
export function firestoreDocumentsPathV7(
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): string {
  return `projects/${projectId}/databases/(default)/documents`;
}

/** The URL of a `documents:<method>` call, with the API key. */
export function firestoreUrlV7(
  method: "commit" | "runQuery" | "runAggregationQuery",
  config: Pick<
    typeof FIREBASE_CONFIG_V7,
    "projectId" | "apiKey"
  > = FIREBASE_CONFIG_V7,
): string {
  return `${FIRESTORE_ROOT_V7}/${firestoreDocumentsPathV7(config.projectId)}:${method}?key=${encodeURIComponent(config.apiKey)}`;
}

/** The six fields of a submission as Firestore values (no timestamp). */
export function firestoreFieldsV7(
  entry: LeaderboardSubmissionV7,
): Record<string, FirestoreValueV7> {
  return {
    name: { stringValue: entry.name },
    faction: { stringValue: entry.faction },
    score: { integerValue: String(entry.score) },
    mode: { stringValue: entry.mode },
    rounds: { integerValue: String(entry.rounds) },
    version: { stringValue: entry.version },
  };
}

/**
 * The `documents:commit` body that creates one score: the six fields, the
 * server's time in `timestamp` (a `REQUEST_TIME` transform, which the rules
 * compare with `request.time`), and `exists: false` so it is a create.
 */
export function firestoreCreateBodyV7(
  documentId: string,
  entry: LeaderboardSubmissionV7,
  projectId: string = FIREBASE_CONFIG_V7.projectId,
): object {
  return {
    writes: [
      {
        update: {
          name: `${firestoreDocumentsPathV7(projectId)}/${LEADERBOARD_COLLECTION_V7}/${documentId}`,
          fields: firestoreFieldsV7(entry),
        },
        updateTransforms: [
          { fieldPath: "timestamp", setToServerValue: "REQUEST_TIME" },
        ],
        currentDocument: { exists: false },
      },
    ],
  };
}

function modeFilterV7(mode: LeaderboardModeV7): object {
  return {
    fieldFilter: {
      field: { fieldPath: "mode" },
      op: "EQUAL",
      value: { stringValue: mode },
    },
  };
}

const BY_SCORE_V7 = Object.freeze([
  { field: { fieldPath: "score" }, direction: "DESCENDING" },
]);

/**
 * The top `limit` scores of a mode (`documents:runQuery`). It needs the
 * composite index `mode` ascending, `score` descending (docs/LEADERBOARD.md).
 */
export function firestoreTopQueryBodyV7(
  mode: LeaderboardModeV7,
  limit: number = LEADERBOARD_TOP_V7,
): object {
  return {
    structuredQuery: {
      from: [{ collectionId: LEADERBOARD_COLLECTION_V7 }],
      where: modeFilterV7(mode),
      orderBy: BY_SCORE_V7,
      limit,
    },
  };
}

/**
 * How many scores of a mode are above `score` (`runAggregationQuery`,
 * count): the same index serves it, ordered by score descending.
 */
export function firestoreRankQueryBodyV7(
  mode: LeaderboardModeV7,
  score: number,
): object {
  return {
    structuredAggregationQuery: {
      structuredQuery: {
        from: [{ collectionId: LEADERBOARD_COLLECTION_V7 }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              modeFilterV7(mode),
              {
                fieldFilter: {
                  field: { fieldPath: "score" },
                  op: "GREATER_THAN",
                  value: { integerValue: String(score) },
                },
              },
            ],
          },
        },
        orderBy: BY_SCORE_V7,
      },
      aggregations: [{ alias: "above", count: {} }],
    },
  };
}

function recordV7(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringFieldV7(
  fields: Record<string, unknown>,
  key: string,
): string | null {
  const value = recordV7(fields[key])?.stringValue;
  return typeof value === "string" ? value : null;
}

function integerFieldV7(
  fields: Record<string, unknown>,
  key: string,
): number | null {
  const value = recordV7(fields[key])?.integerValue;
  const number =
    typeof value === "string" && /^-?\d{1,15}$/.test(value)
      ? Number(value)
      : typeof value === "number"
        ? value
        : null;
  return number !== null && Number.isSafeInteger(number) ? number : null;
}

/**
 * The rows of a `runQuery` answer; a row that is not a valid score (the
 * rules should make that impossible) is left out.
 */
export function parseFirestoreTopV7(body: unknown): LeaderboardEntryV7[] {
  if (!Array.isArray(body)) return [];
  const entries: LeaderboardEntryV7[] = [];
  for (const item of body) {
    const document = recordV7(recordV7(item)?.document);
    const fields = recordV7(document?.fields);
    if (document === null || fields === null) continue;
    const name = stringFieldV7(fields, "name");
    const faction = stringFieldV7(fields, "faction");
    const mode = stringFieldV7(fields, "mode");
    const version = stringFieldV7(fields, "version");
    const score = integerFieldV7(fields, "score");
    const rounds = integerFieldV7(fields, "rounds");
    const timestamp = recordV7(fields.timestamp)?.timestampValue;
    const path = typeof document.name === "string" ? document.name : "";
    if (
      name === null ||
      faction === null ||
      mode === null ||
      version === null ||
      score === null ||
      rounds === null
    )
      continue;
    const entry: LeaderboardEntryV7 = {
      id: path.slice(path.lastIndexOf("/") + 1),
      name,
      faction: faction as FactionIdV7,
      score,
      mode: mode as LeaderboardModeV7,
      rounds,
      version,
      timestamp: typeof timestamp === "string" ? timestamp : null,
    };
    if (leaderboardFieldProblemsV7(entry).length === 0) entries.push(entry);
  }
  return entries;
}

/** The count of a `runAggregationQuery` answer, or null. */
export function parseFirestoreCountV7(body: unknown): number | null {
  if (!Array.isArray(body)) return null;
  for (const item of body) {
    const fields = recordV7(recordV7(recordV7(item)?.result)?.aggregateFields);
    if (fields === null) continue;
    const count = integerFieldV7(fields, "above");
    if (count !== null && count >= 0) return count;
  }
  return null;
}

// ---------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------

/** Why a request failed, as the screens say it. */
export type LeaderboardFailureV7 = "OFFLINE" | "TIMEOUT" | "REFUSED" | "ERROR";

/** The line a screen shows for a failure. */
export function leaderboardFailureTextV7(reason: LeaderboardFailureV7): string {
  switch (reason) {
    case "OFFLINE":
      return "You're offline. The leaderboard needs the internet.";
    case "TIMEOUT":
      return "The leaderboard didn't answer in time.";
    case "REFUSED":
      return "The leaderboard turned the request down.";
    case "ERROR":
      return "Couldn't reach the leaderboard.";
  }
}

/** A board's title: "Domination" or "Perfection". */
export function leaderboardModeLabelV7(mode: LeaderboardModeV7): string {
  return mode === "PERFECTION" ? "Perfection" : "Domination";
}

export class LeaderboardErrorV7 extends Error {
  constructor(readonly reason: LeaderboardFailureV7) {
    super(`Leaderboard: ${reason}`);
    this.name = "LeaderboardErrorV7";
  }
}

/** Where scores are kept: Firestore, or memory. */
export interface LeaderboardBackendV7 {
  top(mode: LeaderboardModeV7, limit: number): Promise<LeaderboardEntryV7[]>;
  /** Stores a score; returns its document id. */
  submit(entry: LeaderboardSubmissionV7): Promise<string>;
  /** How many scores of `mode` are strictly above `score`. */
  countAbove(mode: LeaderboardModeV7, score: number): Promise<number>;
}

export type LeaderboardFetchV7 = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

/** A 20-character document id, like Firestore's own. */
export function leaderboardDocumentIdV7(
  random: () => number = () => Math.random(),
): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let index = 0; index < 20; index += 1)
    id += alphabet[Math.floor(random() * alphabet.length) % alphabet.length];
  return id;
}

/**
 * Firestore over REST. `fetch` is the browser's (a test passes a stub);
 * every call gives up after `timeoutMs`, and an answer that is not a 2xx is
 * a {@link LeaderboardErrorV7}.
 */
export function firestoreLeaderboardBackendV7(options: {
  readonly fetch: LeaderboardFetchV7;
  readonly timeoutMs?: number;
  readonly random?: () => number;
  readonly online?: () => boolean;
}): LeaderboardBackendV7 {
  const timeoutMs = options.timeoutMs ?? LEADERBOARD_TIMEOUT_MS_V7;
  const call = async (
    method: "commit" | "runQuery" | "runAggregationQuery",
    body: object,
  ): Promise<unknown> => {
    if (options.online?.() === false) throw new LeaderboardErrorV7("OFFLINE");
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new LeaderboardErrorV7("TIMEOUT"));
      }, timeoutMs);
    });
    try {
      const response = await Promise.race([
        options.fetch(firestoreUrlV7(method), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          // Never from a cache, and no cookies: the answer is always new.
          cache: "no-store",
          credentials: "omit",
          ...(controller === null ? {} : { signal: controller.signal }),
        }),
        timeout,
      ]);
      if (!response.ok)
        throw new LeaderboardErrorV7(
          response.status === 403 || response.status === 400
            ? "REFUSED"
            : "ERROR",
        );
      return await Promise.race([response.json() as Promise<unknown>, timeout]);
    } catch (error) {
      if (error instanceof LeaderboardErrorV7) throw error;
      throw new LeaderboardErrorV7(
        options.online?.() === false ? "OFFLINE" : "ERROR",
      );
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    async top(mode, limit) {
      return parseFirestoreTopV7(
        await call("runQuery", firestoreTopQueryBodyV7(mode, limit)),
      );
    },
    async submit(entry) {
      const id = leaderboardDocumentIdV7(options.random);
      await call("commit", firestoreCreateBodyV7(id, entry));
      return id;
    },
    async countAbove(mode, score) {
      const count = parseFirestoreCountV7(
        await call(
          "runAggregationQuery",
          firestoreRankQueryBodyV7(mode, score),
        ),
      );
      if (count === null) throw new LeaderboardErrorV7("ERROR");
      return count;
    },
  };
}

/**
 * A board in memory: the development server's, the tests', the review
 * scripts'. It applies the same field checks as the rules.
 */
export function memoryLeaderboardBackendV7(
  seed: readonly LeaderboardEntryV7[] = [],
  now: () => Date = () => new Date(),
): LeaderboardBackendV7 & { readonly entries: LeaderboardEntryV7[] } {
  const entries: LeaderboardEntryV7[] = [...seed];
  let next = 0;
  const sorted = (mode: LeaderboardModeV7): LeaderboardEntryV7[] =>
    entries
      .filter((entry) => entry.mode === mode)
      .sort(
        (left, right) =>
          right.score - left.score ||
          (left.timestamp ?? "").localeCompare(right.timestamp ?? ""),
      );
  return {
    entries,
    async top(mode, limit) {
      return sorted(mode).slice(0, limit);
    },
    async submit(entry) {
      if (leaderboardFieldProblemsV7(entry).length > 0)
        throw new LeaderboardErrorV7("REFUSED");
      next += 1;
      const id = `local-${next}`;
      entries.push({ ...entry, id, timestamp: now().toISOString() });
      return id;
    },
    async countAbove(mode, score) {
      return leaderboardRankV7(sorted(mode), score) - 1;
    },
  };
}

/** The rows `?leaderboard-preview=1` puts on the in-memory board. */
export function leaderboardPreviewEntriesV7(): LeaderboardEntryV7[] {
  const rows: [string, FactionIdV7, number, LeaderboardModeV7, number][] = [
    ["Captain Nova", "MARTIAN", 1412, "DOMINATION", 41],
    ["Grumblebeard", "DWARF", 1180, "DOMINATION", 37],
    ["Rex", "DINOSAUR", 975, "DOMINATION", 29],
    ["Lady Frost", "ICE_FOLK", 802, "DOMINATION", 33],
    ["Sugar Plum", "CANDY", 640, "DOMINATION", 26],
    ["Snaggletooth", "GOBLIN", 512, "DOMINATION", 24],
    ["Count Dread", "UNDEAD", 455, "DOMINATION", 31],
    ["The Whisperer", "CULT", 1033, "PERFECTION", 30],
    ["Doc Savage", "ORIGINAL", 921, "PERFECTION", 30],
    ["Zorg", "MARTIAN", 744, "PERFECTION", 30],
  ];
  return rows.map(([name, faction, score, mode, rounds], index) => ({
    id: `preview-${index + 1}`,
    name,
    faction,
    score,
    mode,
    rounds,
    version: RULESET_7_ID,
    timestamp: new Date(Date.UTC(2026, 9, 1 + index)).toISOString(),
  }));
}

// ---------------------------------------------------------------------
// The game's leaderboard
// ---------------------------------------------------------------------

export type LeaderboardLoadV7 =
  | {
      readonly ok: true;
      readonly entries: readonly LeaderboardEntryV7[];
      readonly fetchedAt: number;
    }
  | { readonly ok: false; readonly reason: LeaderboardFailureV7 };

/** A match already sent: where it stood (null if the rank was not read). */
export interface LeaderboardSentV7 {
  readonly mode: LeaderboardModeV7;
  readonly id: string;
  readonly score: number;
  readonly rank: number | null;
}

export type LeaderboardSubmitResultV7 =
  | ({ readonly ok: true } & LeaderboardSentV7)
  | {
      readonly ok: false;
      readonly reason: "NAME";
      readonly problem: LeaderboardNameProblemV7;
    }
  | { readonly ok: false; readonly reason: LeaderboardFailureV7 | "BUSY" };

export interface GameLeaderboardV7 {
  /** False where there is no board: no menu entry, no submit. */
  readonly available: boolean;
  /** True on the deployed site (the real store). */
  readonly live: boolean;
  /** The board of `mode` fetched within the cache time, or null. */
  cached(mode: LeaderboardModeV7): LeaderboardLoadV7 | null;
  /** The board of `mode`; the cache unless `fresh`. Never rejects. */
  load(
    mode: LeaderboardModeV7,
    options?: { readonly fresh?: boolean },
  ): Promise<LeaderboardLoadV7>;
  /** The last name submitted from this browser ("" if none). */
  lastName(): string;
  /** The match `matchKey` was sent from this browser: where it stood. */
  sent(matchKey: string): LeaderboardSentV7 | null;
  /** True for a row this browser submitted. */
  own(id: string): boolean;
  /** Sends a claim under `name`, once per match. Never rejects. */
  submit(
    claim: LeaderboardClaimV7,
    name: string,
  ): Promise<LeaderboardSubmitResultV7>;
}

/** No board (tests that do not ask for one). */
export const NO_LEADERBOARD_V7: GameLeaderboardV7 = Object.freeze({
  available: false,
  live: false,
  cached: () => null,
  load: async () => ({ ok: false as const, reason: "ERROR" as const }),
  lastName: () => "",
  sent: () => null,
  own: () => false,
  submit: async () => ({ ok: false as const, reason: "ERROR" as const }),
});

interface StoredSentV7 extends LeaderboardSentV7 {
  readonly key: string;
}

function readSentV7(storage: StorageAdapter | null): StoredSentV7[] {
  try {
    const raw = storage?.getItem(LEADERBOARD_SUBMITTED_STORAGE_KEY_V7);
    if (raw === null || raw === undefined) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredSentV7 => {
      const record = recordV7(item);
      return (
        record !== null &&
        typeof record.key === "string" &&
        typeof record.id === "string" &&
        (record.mode === "DOMINATION" || record.mode === "PERFECTION") &&
        typeof record.score === "number" &&
        (record.rank === null || typeof record.rank === "number")
      );
    });
  } catch {
    return [];
  }
}

function failureOfV7(error: unknown): LeaderboardFailureV7 {
  return error instanceof LeaderboardErrorV7 ? error.reason : "ERROR";
}

/** The game's board over a backend, remembering what this browser sent. */
export function createGameLeaderboardV7(
  backend: LeaderboardBackendV7,
  options: {
    readonly storage: StorageAdapter | null;
    readonly live: boolean;
    readonly now?: () => number;
    readonly cacheMs?: number;
    readonly limit?: number;
  },
): GameLeaderboardV7 {
  const storage = options.storage;
  const now = options.now ?? (() => Date.now());
  const cacheMs = options.cacheMs ?? LEADERBOARD_CACHE_MS_V7;
  const limit = options.limit ?? LEADERBOARD_TOP_V7;
  const boards = new Map<LeaderboardModeV7, LeaderboardLoadV7>();
  const pending = new Map<LeaderboardModeV7, Promise<LeaderboardLoadV7>>();
  // Kept here too, for a browser whose storage refuses the write.
  const sent = new Map<string, StoredSentV7>(
    readSentV7(storage).map((item) => [item.key, item]),
  );
  const sending = new Set<string>();
  let name = "";
  try {
    name = storage?.getItem(LEADERBOARD_NAME_STORAGE_KEY_V7) ?? "";
  } catch {
    name = "";
  }

  const remember = (item: StoredSentV7): void => {
    sent.set(item.key, item);
    try {
      const list = [
        ...readSentV7(storage).filter((old) => old.key !== item.key),
        item,
      ];
      storage?.setItem(
        LEADERBOARD_SUBMITTED_STORAGE_KEY_V7,
        JSON.stringify(list.slice(-SUBMITTED_KEEP_V7)),
      );
    } catch {
      // Remembered for this visit only.
    }
  };

  const fresh = (mode: LeaderboardModeV7): LeaderboardLoadV7 | null => {
    const board = boards.get(mode);
    return board !== undefined && board.ok && now() - board.fetchedAt < cacheMs
      ? board
      : null;
  };

  return {
    available: true,
    live: options.live,
    cached: fresh,
    load(mode, loadOptions = {}) {
      if (loadOptions.fresh !== true) {
        const board = fresh(mode);
        if (board !== null) return Promise.resolve(board);
      }
      const running = pending.get(mode);
      if (running !== undefined) return running;
      const request = (async (): Promise<LeaderboardLoadV7> => {
        try {
          const entries = await backend.top(mode, limit);
          const board: LeaderboardLoadV7 = {
            ok: true,
            entries,
            fetchedAt: now(),
          };
          boards.set(mode, board);
          return board;
        } catch (error) {
          return { ok: false, reason: failureOfV7(error) };
        } finally {
          pending.delete(mode);
        }
      })();
      pending.set(mode, request);
      return request;
    },
    lastName: () => name,
    sent(matchKey) {
      const item = sent.get(matchKey);
      return item === undefined
        ? null
        : { mode: item.mode, id: item.id, score: item.score, rank: item.rank };
    },
    own(id) {
      for (const item of sent.values()) if (item.id === id) return true;
      return false;
    },
    async submit(claim, typed) {
      const already = sent.get(claim.matchKey);
      if (already !== undefined)
        return {
          ok: true,
          mode: already.mode,
          id: already.id,
          score: already.score,
          rank: already.rank,
        };
      const clean = normalizeLeaderboardNameV7(typed);
      const problem = leaderboardNameProblemV7(clean);
      if (problem !== null) return { ok: false, reason: "NAME", problem };
      if (sending.has(claim.matchKey)) return { ok: false, reason: "BUSY" };
      sending.add(claim.matchKey);
      try {
        const entry: LeaderboardSubmissionV7 = {
          name: clean,
          faction: claim.faction,
          score: claim.score,
          mode: claim.mode,
          rounds: claim.rounds,
          version: claim.version,
        };
        if (leaderboardFieldProblemsV7(entry).length > 0)
          return { ok: false, reason: "REFUSED" };
        const id = await backend.submit(entry);
        name = clean;
        try {
          storage?.setItem(LEADERBOARD_NAME_STORAGE_KEY_V7, clean);
        } catch {
          // The name is remembered for this visit only.
        }
        boards.delete(claim.mode);
        let rank: number | null = null;
        try {
          rank = (await backend.countAbove(claim.mode, claim.score)) + 1;
        } catch {
          // Sent, but where it stands is not known: the board will say.
        }
        const item: StoredSentV7 = {
          key: claim.matchKey,
          mode: claim.mode,
          id,
          score: claim.score,
          rank,
        };
        remember(item);
        return { ok: true, mode: item.mode, id, score: item.score, rank };
      } catch (error) {
        return { ok: false, reason: failureOfV7(error) };
      } finally {
        sending.delete(claim.matchKey);
      }
    },
  };
}

/** LIVE: the real store. STUB: a board in memory. */
export type LeaderboardBackendModeV7 = "LIVE" | "STUB";

/**
 * Only a production build on the real site, not driven by automation and
 * not a smoke run, talks to Firestore; everything else gets the in-memory
 * board.
 */
export function leaderboardModeV7(
  env: AnalyticsEnvironmentV7,
): LeaderboardBackendModeV7 {
  let smoke: boolean;
  try {
    smoke = new URLSearchParams(env.search).get("browser-smoke") === "1";
  } catch {
    return "STUB";
  }
  return env.production &&
    !env.webdriver &&
    !smoke &&
    !localHostV7(env.hostname)
    ? "LIVE"
    : "STUB";
}

/** The page's board: Firestore on the deployed site, memory elsewhere. */
export function browserGameLeaderboardV7(
  production: boolean,
  window: Window | undefined = globalThis.window,
): GameLeaderboardV7 {
  try {
    if (window === undefined) return NO_LEADERBOARD_V7;
    let storage: StorageAdapter | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const mode = leaderboardModeV7({
      production,
      hostname: window.location.hostname,
      search: window.location.search,
      webdriver: window.navigator.webdriver === true,
    });
    if (mode === "STUB") {
      let preview = false;
      try {
        preview =
          new URLSearchParams(window.location.search).get(
            LEADERBOARD_PREVIEW_PARAMETER_V7,
          ) === "1";
      } catch {
        preview = false;
      }
      return createGameLeaderboardV7(
        memoryLeaderboardBackendV7(
          preview ? leaderboardPreviewEntriesV7() : [],
        ),
        { storage, live: false },
      );
    }
    const crypto = window.crypto;
    const random =
      crypto !== undefined && typeof crypto.getRandomValues === "function"
        ? () =>
            (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 0x1_0000_0000
        : () => Math.random();
    return createGameLeaderboardV7(
      firestoreLeaderboardBackendV7({
        fetch: (url, init) => window.fetch(url, init),
        random,
        online: () => window.navigator.onLine !== false,
      }),
      { storage, live: true },
    );
  } catch {
    return NO_LEADERBOARD_V7;
  }
}
