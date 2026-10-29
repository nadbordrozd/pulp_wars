import {
  LEADERBOARD_NAME_STORAGE_KEY_V7,
  leaderboardNameProblemTextV7,
  leaderboardNameProblemV7,
  normalizeLeaderboardNameV7,
} from "../app/leaderboard-v7";
import {
  allowedBoardSizesV7,
  GENERATED_MAP_TYPES_V7,
  type GeneratedMapTypeV7,
} from "../engine/v7/map-scale";
import type { BoardSizeV7 } from "../engine/v7/types";
import type { StorageAdapter } from "../persistence/index";
import {
  hostOnlineMatchV7,
  joinOnlineMatchV7,
  newOnlineSeedV7,
  startOnlineMatchV7,
} from "./lobby";
import { OnlineLockstepV7, type OnlineLockstepOptionsV7 } from "./lockstep";
import {
  onlineHistoryEntryV7,
  type OnlineHistoryEntryV7,
  type OnlineMatchHistoryV7,
} from "./match-history";
import {
  defaultOnlineOptionsV7,
  factionPickValidV7,
  onlineBoardSizeV7,
  onlineOptionsJsonV7,
  onlineOptionsValidV7,
  onlineSeatOfUidV7,
  parseOnlineMatchV7,
  ONLINE_AI_SEATS_MAX_V7,
  type FactionPickV7,
  type OnlineMatchOptionsV7,
  type OnlineMatchV7,
} from "./match";
import {
  JOIN_PARAMETER_V7,
  joinCodeFromSearchV7,
  normalizeRoomCodeV7,
  shareLinkV7,
} from "./room-code";
import {
  GUEST_SEAT_V7,
  HOST_SEAT_V7,
  type OnlineErrorCodeV7,
  type OnlineErrorV7,
  type OnlineMatchRecordV7,
  type OnlineTransportV7,
} from "./types";

/**
 * The lobby session (`pulp_wars-eqc6.2`, docs/MULTIPLAYER.md section 10):
 * everything from "Play online" up to the moment both browsers hold the
 * started match. It has no DOM: the lobby screen
 * (`src/render/dom/online-lobby-view-v7.ts`) draws its state and calls its
 * actions, and the tests drive it directly on the in-memory transport.
 *
 * - **Host** (`host`): a lobby with the remembered settings (the new
 *   skirmish game's defaults the first time) and a fresh seed.
 * - **Join** (`join` with a typed code or pasted link; `openLink` for a
 *   page opened with `?join=CODE`, which previews the lobby and waits for
 *   one Join tap). Opening a lobby one already sits in resumes it.
 * - **In the lobby**: names, picks and (host) the settings are written at
 *   once, and the match is watched, so each side sees the other's changes.
 * - **Start** (host): the factions are resolved and the setup stored; both
 *   sides then open the lockstep client and hand it over
 *   ({@link OnlineMatchHandoffV7}) — the end of the lobby's job.
 * - **Leave**: the guest frees its seat, the host abandons the lobby.
 *
 * Remembered in the settings storage: the display name (the leaderboard's,
 * if no other was given), the faction pick, the host's settings, and the
 * open lobby's code (so a reload finds it again; the page's address also
 * carries `?join=CODE` while a lobby is open). Nothing here touches the
 * single-player save or progress.
 */

export const ONLINE_NAME_STORAGE_KEY_V7 = "pulpWars.online.name.v1";
export const ONLINE_PICK_STORAGE_KEY_V7 = "pulpWars.online.pick.v1";
export const ONLINE_OPTIONS_STORAGE_KEY_V7 = "pulpWars.online.options.v1";
export const ONLINE_LOBBY_STORAGE_KEY_V7 = "pulpWars.online.lobby.v1";

/**
 * What the lobby hands to the in-match screen (`pulp_wars-eqc6.3`) once
 * the host has started: the opened lockstep client, not yet started
 * (call `client.start()` when the match screen is ready to follow it).
 */
export interface OnlineMatchHandoffV7 {
  readonly transport: OnlineTransportV7;
  readonly code: string;
  readonly uid: string;
  /** 0 for the host, 1 for the guest. */
  readonly mySeat: number;
  /** The started match as stored (status `ACTIVE`, or later on a resume). */
  readonly match: OnlineMatchV7;
  readonly client: OnlineLockstepV7;
}

/** The lobby's screens. */
export type OnlineLobbyScreenV7 =
  /** Host a game, or join with a code. */
  | "HOME"
  /** A lobby seen through a link, before the Join tap. */
  | "PREVIEW"
  /** Seated in a lobby (host or guest). */
  | "LOBBY"
  /** The host started: the match is handed over. */
  | "STARTED";

/** What is being waited for. */
export type OnlineLobbyBusyV7 =
  "OPEN" | "HOST" | "JOIN" | "START" | "LEAVE" | null;

