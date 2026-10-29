import { LEADERBOARD_NAME_PATTERN_V7 } from "../app/leaderboard-v7";
import { FACTION_IDS_V7 } from "../engine/v7/types";
import { ROOM_CODE_PATTERN_V7 } from "./room-code";
import {
  ONLINE_COMMAND_JSON_MAX_V7,
  ONLINE_OPTIONS_JSON_MAX_V7,
  ONLINE_SEATS_MAX_V7,
  ONLINE_SETUP_JSON_MAX_V7,
  onlineErrorV7,
  onlineOkV7,
  type OnlineAppendV7,
  type OnlineCreateInputV7,
  type OnlineJoinInputV7,
  type OnlineLobbyPatchV7,
  type OnlineMatchRecordV7,
  type OnlineMoveRecordV7,
  type OnlineResultV7,
  type OnlineStartInputV7,
} from "./types";

/**
 * The match rules in TypeScript (`pulp_wars-eqc6.1`): what
 * `firebase/firestore.rules` allows, applied by the in-memory and two-tab
 * local stores so that they refuse what Firestore would refuse. Each check
 * names the rule function it mirrors. The client also runs them before a
 * Firestore write, so a refusal has a clear code instead of a bare 403.
 */

/** A display name: the leaderboard's pattern, 1 to 16 characters. */
export function onlineNameValidV7(name: unknown): name is string {
  return typeof name === "string" && LEADERBOARD_NAME_PATTERN_V7.test(name);
}

/** A faction pick: a faction ID or `RANDOM` (`isPick`). */
export function onlinePickValidV7(pick: unknown): pick is string {
  return (
    pick === "RANDOM" ||
    (typeof pick === "string" &&
      (FACTION_IDS_V7 as readonly string[]).includes(pick))
  );
}

/** A ruleset id such as `pulp-wars-poc-7r120` (`isRulesetId`). */
export function onlineRulesetIdValidV7(id: unknown): id is string {
  return typeof id === "string" && /^pulp-wars-[a-z0-9-]{1,24}$/.test(id);
}

function jsonTextValid(text: unknown, max: number): text is string {
  return typeof text === "string" && text.length >= 2 && text.length <= max;
}

