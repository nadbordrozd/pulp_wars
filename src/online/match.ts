import { regularBoardSizeV7 } from "../engine/v7/game-kind";
import { difficultyHeadStartCoinsV7 } from "../engine/v7/difficulty";
import {
  BOARD_SIZES_V7,
  GENERATED_MAP_TYPES_V7,
  seatCountAllowedV7,
  type GeneratedMapTypeV7,
} from "../engine/v7/map-scale";
import {
  nextBounded,
  randomState,
  seedFromText,
} from "../engine/random/random";
import { canonicalJson } from "../engine/replay/canonical";
import { hasExactKeysV7, isUint32V7 } from "../engine/v7/schema";
import { validateMatchSetupV7 } from "../engine/v7/setup";
import {
  DIFFICULTIES_V7,
  FACTION_IDS_V7,
  GAME_MODES_V7,
  MAP_GENERATION_REVISION_V7,
  OFFERED_FACTION_IDS_V7,
  RULESET_7_ID,
  type BoardSizeV7,
  type DifficultyV7,
  type FactionIdV7,
  type GameModeV7,
  type MatchSetupV7,
} from "../engine/v7/types";
import {
  GUEST_SEAT_V7,
  HOST_SEAT_V7,
  ONLINE_HUMAN_SEATS_V7,
  type OnlineMatchRecordV7,
  type OnlineMatchStatusV7,
} from "./types";

/**
 * Online match options, faction picks, the resolved setup, and the typed
 * match (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md sections 2 and 4).
 *
 * Seats: the host is seat 0 and the guest seat 1, both human
 * (`MatchSetupV7.humanSeats` `[0, 1]`); seats 2 and up are AI seats, which
 * the host's browser drives. Each human picks a faction or `RANDOM`; AI
 * seats are always random. The randomness is resolved once, by the host at
 * Start, from the match seed ({@link resolveOnlineFactionsV7}), and the
 * resolved setup is stored in the match, so both browsers build the same
 * game.
 */

/** A human's faction choice. */
export type FactionPickV7 = FactionIdV7 | "RANDOM";

/** The most AI seats beside the two humans (nine factions, nine seats). */
export const ONLINE_AI_SEATS_MAX_V7 = FACTION_IDS_V7.length - 2;

/** What the host chooses in the lobby; the setup is built from it. */
export interface OnlineMatchOptionsV7 {
  /** The match seed (map and factions), drawn when the lobby is made. */
  readonly seed: number;
  readonly mapType: GeneratedMapTypeV7;
  readonly width: BoardSizeV7;
  /** AI opponents beside the two humans: 0 to {@link ONLINE_AI_SEATS_MAX_V7}. */
  readonly aiSeats: number;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  /** The AI seats' difficulty; humans never get a head start. */
  readonly difficulty: DifficultyV7;
  readonly gameMode: GameModeV7;
  readonly curiosities: boolean;
}

const OPTION_KEYS_V7 = [
  "aiMode",
  "aiSeats",
  "curiosities",
  "difficulty",
  "gameMode",
  "mapType",
  "seed",
  "width",
] as const;

/** The default map of an online match (the skirmish default). */
export const ONLINE_DEFAULT_MAP_TYPE_V7: GeneratedMapTypeV7 = "CONTINENTS";

/**
 * The streamlined defaults (the new skirmish game's): Continents at the
 * regular size for the seats, Free-for-all, Normal, Domination,
 * Curiosities on.
 */
export function defaultOnlineOptionsV7(
  seed: number,
  aiSeats = 0,
): OnlineMatchOptionsV7 {
  return {
    seed,
    mapType: ONLINE_DEFAULT_MAP_TYPE_V7,
    width: onlineBoardSizeV7(ONLINE_DEFAULT_MAP_TYPE_V7, aiSeats),
    aiSeats,
    aiMode: "RIVAL",
    difficulty: "NORMAL",
    gameMode: "DOMINATION",
    curiosities: true,
  };
}

/** The regular board size for two humans and `aiSeats` AI seats. */
export function onlineBoardSizeV7(
  mapType: GeneratedMapTypeV7,
  aiSeats: number,
): BoardSizeV7 {
  return regularBoardSizeV7(mapType, aiSeats + 1);
}

/** Whether options are well formed and the board holds the seats. */
export function onlineOptionsValidV7(
  input: unknown,
): input is OnlineMatchOptionsV7 {
  return (
    hasExactKeysV7(input, OPTION_KEYS_V7) &&
    isUint32V7(input.seed) &&
    GENERATED_MAP_TYPES_V7.includes(input.mapType as GeneratedMapTypeV7) &&
    BOARD_SIZES_V7.includes(input.width as BoardSizeV7) &&
    typeof input.aiSeats === "number" &&
    Number.isSafeInteger(input.aiSeats) &&
    input.aiSeats >= 0 &&
    input.aiSeats <= ONLINE_AI_SEATS_MAX_V7 &&
    seatCountAllowedV7(
      input.width as number,
      input.mapType as GeneratedMapTypeV7,
      input.aiSeats + 2,
    ) &&
    (input.aiMode === "RIVAL" || input.aiMode === "COOPERATIVE") &&
    DIFFICULTIES_V7.includes(input.difficulty as DifficultyV7) &&
    GAME_MODES_V7.includes(input.gameMode as GameModeV7) &&
    typeof input.curiosities === "boolean"
  );
}