/** A line shown to the player: a failure, or what happened. */
export interface OnlineLobbyMessageV7 {
  readonly kind: "error" | "info";
  /** The transport's error code, or the session's own reason. */
  readonly code: OnlineErrorCodeV7 | "CLOSED" | "LEFT" | "NAME" | "PICKS";
  readonly text: string;
}

export interface OnlineLobbyStateV7 {
  readonly screen: OnlineLobbyScreenV7;
  readonly busy: OnlineLobbyBusyV7;
  /** The lobby's code on PREVIEW, LOBBY and STARTED. */
  readonly code: string | null;
  readonly match: OnlineMatchV7 | null;
  /** 0 host, 1 guest, null when not seated (PREVIEW, HOME). */
  readonly mySeat: number | null;
  readonly message: OnlineLobbyMessageV7 | null;
  /** The saved display name; "" while none is saved. */
  readonly name: string;
  /** This player's faction choice (also its seat's, once seated). */
  readonly pick: FactionPickV7;
  /** The host's settings: the open lobby's, else the remembered ones. */
  readonly options: OnlineMatchOptionsV7;
  /** The share link of the open lobby. */
  readonly shareLink: string | null;
  /** Requests are failing (the watch could not read the match). */
  readonly offline: boolean;
  readonly handoff: OnlineMatchHandoffV7 | null;
  /**
   * This player's online matches on this device, newest first
   * (`pulp_wars-eqc6.6`); empty without a track record.
   */
  readonly history: readonly OnlineHistoryEntryV7[];
}

/** The page's address, read and replaced (the browser's `history`). */
export interface OnlineLobbyLocationV7 {
  href(): string;
  replace(href: string): void;
}

export interface OnlineLobbySessionOptionsV7 {
  readonly transport: OnlineTransportV7;
  readonly storage?: StorageAdapter | null;
  readonly location?: OnlineLobbyLocationV7 | null;
  /** Draws seeds; the browser's crypto by default. */
  readonly random?: () => number;
  /** Lockstep options for the opened client (tests). */
  readonly lockstep?: Partial<
    Omit<OnlineLockstepOptionsV7, "transport" | "code" | "uid">
  >;
  /** The watch's poll interval on stores that poll (Firestore). */
  readonly pollMs?: () => number;
  /** This player's track record (`pulp_wars-eqc6.6`). */
  readonly history?: OnlineMatchHistoryV7 | null;
  /** ISO time of a record; the clock by default. */
  readonly now?: () => string;
}

/** The most In progress entries settled from the store per visit. */
export const ONLINE_HISTORY_SETTLE_MAX_V7 = 5;

/** The player-facing line of each failure. */
export function onlineLobbyErrorTextV7(code: OnlineErrorCodeV7): string {
  switch (code) {
    case "RULESET_MISMATCH":
      return "Your friend is on a different version — reload to update.";
    case "SEAT_TAKEN":
      return "That game is full.";
    case "NOT_FOUND":
      return "No game has that code. Check it with your friend.";
    case "NOT_LOBBY":
      return "That game has already started.";
    case "INVALID":
      return "A room code is 5 letters.";
    case "NETWORK":
      return "Can't reach the server. Check your connection and try again.";
    case "AUTH":
      return "Couldn't sign in to online play. Try again in a moment.";
    case "CODE_EXHAUSTED":
      return "Couldn't make a room code. Try again.";
    case "NOT_ACTIVE":
      return "That game is not being played.";
    case "INDEX_TAKEN":
    case "FORBIDDEN":
      return "That didn't work. Try again.";
  }
}

/** The pick a stored value means (Random when it is none). */
function storedPick(value: string | null): FactionPickV7 {
  return value !== null && factionPickValidV7(value) ? value : "RANDOM";
}

/**
 * Options made legal after one change: the size follows a new map or AI
 * count (the regular size for the seats), the AI count shrinks to what the
 * map holds at its largest size.
 */
export function legalOnlineOptionsV7(
  options: OnlineMatchOptionsV7,
  changed: "mapType" | "aiSeats" | "width" | "other",
): OnlineMatchOptionsV7 {
  const mapType: GeneratedMapTypeV7 = GENERATED_MAP_TYPES_V7.includes(
    options.mapType,
  )
    ? options.mapType
    : "CONTINENTS";
  let aiSeats = Math.min(
    ONLINE_AI_SEATS_MAX_V7,
    Math.max(
      0,
      Number.isSafeInteger(options.aiSeats) ? Math.trunc(options.aiSeats) : 0,
    ),
  );
  while (aiSeats > 0 && onlineSizesV7(mapType, aiSeats).length === 0)
    aiSeats -= 1;
  const sizes = onlineSizesV7(mapType, aiSeats);
  const width =
    changed === "mapType" ||
    changed === "aiSeats" ||
    !sizes.includes(options.width)
      ? onlineBoardSizeV7(mapType, aiSeats)
      : options.width;
  const next: OnlineMatchOptionsV7 = { ...options, mapType, aiSeats, width };
  return onlineOptionsValidV7(next)
    ? next
    : { ...defaultOnlineOptionsV7(options.seed, 0) };
}