/** `isNewMatch`: the host creates a lobby under a well-formed code. */
export function createMatchRecordV7(
  uid: string,
  code: string,
  input: OnlineCreateInputV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (
    !ROOM_CODE_PATTERN_V7.test(code) ||
    !onlineRulesetIdValidV7(input.rulesetId) ||
    !onlineNameValidV7(input.hostName) ||
    !onlinePickValidV7(input.hostPick) ||
    !jsonTextValid(input.optionsJson, ONLINE_OPTIONS_JSON_MAX_V7)
  )
    return onlineErrorV7("INVALID", "The new match is malformed.");
  return onlineOkV7({
    code,
    rulesetId: input.rulesetId,
    status: "LOBBY",
    hostUid: uid,
    hostName: input.hostName,
    hostPick: input.hostPick,
    guestUid: "",
    guestName: "",
    guestPick: "RANDOM",
    guestReady: false,
    optionsJson: input.optionsJson,
    setupJson: "",
    driverUids: [],
    moveCount: 0,
    turnSeat: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** `isGuestJoin`: a signed-in player other than the host takes the free seat. */
export function joinMatchRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  input: OnlineJoinInputV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (before.status !== "LOBBY")
    return onlineErrorV7("NOT_LOBBY", "The match has already started.");
  if (before.guestUid !== "")
    return onlineErrorV7("SEAT_TAKEN", "The seat is already taken.");
  if (uid === before.hostUid)
    return onlineErrorV7("FORBIDDEN", "The host cannot take the guest seat.");
  if (
    !onlineNameValidV7(input.name) ||
    !onlinePickValidV7(input.pick) ||
    typeof input.ready !== "boolean"
  )
    return onlineErrorV7("INVALID", "The seat details are malformed.");
  return onlineOkV7({
    ...before,
    guestUid: uid,
    guestName: input.name,
    guestPick: input.pick,
    guestReady: input.ready,
    updatedAt: now,
  });
}

const HOST_PATCH_KEYS_V7 = ["hostName", "hostPick", "optionsJson"] as const;
const GUEST_PATCH_KEYS_V7 = [
  "guestName",
  "guestPick",
  "guestReady",
  "leaveSeat",
] as const;

/**
 * `isHostLobbyEdit` and `isGuestLobbyEdit`: in the lobby, the host edits
 * its name, pick and the options; the guest its name, pick and ready flag,
 * or leaves the seat free again.
 */
export function patchLobbyRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  patch: OnlineLobbyPatchV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (before.status !== "LOBBY")
    return onlineErrorV7("NOT_LOBBY", "The match has already started.");
  const keys = Object.keys(patch).filter(
    (key) => patch[key as keyof OnlineLobbyPatchV7] !== undefined,
  );
  const host = uid === before.hostUid;
  const guest = before.guestUid !== "" && uid === before.guestUid;
  const allowed: readonly string[] = host
    ? HOST_PATCH_KEYS_V7
    : guest
      ? GUEST_PATCH_KEYS_V7
      : [];
  if (keys.length === 0 || !keys.every((key) => allowed.includes(key)))
    return onlineErrorV7("FORBIDDEN", "Only your own seat can be changed.");
  if (patch.leaveSeat === true) {
    if (keys.length !== 1)
      return onlineErrorV7("INVALID", "Leaving the seat changes nothing else.");
    return onlineOkV7({
      ...before,
      guestUid: "",
      guestName: "",
      guestPick: "RANDOM",
      guestReady: false,
      updatedAt: now,
    });
  }
  if (
    (patch.hostName !== undefined && !onlineNameValidV7(patch.hostName)) ||
    (patch.guestName !== undefined && !onlineNameValidV7(patch.guestName)) ||
    (patch.hostPick !== undefined && !onlinePickValidV7(patch.hostPick)) ||
    (patch.guestPick !== undefined && !onlinePickValidV7(patch.guestPick)) ||
    (patch.guestReady !== undefined && typeof patch.guestReady !== "boolean") ||
    (patch.optionsJson !== undefined &&
      !jsonTextValid(patch.optionsJson, ONLINE_OPTIONS_JSON_MAX_V7))
  )
    return onlineErrorV7("INVALID", "The lobby change is malformed.");
  return onlineOkV7({
    ...before,
    ...(patch.hostName === undefined ? {} : { hostName: patch.hostName }),
    ...(patch.hostPick === undefined ? {} : { hostPick: patch.hostPick }),
    ...(patch.optionsJson === undefined
      ? {}
      : { optionsJson: patch.optionsJson }),
    ...(patch.guestName === undefined ? {} : { guestName: patch.guestName }),
    ...(patch.guestPick === undefined ? {} : { guestPick: patch.guestPick }),
    ...(patch.guestReady === undefined ? {} : { guestReady: patch.guestReady }),
    updatedAt: now,
  });
}

/**
 * `isStart`: the host starts a lobby whose guest seat is taken, with the
 * setup, the drivers (host for seat 0 and every AI seat, guest for seat 1)
 * and the first seat to move.
 */
export function startMatchRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  input: OnlineStartInputV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (before.status !== "LOBBY")
    return onlineErrorV7("NOT_LOBBY", "The match has already started.");
  if (uid !== before.hostUid)
    return onlineErrorV7("FORBIDDEN", "Only the host starts the match.");
  if (before.guestUid === "")
    return onlineErrorV7("FORBIDDEN", "The guest seat is still free.");
  const drivers = input.driverUids;
  if (
    !jsonTextValid(input.setupJson, ONLINE_SETUP_JSON_MAX_V7) ||
    drivers.length < 2 ||
    drivers.length > ONLINE_SEATS_MAX_V7 ||
    drivers[0] !== before.hostUid ||
    drivers[1] !== before.guestUid ||
    !drivers.every(
      (driver) => driver === before.hostUid || driver === before.guestUid,
    ) ||
    !Number.isSafeInteger(input.turnSeat) ||
    input.turnSeat < 0 ||
    input.turnSeat >= drivers.length
  )
    return onlineErrorV7("INVALID", "The start is malformed.");
  return onlineOkV7({
    ...before,
    status: "ACTIVE",
    setupJson: input.setupJson,
    driverUids: [...drivers],
    turnSeat: input.turnSeat,
    updatedAt: now,
  });
}