export function onlineOptionsJsonV7(options: OnlineMatchOptionsV7): string {
  return canonicalJson(options);
}

export function parseOnlineOptionsV7(
  json: string,
): OnlineMatchOptionsV7 | null {
  try {
    const value: unknown = JSON.parse(json);
    return onlineOptionsValidV7(value) ? value : null;
  } catch {
    return null;
  }
}

export function factionPickValidV7(pick: unknown): pick is FactionPickV7 {
  return pick === "RANDOM" || FACTION_IDS_V7.includes(pick as FactionIdV7);
}

export type OnlineFactionsResultV7 =
  | { readonly ok: true; readonly factions: readonly FactionIdV7[] }
  | {
      readonly ok: false;
      /** Two humans picked the same faction, or too few to draw from. */
      readonly code: "DUPLICATE_PICK" | "NOT_ENOUGH_FACTIONS" | "INVALID_PICK";
    };

/**
 * The factions of every seat, deterministic in the seed and the picks:
 * a human's chosen faction is kept (two humans may not choose the same
 * one); then, in seat order, each `RANDOM` human seat and every AI seat
 * draws uniformly from the `pool` factions nobody has yet. The draws use
 * the engine's Mulberry32 seeded from the match seed, so every browser
 * that resolves the same match gets the same factions.
 */
export function resolveOnlineFactionsV7(
  seed: number,
  picks: readonly FactionPickV7[],
  aiSeats: number,
  pool: readonly FactionIdV7[] = OFFERED_FACTION_IDS_V7,
): OnlineFactionsResultV7 {
  if (!picks.every(factionPickValidV7))
    return { ok: false, code: "INVALID_PICK" };
  const chosen = picks.filter((pick): pick is FactionIdV7 => pick !== "RANDOM");
  if (new Set(chosen).size !== chosen.length)
    return { ok: false, code: "DUPLICATE_PICK" };
  const taken = new Set<FactionIdV7>(chosen);
  let random = randomState(seedFromText(`pulp-wars-online-factions:${seed}`));
  const factions: FactionIdV7[] = [];
  for (let seat = 0; seat < picks.length + aiSeats; seat += 1) {
    const pick = picks[seat] ?? "RANDOM";
    if (pick !== "RANDOM") {
      factions.push(pick);
      continue;
    }
    const open = pool.filter((faction) => !taken.has(faction));
    if (open.length === 0) return { ok: false, code: "NOT_ENOUGH_FACTIONS" };
    const draw = nextBounded(random, open.length);
    random = draw.random;
    const faction = open[draw.value] as FactionIdV7;
    taken.add(faction);
    factions.push(faction);
  }
  return { ok: true, factions };
}

export type OnlineSetupResultV7 =
  | { readonly ok: true; readonly setup: MatchSetupV7 }
  | {
      readonly ok: false;
      readonly code:
        | "INVALID_OPTIONS"
        | "DUPLICATE_PICK"
        | "NOT_ENOUGH_FACTIONS"
        | "INVALID_PICK"
        | "INVALID_SETUP";
    };

/**
 * The setup of an online match: the options, the two humans' picks
 * resolved with the AI seats' random factions, `humanSeats` `[0, 1]`. The
 * AI seats' difficulty gives them its usual head start on this board; with
 * no AI seat the match is Normal.
 */
export function buildOnlineSetupV7(
  options: OnlineMatchOptionsV7,
  hostPick: FactionPickV7,
  guestPick: FactionPickV7,
  pool: readonly FactionIdV7[] = OFFERED_FACTION_IDS_V7,
): OnlineSetupResultV7 {
  if (!onlineOptionsValidV7(options))
    return { ok: false, code: "INVALID_OPTIONS" };
  const factions = resolveOnlineFactionsV7(
    options.seed,
    [hostPick, guestPick],
    options.aiSeats,
    pool,
  );
  if (!factions.ok) return factions;
  const aiCount = options.aiSeats + 1;
  const difficulty: DifficultyV7 =
    options.aiSeats === 0 ? "NORMAL" : options.difficulty;
  const coins = difficultyHeadStartCoinsV7(
    difficulty,
    options.mapType,
    options.width,
    aiCount,
  );
  const validated = validateMatchSetupV7({
    rulesetId: RULESET_7_ID,
    seed: options.seed,
    width: options.width,
    height: options.width,
    aiCount,
    aiDifficulty: difficulty,
    aiMode: options.aiMode,
    humanColor: "CORAL",
    factions: factions.factions,
    mapType: options.mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: options.curiosities,
    gameMode: options.gameMode,
    ...(coins === 0 ? {} : { aiHeadStart: { coins } }),
    humanSeats: ONLINE_HUMAN_SEATS_V7,
  });
  return validated.ok
    ? { ok: true, setup: validated.setup }
    : { ok: false, code: "INVALID_SETUP" };
}