/** The board sizes that hold two humans and `aiSeats` AI seats. */
export function onlineSizesV7(
  mapType: GeneratedMapTypeV7,
  aiSeats: number,
): readonly BoardSizeV7[] {
  return allowedBoardSizesV7(mapType, aiSeats + 2);
}

/** The most AI seats a map type takes at any size. */
export function onlineMaxAiSeatsV7(mapType: GeneratedMapTypeV7): number {
  let most = 0;
  for (let ai = 0; ai <= ONLINE_AI_SEATS_MAX_V7; ai += 1)
    if (onlineSizesV7(mapType, ai).length > 0) most = ai;
  return most;
}

export class OnlineLobbySessionV7 {
  readonly #transport: OnlineTransportV7;
  readonly #storage: StorageAdapter | null;
  readonly #location: OnlineLobbyLocationV7 | null;
  readonly #random: (() => number) | undefined;
  readonly #lockstep: OnlineLobbySessionOptionsV7["lockstep"];
  readonly #pollMs: (() => number) | undefined;
  readonly #history: OnlineMatchHistoryV7 | null;
  readonly #now: () => string;
  readonly #listeners = new Set<(state: OnlineLobbyStateV7) => void>();
  /** Codes whose In progress entry was already checked against the store. */
  readonly #settled = new Set<string>();
  #state: OnlineLobbyStateV7;
  #uid: string | null = null;
  #stopWatch: (() => void) | null = null;
  #watchedCode: string | null = null;
  #opening = false;
  #destroyed = false;
  /** Bumped by every screen change: a late answer of an older one is dropped. */
  #epoch = 0;

  constructor(options: OnlineLobbySessionOptionsV7) {
    this.#transport = options.transport;
    this.#storage = options.storage ?? null;
    this.#location = options.location ?? null;
    this.#random = options.random;
    this.#lockstep = options.lockstep;
    this.#pollMs = options.pollMs;
    this.#history = options.history ?? null;
    this.#now = options.now ?? (() => new Date().toISOString());
    const name = this.#read(ONLINE_NAME_STORAGE_KEY_V7) ?? "";
    const fallback = this.#read(LEADERBOARD_NAME_STORAGE_KEY_V7) ?? "";
    const saved = [name, fallback]
      .map(normalizeLeaderboardNameV7)
      .find((candidate) => leaderboardNameProblemV7(candidate) === null);
    this.#state = {
      screen: "HOME",
      busy: null,
      code: null,
      match: null,
      mySeat: null,
      message: null,
      name: saved ?? "",
      pick: storedPick(this.#read(ONLINE_PICK_STORAGE_KEY_V7)),
      options: this.#storedOptions(),
      shareLink: null,
      offline: false,
      handoff: null,
      history: this.#readHistory(),
    };
  }

  get state(): OnlineLobbyStateV7 {
    return this.#state;
  }

  get transportKind(): OnlineTransportV7["kind"] {
    return this.#transport.kind;
  }

  /** The code of the lobby remembered from an earlier visit, or null. */
  get rememberedCode(): string | null {
    const stored = this.#read(ONLINE_LOBBY_STORAGE_KEY_V7);
    return stored === null ? null : normalizeRoomCodeV7(stored);
  }