/**
 * `isValidMove` and `isMoveBump`: the driver of the seat whose turn it is
 * appends move `moveCount` (never an index already in the log) and the
 * match moves on to `moveCount + 1` in the same write.
 */
export function appendMoveRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  move: OnlineAppendV7,
  taken: boolean,
  now: string,
): OnlineResultV7<{
  readonly match: OnlineMatchRecordV7;
  readonly move: OnlineMoveRecordV7;
}> {
  if (before.status !== "ACTIVE")
    return onlineErrorV7("NOT_ACTIVE", "The match is not being played.");
  if (taken || move.index !== before.moveCount)
    return onlineErrorV7("INDEX_TAKEN", "That move was already played.");
  if (
    move.seat !== before.turnSeat ||
    before.driverUids[before.turnSeat] !== uid
  )
    return onlineErrorV7("FORBIDDEN", "It is not your turn.");
  if (
    !jsonTextValid(move.commandJson, ONLINE_COMMAND_JSON_MAX_V7) ||
    !/^[0-9a-f]{64}$/.test(move.stateHash) ||
    !Number.isSafeInteger(move.nextTurnSeat) ||
    move.nextTurnSeat < 0 ||
    move.nextTurnSeat >= before.driverUids.length ||
    typeof move.finished !== "boolean"
  )
    return onlineErrorV7("INVALID", "The move is malformed.");
  return onlineOkV7({
    match: {
      ...before,
      moveCount: before.moveCount + 1,
      turnSeat: move.nextTurnSeat,
      status: move.finished ? "FINISHED" : "ACTIVE",
      updatedAt: now,
    },
    move: {
      index: move.index,
      seat: move.seat,
      uid,
      commandJson: move.commandJson,
      stateHash: move.stateHash,
      createdAt: now,
    },
  });
}

/**
 * `isForfeit` (`pulp_wars-eqc6.5`): a seated player gives up a game in
 * play, for their own seat only, on anyone's turn: the status becomes
 * `FINISHED` with `forfeitSeat` and `forfeitUid`, and nothing else
 * changes.
 */
export function forfeitMatchRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (before.status !== "ACTIVE")
    return onlineErrorV7("NOT_ACTIVE", "The match is not being played.");
  const seat =
    uid === ""
      ? null
      : uid === before.hostUid
        ? 0
        : uid === before.guestUid
          ? 1
          : null;
  if (seat === null)
    return onlineErrorV7("FORBIDDEN", "Only a seated player can forfeit.");
  return onlineOkV7({
    ...before,
    status: "FINISHED",
    forfeitSeat: seat,
    forfeitUid: uid,
    updatedAt: now,
  });
}

/** `isLeave`: a seated player abandons a lobby or a game in play. */
export function abandonMatchRecordV7(
  uid: string,
  before: OnlineMatchRecordV7,
  now: string,
): OnlineResultV7<OnlineMatchRecordV7> {
  if (before.status !== "LOBBY" && before.status !== "ACTIVE")
    return onlineErrorV7("NOT_ACTIVE", "The match is already over.");
  if (uid !== before.hostUid && (uid !== before.guestUid || uid === ""))
    return onlineErrorV7("FORBIDDEN", "Only a seated player can leave.");
  return onlineOkV7({ ...before, status: "ABANDONED", updatedAt: now });
}
