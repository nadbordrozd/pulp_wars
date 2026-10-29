import { createPlayableGameV7 } from "../engine/v7/reducer";
import { canonicalJson } from "../engine/replay/canonical";
import {
  OFFERED_FACTION_IDS_V7,
  RULESET_7_ID,
  type FactionIdV7,
} from "../engine/v7/types";
import { activeSeatOfStateV7 } from "./lockstep";
import {
  buildOnlineSetupV7,
  onlineDriverUidsV7,
  onlineOptionsJsonV7,
  onlineOptionsValidV7,
  parseOnlineMatchV7,
  type FactionPickV7,
  type OnlineMatchOptionsV7,
  type OnlineMatchV7,
} from "./match";
import { cryptoRandomV7, normalizeRoomCodeV7 } from "./room-code";
import {
  onlineErrorV7,
  onlineOkV7,
  type OnlineResultV7,
  type OnlineTransportV7,
} from "./types";

/**
 * The lobby steps (`pulp_wars-eqc6.1`, docs/MULTIPLAYER.md section 8):
 * host, join by code or link, edit, start. The lobby screen
 * (`pulp_wars-eqc6.2`) calls these and watches the match with
 * `transport.watchMatch` (parsed with `parseOnlineMatchV7`).
 */

/** A fresh match seed (uint32). */
export function newOnlineSeedV7(
  random: () => number = cryptoRandomV7(),
): number {
  return Math.floor(random() * 0x1_0000_0000) >>> 0;
}

/** Hosts a lobby: the host takes seat 0 with its name and pick. */
export async function hostOnlineMatchV7(
  transport: OnlineTransportV7,
  input: {
    readonly name: string;
    readonly pick: FactionPickV7;
    readonly options: OnlineMatchOptionsV7;
  },
): Promise<OnlineResultV7<OnlineMatchV7>> {
  if (!onlineOptionsValidV7(input.options))
    return onlineErrorV7("INVALID", "The match options are not valid.");
  const created = await transport.createMatch({
    rulesetId: RULESET_7_ID,
    hostName: input.name,
    hostPick: input.pick,
    optionsJson: onlineOptionsJsonV7(input.options),
  });
  return created.ok ? onlineOkV7(parseOnlineMatchV7(created.value)) : created;
}

/**
 * Joins by a code or a pasted link. Opening one's own match again (the
 * host, or the guest already seated) just returns it: that is how a player
 * resumes. A match of another build is `RULESET_MISMATCH` ("update to
 * join"); a started match one is not seated in is `NOT_LOBBY`.
 */
export async function joinOnlineMatchV7(
  transport: OnlineTransportV7,
  codeOrLink: string,
  input: {
    readonly name: string;
    readonly pick: FactionPickV7;
    readonly ready?: boolean;
  },
): Promise<OnlineResultV7<OnlineMatchV7>> {
  const code = normalizeRoomCodeV7(codeOrLink);
  if (code === null)
    return onlineErrorV7("INVALID", "That is not a room code.");
  const identity = await transport.signIn();
  if (!identity.ok) return identity;
  const read = await transport.getMatch(code);
  if (!read.ok) return read;
  if (read.value === null) return onlineErrorV7("NOT_FOUND", "No such match.");
  const match = parseOnlineMatchV7(read.value);
  if (!match.compatible)
    return onlineErrorV7(
      "RULESET_MISMATCH",
      `The match was made by another version (${match.rulesetId}). Update the game to join.`,
    );
  const uid = identity.value.uid;
  if (match.seats[0].uid === uid || match.seats[1].uid === uid)
    return onlineOkV7(match);
  if (match.status !== "LOBBY")
    return onlineErrorV7("NOT_LOBBY", "The match has already started.");
  if (match.seats[1].uid !== "")
    return onlineErrorV7("SEAT_TAKEN", "The match is full.");
  const joined = await transport.joinMatch(code, {
    name: input.name,
    pick: input.pick,
    ready: input.ready ?? true,
  });
  return joined.ok ? onlineOkV7(parseOnlineMatchV7(joined.value)) : joined;
}

/**
 * Starts the game (the host, once the guest is seated): resolves the
 * picks and the AI seats' factions from the seed, checks the setup starts,
 * and stores it with the drivers and the first seat to move.
 */
export async function startOnlineMatchV7(
  transport: OnlineTransportV7,
  match: OnlineMatchV7,
  pool: readonly FactionIdV7[] = OFFERED_FACTION_IDS_V7,
): Promise<OnlineResultV7<OnlineMatchV7>> {
  if (match.options === null)
    return onlineErrorV7("INVALID", "The match options are unreadable.");
  if (match.seats[1].uid === "")
    return onlineErrorV7("FORBIDDEN", "Wait for a second player.");
  const built = buildOnlineSetupV7(
    match.options,
    match.seats[0].pick,
    match.seats[1].pick,
    pool,
  );
  if (!built.ok) return onlineErrorV7("INVALID", built.code);
  const created = createPlayableGameV7(built.setup);
  if (!created.ok) return onlineErrorV7("INVALID", created.error.code);
  const started = await transport.startMatch(match.code, {
    setupJson: canonicalJson(built.setup),
    driverUids: onlineDriverUidsV7(
      built.setup,
      match.seats[0].uid,
      match.seats[1].uid,
    ),
    turnSeat: activeSeatOfStateV7(created.state),
  });
  return started.ok ? onlineOkV7(parseOnlineMatchV7(started.value)) : started;
}