  subscribe(listener: (state: OnlineLobbyStateV7) => void): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  /**
   * The Play online screen opened: a lobby this browser sits in (from the
   * address or remembered) is resumed; otherwise the home screen.
   */
  async enter(): Promise<void> {
    if (this.#state.screen !== "HOME" || this.#state.busy !== null) return;
    this.refreshHistory(true);
    let fromAddress: string | null;
    try {
      fromAddress =
        this.#location === null
          ? null
          : joinCodeFromSearchV7(new URL(this.#location.href()).search);
    } catch {
      fromAddress = null;
    }
    if (fromAddress !== null) {
      await this.openLink(fromAddress);
      return;
    }
    const remembered = this.rememberedCode;
    if (remembered !== null) await this.openLink(remembered, true);
  }

  /**
   * A page opened with a share link (`?join=CODE`): the lobby is shown
   * with one Join tap, or resumed when this browser already sits in it.
   * `quiet` (a remembered code): anything but a resume ends on the home
   * screen without a word, and the code is forgotten.
   */
  async openLink(codeOrLink: string, quiet = false): Promise<void> {
    if (this.#state.busy !== null) return;
    const code = normalizeRoomCodeV7(codeOrLink);
    if (code === null) {
      this.#home(quiet ? null : this.#error("INVALID"));
      return;
    }
    const epoch = this.#begin("OPEN");
    const uid = await this.#signIn();
    if (!this.#current(epoch)) return;
    if (uid === null) return;
    const read = await this.#transport.getMatch(code);
    if (!this.#current(epoch)) return;
    if (!read.ok) return this.#fail(read.error, quiet);
    if (read.value === null) return this.#fail(this.#error("NOT_FOUND"), quiet);
    const match = parseOnlineMatchV7(read.value);
    if (!match.compatible)
      return this.#fail(this.#error("RULESET_MISMATCH"), quiet);
    const seat = onlineSeatOfUidV7(match, uid);
    if (
      seat !== null &&
      (match.status === "LOBBY" || match.status === "ACTIVE")
    ) {
      this.#seated(match, seat);
      return;
    }
    if (match.status === "ABANDONED" || match.status === "FINISHED")
      return this.#fail(
        quiet
          ? null
          : { kind: "info", code: "CLOSED", text: "That game is over." },
        quiet,
      );
    if (match.status !== "LOBBY")
      return this.#fail(this.#error("NOT_LOBBY"), quiet);
    if (match.seats[1].uid !== "")
      return this.#fail(this.#error("SEAT_TAKEN"), quiet);
    if (quiet) return this.#fail(null, true);
    this.#set({
      screen: "PREVIEW",
      busy: null,
      code,
      match,
      mySeat: null,
      message: null,
      shareLink: this.#shareLink(code),
    });
    this.#showCodeInAddress(code);
    this.#watch(code);
  }

  /** Hosts a lobby with the remembered settings and a fresh seed. */
  async host(): Promise<void> {
    if (this.#state.busy !== null || this.#state.screen !== "HOME") return;
    const name = this.#state.name;
    if (leaderboardNameProblemV7(name) !== null) {
      this.#set({ message: this.#nameMessage(name) });
      return;
    }
    const epoch = this.#begin("HOST");
    const options = legalOnlineOptionsV7(
      { ...this.#state.options, seed: newOnlineSeedV7(this.#random) },
      "other",
    );
    const hosted = await hostOnlineMatchV7(this.#transport, {
      name,
      pick: this.#state.pick,
      options,
    });
    if (!this.#current(epoch)) return;
    if (!hosted.ok) return this.#fail(hosted.error, false);
    const identity = await this.#signIn();
    if (!this.#current(epoch) || identity === null) return;
    this.#seated(hosted.value, HOST_SEAT_V7);
  }

  /**
   * Joins by a typed code or a pasted link (Join with code), or the
   * previewed lobby (the link's Join tap) when `codeOrLink` is absent.
   */
  async join(codeOrLink?: string): Promise<void> {
    if (this.#state.busy !== null) return;
    const raw = codeOrLink ?? this.#state.code ?? "";
    const code = normalizeRoomCodeV7(raw);
    if (code === null) {
      this.#set({ message: this.#error("INVALID") });
      return;
    }
    const name = this.#state.name;
    if (leaderboardNameProblemV7(name) !== null) {
      this.#set({ message: this.#nameMessage(name) });
      return;
    }
    const fromScreen = this.#state.screen;
    const epoch = this.#begin("JOIN");
    const joined = await joinOnlineMatchV7(this.#transport, code, {
      name,
      pick: this.#guestPickFor(this.#state.match),
    });
    if (!this.#current(epoch)) return;
    if (!joined.ok) {
      // A previewed lobby stays up when the Join merely failed to get
      // through; a lobby that is gone, full or started is left.
      if (fromScreen === "PREVIEW" && joined.error.code === "NETWORK") {
        this.#set({ busy: null, message: this.#error("NETWORK") });
        return;
      }
      return this.#fail(joined.error, false);
    }
    const uid = await this.#signIn();
    if (!this.#current(epoch) || uid === null) return;
    const seat = onlineSeatOfUidV7(joined.value, uid);
    if (seat === null) return this.#fail(this.#error("SEAT_TAKEN"), false);
    this.#seated(joined.value, seat);
  }

  /** Back from the preview (or an error) to the home screen. */
  cancel(): void {
    if (this.#state.screen !== "PREVIEW" && this.#state.screen !== "HOME")
      return;
    this.#home(null);
  }

  /** Saves a display name; returns the problem text, or null when saved. */
  setName(raw: string): string | null {
    const name = normalizeLeaderboardNameV7(raw);
    const problem = leaderboardNameProblemV7(name);
    if (problem !== null) return leaderboardNameProblemTextV7(problem);
    this.#write(ONLINE_NAME_STORAGE_KEY_V7, name);
    const { screen, mySeat, code } = this.#state;
    this.#set({
      name,
      message:
        this.#state.message?.code === "NAME" ? null : this.#state.message,
    });
    if (screen === "LOBBY" && code !== null && mySeat !== null)
      void this.#patch(
        mySeat === HOST_SEAT_V7 ? { hostName: name } : { guestName: name },
      );
    return null;
  }

  /** This player's faction (or Random); written to its seat at once. */
  setPick(pick: FactionPickV7): void {
    if (!factionPickValidV7(pick)) return;
    this.#write(ONLINE_PICK_STORAGE_KEY_V7, pick);
    this.#set({
      pick,
      message:
        this.#state.message?.code === "PICKS" ? null : this.#state.message,
    });
    const { screen, mySeat } = this.#state;
    if (screen === "LOBBY" && mySeat !== null)
      void this.#patch(
        mySeat === HOST_SEAT_V7 ? { hostPick: pick } : { guestPick: pick },
      );
  }

  /** The host changes a setting (in the lobby, or before hosting). */
  setOptions(change: Partial<Omit<OnlineMatchOptionsV7, "seed">>): void {
    const { screen, mySeat } = this.#state;
    if (screen === "LOBBY" && mySeat !== HOST_SEAT_V7) return;
    if (screen !== "LOBBY" && screen !== "HOME") return;
    const key =
      change.mapType !== undefined
        ? "mapType"
        : change.aiSeats !== undefined
          ? "aiSeats"
          : change.width !== undefined
            ? "width"
            : "other";
    const options = legalOnlineOptionsV7(
      { ...this.#state.options, ...change },
      key,
    );
    this.#storeOptions(options);
    this.#set({ options });
    if (screen === "LOBBY")
      void this.#patch({ optionsJson: onlineOptionsJsonV7(options) });
  }

  /**
   * Why the host cannot start yet, or null: the guest seat is free, or the
   * two humans chose the same faction.
   */
  startBlocker(): string | null {
    const match = this.#state.match;
    if (match === null || this.#state.mySeat !== HOST_SEAT_V7) return null;
    if (match.seats[1].uid === "") return "Waiting for your friend to join.";
    const [host, guest] = match.seats;
    if (host.pick !== "RANDOM" && host.pick === guest.pick)
      return "You both chose the same faction. One of you picks another.";
    return null;
  }

  /** The host starts the game once the guest is seated. */
  async start(): Promise<void> {
    const { screen, mySeat, match, busy } = this.#state;
    if (screen !== "LOBBY" || mySeat !== HOST_SEAT_V7 || match === null) return;
    if (busy !== null || this.startBlocker() !== null) return;
    const epoch = this.#begin("START");
    const started = await startOnlineMatchV7(this.#transport, match);
    if (!this.#current(epoch)) return;
    if (!started.ok) {
      this.#set({
        busy: null,
        message:
          started.error.code === "INVALID" &&
          started.error.message === "DUPLICATE_PICK"
            ? {
                kind: "error",
                code: "PICKS",
                text: "You both chose the same faction. One of you picks another.",
              }
            : {
                kind: "error",
                code: started.error.code,
                text: onlineLobbyErrorTextV7(started.error.code),
              },
      });
      return;
    }
    await this.#openMatch(started.value, epoch);
  }

  /** Leaves the lobby: the guest frees its seat, the host closes the lobby. */
  async leave(): Promise<void> {
    const { screen, mySeat, code, busy } = this.#state;
    if (busy === "LEAVE" || code === null) return;
    if (screen === "PREVIEW") return this.cancel();
    if (screen !== "LOBBY" || mySeat === null) return;
    const epoch = this.#begin("LEAVE");
    this.#stopWatching();
    const left =
      mySeat === HOST_SEAT_V7
        ? await this.#transport.abandonMatch(code)
        : await this.#transport.updateLobby(code, { leaveSeat: true });
    if (!this.#current(epoch)) return;
    if (!left.ok && left.error.code === "NETWORK") {
      // Still seated: back to the lobby, which says why.
      this.#set({ busy: null, message: this.#error("NETWORK") });
      this.#watch(code);
      return;
    }
    this.#home(null);
  }

  /**
   * The match is over or left (`pulp_wars-eqc6.3`): its code is forgotten
   * and taken out of the address, so a reload no longer resumes it. The
   * screen stays on the hand-off until {@link closeMatch}.
   */
  forgetMatch(): void {
    if (this.#state.screen !== "STARTED") return;
    this.#forget();
    this.#clearCodeFromAddress();
  }

  /**
   * The match screen let the hand-off go: back on the home screen (Host a
   * game, Join with code), the code forgotten when `forget` (a game that
   * is over or left; never when the match is only put aside).
   */
  closeMatch(forget = true): void {
    if (this.#state.screen !== "STARTED") return;
    if (forget) this.forgetMatch();
    this.#epoch += 1;
    this.#stopWatching();
    this.#set({
      screen: "HOME",
      busy: null,
      code: null,
      match: null,
      mySeat: null,
      message: null,
      shareLink: null,
      offline: false,
      handoff: null,
      options: this.#storedOptions(),
      pick: storedPick(this.#read(ONLINE_PICK_STORAGE_KEY_V7)),
      history: this.#readHistory(),
    });
  }

  destroy(): void {
    this.#destroyed = true;
    this.#stopWatching();
    this.#listeners.clear();
  }

  /**
   * Reads the track record again (`pulp_wars-eqc6.6`). `settle`: In
   * progress matches this browser is not in now are checked against the
   * store (a few per visit), so one that ended while the browser was away
   * (a forfeit, a leave, the game's end) shows its result. The local
   * transport keeps a list per tab, so it signs in first to know whose.
   */
  refreshHistory(settle = false): void {
    if (this.#history === null || this.#destroyed) return;
    if (this.#uid === null && this.#transport.kind !== "FIRESTORE") {
      void this.#transport.signIn().then((identity) => {
        if (!identity.ok || this.#destroyed) return;
        this.#uid ??= identity.value.uid;
        this.refreshHistory(settle);
      });
      return;
    }
    this.#set({ history: this.#readHistory() });
    if (settle) void this.#settleHistory();
  }

  /**
   * Resume from the match history: opens the match like its link would
   * (the match screen, when it is still being played); one that is over
   * says so, and its entry is settled.
   */
  async resume(code: string): Promise<void> {
    if (this.#state.busy !== null) return;
    if (this.#state.screen !== "HOME" && this.#state.screen !== "PREVIEW")
      return;
    await this.openLink(code);
    if (this.#state.screen === "HOME") {
      this.#settled.delete(code);
      await this.#settleHistory([code]);
    }
  }

  // -------------------------------------------------------------------

  #readHistory(): readonly OnlineHistoryEntryV7[] {
    return (
      this.#history?.entries(
        this.#transport.kind === "FIRESTORE" ? null : this.#uid,
      ) ?? []
    );
  }

  /**
   * Settles In progress entries from the store: a match that is over (or
   * gone) gets its result; one still in play stays In progress. The open
   * match (lobby or hand-off) is the match screen's to record.
   */
  async #settleHistory(codes?: readonly string[]): Promise<void> {
    const history = this.#history;
    if (history === null) return;
    // Nothing In progress: no sign-in (on Firestore it may make an account).
    if (!this.#readHistory().some((entry) => entry.result === "IN_PROGRESS"))
      return;
    const uid = await this.#signInQuietly();
    if (uid === null) return;
    const open = this.#state.code;
    const due = history
      .entries(this.#transport.kind === "FIRESTORE" ? null : uid)
      .filter(
        (entry) =>
          entry.result === "IN_PROGRESS" &&
          entry.uid === uid &&
          entry.code !== open &&
          (codes === undefined
            ? !this.#settled.has(entry.code)
            : codes.includes(entry.code)),
      )
      .slice(0, ONLINE_HISTORY_SETTLE_MAX_V7);
    let changed = false;
    for (const entry of due) {
      this.#settled.add(entry.code);
      const read = await this.#transport.getMatch(entry.code);
      if (this.#destroyed) return;
      if (!read.ok) continue;
      if (read.value === null) {
        history.record({
          ...entry,
          result: "ABANDONED",
          updatedAt: this.#now(),
        });
        changed = true;
        continue;
      }
      const match = parseOnlineMatchV7(read.value);
      if (match.status === "ABANDONED") {
        history.record({
          ...entry,
          result: "ABANDONED",
          updatedAt: this.#now(),
        });
        changed = true;
        continue;
      }
      if (match.status !== "FINISHED" || !match.compatible) continue;
      // Over: the log says how it ended (and the turn and score).
      const opened = await OnlineLockstepV7.open({
        ...(this.#lockstep ?? {}),
        transport: this.#transport,
        code: entry.code,
        uid,
      });
      if (this.#destroyed) return;
      if (!opened.ok) continue;
      const client = opened.value;
      const seat = client.mySeat;
      if (seat === null) continue;
      history.record(
        onlineHistoryEntryV7({
          code: entry.code,
          uid,
          mySeat: seat,
          opponent: entry.opponent,
          state: client.state,
          setup: client.setup,
          status: match.status,
          forfeit: match.forfeit,
          now: this.#now(),
        }),
      );
      changed = true;
    }
    if (changed) this.#set({ history: this.#readHistory() });
  }

  /** This browser's uid, signing in without a word on failure. */
  async #signInQuietly(): Promise<string | null> {
    if (this.#uid !== null) return this.#uid;
    const identity = await this.#transport.signIn();
    if (!identity.ok) return null;
    this.#uid ??= identity.value.uid;
    return this.#uid;
  }

  /** The guest's pick for joining: Random when the host already has it. */
  #guestPickFor(match: OnlineMatchV7 | null): FactionPickV7 {
    const pick = this.#state.pick;
    return match !== null && pick !== "RANDOM" && match.seats[0].pick === pick
      ? "RANDOM"
      : pick;
  }

  #seated(match: OnlineMatchV7, seat: number): void {
    this.#remember(match.code);
    this.#set({
      screen: "LOBBY",
      busy: null,
      code: match.code,
      match,
      mySeat: seat,
      message: null,
      offline: false,
      shareLink: this.#shareLink(match.code),
      // The lobby's own settings and this seat's own pick are shown.
      ...(match.options === null ? {} : { options: match.options }),
      pick: match.seats[seat === HOST_SEAT_V7 ? 0 : 1].pick,
    });
    this.#showCodeInAddress(match.code);
    if (match.status === "ACTIVE") {
      void this.#openMatch(match, this.#epoch);
      return;
    }
    this.#watch(match.code);
  }

  async #openMatch(match: OnlineMatchV7, epoch: number): Promise<void> {
    if (this.#opening || this.#state.handoff !== null) return;
    const uid = this.#uid;
    if (uid === null) return;
    this.#opening = true;
    this.#set({ busy: "START", match });
    try {
      const opened = await OnlineLockstepV7.open({
        ...(this.#lockstep ?? {}),
        transport: this.#transport,
        code: match.code,
        uid,
      });
      if (!this.#current(epoch)) {
        if (opened.ok) opened.value.stop();
        return;
      }
      if (!opened.ok) {
        this.#set({
          busy: null,
          message: {
            kind: "error",
            code: opened.error.code,
            text: onlineLobbyErrorTextV7(opened.error.code),
          },
        });
        return;
      }
      this.#stopWatching();
      const client = opened.value;
      const handoff: OnlineMatchHandoffV7 = {
        transport: this.#transport,
        code: match.code,
        uid,
        mySeat: client.mySeat ?? this.#state.mySeat ?? HOST_SEAT_V7,
        match: client.match,
        client,
      };
      this.#set({
        screen: "STARTED",
        busy: null,
        match: client.match,
        message: null,
        handoff,
      });
    } finally {
      this.#opening = false;
    }
  }

  #watch(code: string): void {
    if (this.#watchedCode === code && this.#stopWatch !== null) return;
    this.#stopWatching();
    this.#watchedCode = code;
    this.#stopWatch = this.#transport.watchMatch(
      code,
      (record, error) => {
        if (this.#destroyed || this.#watchedCode !== code) return;
        this.#onRecord(record, error);
      },
      this.#pollMs === undefined ? undefined : { intervalMs: this.#pollMs },
    );
  }

  #stopWatching(): void {
    this.#stopWatch?.();
    this.#stopWatch = null;
    this.#watchedCode = null;
  }

  #onRecord(
    record: OnlineMatchRecordV7 | null,
    error: OnlineErrorV7 | null,
  ): void {
    const { screen } = this.#state;
    if (screen !== "LOBBY" && screen !== "PREVIEW") return;
    if (record === null) {
      if (error !== null) {
        if (!this.#state.offline) this.#set({ offline: true });
        return;
      }
      this.#closed("That game is gone.");
      return;
    }
    const match = parseOnlineMatchV7(record);
    const uid = this.#uid ?? "";
    const seat = onlineSeatOfUidV7(match, uid);
    if (!match.compatible) {
      this.#home(this.#error("RULESET_MISMATCH"));
      return;
    }
    if (screen === "PREVIEW") {
      if (match.status === "ABANDONED" || match.status === "FINISHED")
        return this.#closed("The host closed the game.");
      if (seat !== null) return this.#seated(match, seat);
      if (match.status !== "LOBBY") return this.#home(this.#error("NOT_LOBBY"));
      if (match.seats[1].uid !== "")
        return this.#home(this.#error("SEAT_TAKEN"));
      this.#set({ match, offline: false });
      return;
    }
    if (match.status === "ABANDONED" || match.status === "FINISHED") {
      this.#closed(
        this.#state.mySeat === HOST_SEAT_V7
          ? "The game was closed."
          : "The host closed the game.",
      );
      return;
    }
    if (seat === null) {
      // The seat was freed elsewhere (another tab of this player).
      this.#home({ kind: "info", code: "LEFT", text: "You left the game." });
      return;
    }
    this.#set({
      match,
      offline: false,
      ...(match.options === null || seat !== GUEST_SEAT_V7
        ? {}
        : { options: match.options }),
    });
    if (match.status === "ACTIVE") void this.#openMatch(match, this.#epoch);
  }