/**
 * A setup an online match may play: valid for this build, a generated map,
 * human seats exactly `[0, 1]`.
 */
export function parseOnlineSetupV7(json: string): MatchSetupV7 | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  const validated = validateMatchSetupV7(value);
  if (!validated.ok) return null;
  const seats = validated.setup.humanSeats;
  return seats !== undefined &&
    seats.length === ONLINE_HUMAN_SEATS_V7.length &&
    seats.every((seat, index) => seat === ONLINE_HUMAN_SEATS_V7[index])
    ? validated.setup
    : null;
}

/** One human seat as the lobby shows it. */
export interface OnlineSeatV7 {
  readonly seat: number;
  /** Empty while the seat is free. */
  readonly uid: string;
  readonly name: string;
  readonly pick: FactionPickV7;
  /** The host is always ready; the guest says so. */
  readonly ready: boolean;
}

/** A match record, typed. */
export interface OnlineMatchV7 {
  readonly code: string;
  readonly rulesetId: string;
  /**
   * False when the match was made by another build (another ruleset): the
   * screens show "update to join" and nothing else is read.
   */
  readonly compatible: boolean;
  readonly status: OnlineMatchStatusV7;
  /** Seat 0 (the host) and seat 1 (the guest). */
  readonly seats: readonly [OnlineSeatV7, OnlineSeatV7];
  /** Null when malformed or incompatible. */
  readonly options: OnlineMatchOptionsV7 | null;
  /** The resolved setup once started; null in the lobby or if unreadable. */
  readonly setup: MatchSetupV7 | null;
  readonly driverUids: readonly string[];
  readonly moveCount: number;
  readonly turnSeat: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /**
   * The forfeit that finished the match (`pulp_wars-eqc6.5`): the seat
   * (0 host, 1 guest) that gave up and its uid; null otherwise.
   */
  readonly forfeit: OnlineForfeitV7 | null;
  readonly record: OnlineMatchRecordV7;
}

/** Who forfeited a match (`pulp_wars-eqc6.5`). */
export interface OnlineForfeitV7 {
  readonly seat: number;
  readonly uid: string;
}

/** A finished record's forfeit, when it is well formed, else null. */
export function onlineForfeitOfV7(
  record: OnlineMatchRecordV7,
): OnlineForfeitV7 | null {
  const { forfeitSeat: seat, forfeitUid: uid } = record;
  if (
    record.status !== "FINISHED" ||
    (seat !== HOST_SEAT_V7 && seat !== GUEST_SEAT_V7) ||
    typeof uid !== "string" ||
    uid === "" ||
    uid !== (seat === HOST_SEAT_V7 ? record.hostUid : record.guestUid)
  )
    return null;
  return { seat, uid };
}

export function parseOnlineMatchV7(record: OnlineMatchRecordV7): OnlineMatchV7 {
  const compatible = record.rulesetId === RULESET_7_ID;
  const pick = (value: string): FactionPickV7 =>
    factionPickValidV7(value) ? value : "RANDOM";
  return {
    code: record.code,
    rulesetId: record.rulesetId,
    compatible,
    status: record.status,
    seats: [
      {
        seat: HOST_SEAT_V7,
        uid: record.hostUid,
        name: record.hostName,
        pick: pick(record.hostPick),
        ready: true,
      },
      {
        seat: GUEST_SEAT_V7,
        uid: record.guestUid,
        name: record.guestName,
        pick: pick(record.guestPick),
        ready: record.guestReady,
      },
    ],
    options: compatible ? parseOnlineOptionsV7(record.optionsJson) : null,
    setup:
      compatible && record.setupJson !== ""
        ? parseOnlineSetupV7(record.setupJson)
        : null,
    driverUids: record.driverUids,
    moveCount: record.moveCount,
    turnSeat: record.turnSeat,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    forfeit: onlineForfeitOfV7(record),
    record,
  };
}

/** The human seat of a uid (0 host, 1 guest), or null for a spectator. */
export function onlineSeatOfUidV7(
  match: Pick<OnlineMatchV7, "seats">,
  uid: string,
): number | null {
  if (uid === "") return null;
  if (match.seats[0].uid === uid) return HOST_SEAT_V7;
  if (match.seats[1].uid === uid) return GUEST_SEAT_V7;
  return null;
}

/** The seats a uid appends moves for: its own, and the AI seats for the host. */
export function drivenSeatsOfUidV7(
  match: Pick<OnlineMatchV7, "driverUids">,
  uid: string,
): readonly number[] {
  return match.driverUids.flatMap((driver, seat) =>
    uid !== "" && driver === uid ? [seat] : [],
  );
}

/** The drivers of a setup's seats: the guest drives seat 1, the host the rest. */
export function onlineDriverUidsV7(
  setup: Pick<MatchSetupV7, "aiCount">,
  hostUid: string,
  guestUid: string,
): readonly string[] {
  return Array.from({ length: setup.aiCount + 1 }, (_, seat) =>
    seat === GUEST_SEAT_V7 ? guestUid : hostUid,
  );
}