  #closed(text: string): void {
    this.#home({ kind: "info", code: "CLOSED", text });
  }

  async #patch(
    patch: Parameters<OnlineTransportV7["updateLobby"]>[1],
  ): Promise<void> {
    const code = this.#state.code;
    if (code === null) return;
    const epoch = this.#epoch;
    const result = await this.#transport.updateLobby(code, patch);
    if (!this.#current(epoch) || this.#state.screen !== "LOBBY") return;
    if (result.ok) {
      const match = parseOnlineMatchV7(result.value);
      this.#set({ match, offline: false });
      return;
    }
    this.#set({
      message: {
        kind: "error",
        code: result.error.code,
        text: onlineLobbyErrorTextV7(result.error.code),
      },
      offline: result.error.code === "NETWORK",
    });
  }

  async #signIn(): Promise<string | null> {
    if (this.#uid !== null) return this.#uid;
    const identity = await this.#transport.signIn();
    if (!identity.ok) {
      this.#fail(identity.error, false);
      return null;
    }
    this.#uid = identity.value.uid;
    return this.#uid;
  }

  #begin(busy: Exclude<OnlineLobbyBusyV7, null>): number {
    this.#epoch += 1;
    this.#set({ busy, message: null });
    return this.#epoch;
  }

  #current(epoch: number): boolean {
    return !this.#destroyed && epoch === this.#epoch;
  }

  /** A failure: back home with the line (or none when quiet). */
  #fail(
    error: OnlineErrorV7 | OnlineLobbyMessageV7 | null,
    quiet: boolean,
  ): void {
    if (quiet) this.#forget();
    const message =
      quiet || error === null
        ? null
        : "kind" in error
          ? error
          : this.#error(error.code);
    this.#home(message);
  }

  #home(message: OnlineLobbyMessageV7 | null): void {
    this.#epoch += 1;
    this.#stopWatching();
    if (this.#state.screen === "LOBBY") this.#forget();
    this.#clearCodeFromAddress();
    this.#set({
      screen: "HOME",
      busy: null,
      code: null,
      match: null,
      mySeat: null,
      message,
      shareLink: null,
      offline: false,
      options: this.#storedOptions(),
      pick: storedPick(this.#read(ONLINE_PICK_STORAGE_KEY_V7)),
      history: this.#readHistory(),
    });
  }

  #error(code: OnlineErrorCodeV7): OnlineLobbyMessageV7 {
    return { kind: "error", code, text: onlineLobbyErrorTextV7(code) };
  }

  #nameMessage(name: string): OnlineLobbyMessageV7 {
    const problem = leaderboardNameProblemV7(name) ?? "EMPTY";
    return {
      kind: "error",
      code: "NAME",
      text:
        problem === "EMPTY"
          ? "Type your name first."
          : leaderboardNameProblemTextV7(problem),
    };
  }

  #shareLink(code: string): string | null {
    if (this.#location === null) return null;
    try {
      return shareLinkV7(this.#location.href(), code);
    } catch {
      return null;
    }
  }

  /** The address carries the open lobby's code, so a reload finds it. */
  #showCodeInAddress(code: string): void {
    this.#editAddress((url) => url.searchParams.set(JOIN_PARAMETER_V7, code));
  }

  #clearCodeFromAddress(): void {
    this.#editAddress((url) => url.searchParams.delete(JOIN_PARAMETER_V7));
  }

  #editAddress(edit: (url: URL) => void): void {
    if (this.#location === null) return;
    try {
      const url = new URL(this.#location.href());
      const before = url.toString();
      edit(url);
      if (url.toString() !== before) this.#location.replace(url.toString());
    } catch {
      // An address that cannot be read or replaced keeps its parameters.
    }
  }

  #remember(code: string): void {
    this.#write(ONLINE_LOBBY_STORAGE_KEY_V7, code);
  }

  #forget(): void {
    try {
      this.#storage?.removeItem(ONLINE_LOBBY_STORAGE_KEY_V7);
    } catch {
      // Storage that refuses keeps nothing anyway.
    }
  }

  #storedOptions(): OnlineMatchOptionsV7 {
    const fallback = defaultOnlineOptionsV7(0, 0);
    const text = this.#read(ONLINE_OPTIONS_STORAGE_KEY_V7);
    if (text === null) return fallback;
    try {
      const value = JSON.parse(text) as unknown;
      const candidate = { ...fallback, ...(value as object), seed: 0 };
      return onlineOptionsValidV7(candidate)
        ? legalOnlineOptionsV7(candidate, "other")
        : fallback;
    } catch {
      return fallback;
    }
  }

  #storeOptions(options: OnlineMatchOptionsV7): void {
    const { seed, ...rest } = options;
    void seed;
    this.#write(ONLINE_OPTIONS_STORAGE_KEY_V7, JSON.stringify(rest));
  }

  #read(key: string): string | null {
    try {
      return this.#storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  #write(key: string, value: string): void {
    try {
      this.#storage?.setItem(key, value);
    } catch {
      // A full or blocked storage forgets; the session goes on.
    }
  }

  #set(change: Partial<OnlineLobbyStateV7>): void {
    if (this.#destroyed) return;
    this.#state = { ...this.#state, ...change };
    for (const listener of [...this.#listeners]) {
      try {
        listener(this.#state);
      } catch {
        // A screen's listener never stops the session.
      }
    }
  }
}
