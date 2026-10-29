# Online multiplayer

**Status:** the core (`pulp_wars-eqc6.1`, ruleset `pulp-wars-poc-7r120`):
engine seats, the match store, three transports, the Firestore rules and the
lockstep client; the lobby screens (`pulp_wars-eqc6.2`, section 10). The
in-match screens (`pulp_wars-eqc6.3`) plug in at the lobby's hand-off
(section 10.4). The epic
`pulp_wars-eqc6` holds the approved design.

Two people play one skirmish, plus optional AI seats, from two browsers.
Nothing runs on a server: a match is its setup plus an ordered log of
commands, stored in the project's Cloud Firestore, and both browsers run the
deterministic reducer over the same log (lockstep). Cheating is accepted for
now: each browser holds the whole game, fog included.

Code: `src/online/` (`index.ts` re-exports everything). Tests:
`tests/unit/online-*.test.ts`.

## 1. Console steps (the user, once)

Agents never touch the live Firebase project (no requests, deploys or
logins). Before online play works on the deployed site:

1. **Enable Anonymous sign-in:** Firebase Console > Authentication >
   Sign-in method > Add new provider > Anonymous > Enable > Save.
2. **Publish the rules:** Firebase Console > Firestore Database > Rules,
   paste the whole of [`firebase/firestore.rules`](../firebase/firestore.rules)
   and press Publish. The leaderboard rules in it are unchanged.

No index is needed: moves are read by document name (`batchGet`), never by
query.

## 2. Seats and factions

- **Seats.** The host is seat 0 and the guest seat 1, both human; seats 2
  and up are AI seats. The setup says so with the optional key
  `humanSeats: [0, 1]` (`MatchSetupV7`, current rules section 2.8). Without
  the key a setup has the one human seat 0 and is byte-identical to before.
  `aiCount` still counts every seat after seat 0, so an online setup with
  `n` AI seats has `aiCount` `n + 1`.
- **What the engine does with it** (7r120): human seats start as `HUMAN`
  players and never get the AI head start or the Easy personality; in
  Cooperative mode the AI seats are allies of each other, never of a human;
  the match ends when no human seat is left (Defeat) or one seat stands
  (Victory; `eliminationOutcomeV7` in `src/engine/v7/reducer.ts`), so an
  eliminated human watches while the other plays on; in Perfection any
  human ranked first wins. The Normal AI's "this capture ends the match"
  check follows the same rule.
- **Never single-player progress.** A setup with `humanSeats` is always a
  custom game (`gameKindOfV7`), so it earns no tribe stars and is never
  offered to the leaderboard (`leaderboardRegularGameV7`). It is never a
  mission, the Showcase or a mirror setup, so campaign and tutorial code
  never sees one. Achievements are per player in the state, as before.
- **Factions.** Each human picks a faction or `RANDOM`; AI seats are always
  random. `resolveOnlineFactionsV7(seed, picks, aiSeats, pool?)` keeps the
  chosen factions (two humans may not choose the same one), then draws each
  random seat, in seat order, uniformly from the pool factions nobody has
  yet, with the engine's Mulberry32 seeded from the match seed. The host
  resolves once at Start and stores the resolved setup, so both browsers
  build the same game (and anyone can recompute it).
- **Options.** `OnlineMatchOptionsV7` is what the host chooses: `seed`,
  `mapType` (a generated map), `width`, `aiSeats` (0 to 7), `aiMode`,
  `difficulty` (of the AI seats), `gameMode`, `curiosities`.
  `defaultOnlineOptionsV7(seed, aiSeats)` gives the new skirmish game's
  defaults: Continents at the regular size for the seat count,
  Free-for-all, Normal, Domination, Curiosities on.
  `buildOnlineSetupV7(options, hostPick, guestPick)` makes the setup; with
  no AI seat it is Normal whatever `difficulty` says.

## 3. Room codes and links

- A code is five capital letters without I and O
  (`ROOM_CODE_ALPHABET_V7`, about eight million codes), also the Firestore
  document ID. A collision on create draws another code (up to eight
  tries).
- The share link is the page's address with `?join=CODE`
  (`shareLinkV7(location.href, code)`); `joinCodeFromSearchV7(location.search)`
  reads it back. `normalizeRoomCodeV7` accepts a typed code (any case,
  spaces and dashes ignored) or a whole pasted link.

## 4. Data model

### 4.1 The match, `matches/{CODE}`

`OnlineMatchRecordV7` (`src/online/types.ts`), flat fields:

| Field                                              | Meaning                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `code`                                             | the room code (= document ID)                                                                                |
| `rulesetId`                                        | the host's `RULESET_7_ID`; another build gets `RULESET_MISMATCH` ("update to join")                          |
| `status`                                           | `LOBBY`, `ACTIVE`, `FINISHED`, `ABANDONED`                                                                   |
| `hostUid`, `hostName`, `hostPick`                  | seat 0                                                                                                       |
| `guestUid`, `guestName`, `guestPick`, `guestReady` | seat 1; `guestUid` is `""` while free                                                                        |
| `optionsJson`                                      | `OnlineMatchOptionsV7`, canonical JSON (at most 2000 characters)                                             |
| `setupJson`                                        | the resolved `MatchSetupV7`, canonical JSON (at most 8000); `""` in the lobby                                |
| `driverUids`                                       | by seat, the uid that appends that seat's moves: the host for seat 0 and every AI seat, the guest for seat 1 |
| `moveCount`                                        | moves in the log, the next move's index                                                                      |
| `turnSeat`                                         | the seat whose driver may append the next move                                                               |
| `createdAt`, `updatedAt`                           | the server's time (`REQUEST_TIME`)                                                                           |

`parseOnlineMatchV7(record)` gives the typed `OnlineMatchV7`: `seats`
(`[host, guest]`, each `{ seat, uid, name, pick, ready }`), `options`,
`setup` (validated, `humanSeats` exactly `[0, 1]`), `compatible`.

### 4.2 The moves, `matches/{CODE}/moves/{index}`

`OnlineMoveRecordV7`: `index` (the document ID in plain decimal), `seat`
(the active seat at that index), `uid` (who appended it), `commandJson`
(the `CommandV7`, canonical JSON, at most 4000), `stateHash`
(`canonicalHash` of the state after the command, as replay checkpoints are)
and `createdAt`.

### 4.3 Appending a move

One `documents:commit` with two writes, so both stand or fall together:
the move document with `currentDocument: { exists: false }`, and the match
with `moveCount: index + 1`, `turnSeat` (the next seat to move) and
`status` (`FINISHED` when the move ended the game) under an update mask.
The rules accept it only when `index` equals the stored `moveCount` and the
writer drives `turnSeat`, so two writers can never both take an index; the
loser gets `INDEX_TAKEN`.

## 5. Security rules

[`firebase/firestore.rules`](../firebase/firestore.rules) explains each rule
in comments; `src/online/match-rules.ts` is its TypeScript mirror, which the
in-memory and local transports enforce and the Firestore transport checks
before writing. In short:

- Only signed-in users (anonymous accounts) touch matches. Anyone signed in
  may **get** a match or a move whose code they know; **listing** is refused,
  so codes cannot be browsed.
- **Create:** a well-formed lobby under a five-letter code, by its host,
  guest seat free, no setup, no moves, server times.
- **Join:** a user other than the host takes the free guest seat, once
  (only while `guestUid` is `""`), changing only the guest fields.
- **Lobby edits:** the host changes only its name, pick and the options;
  the guest only its name, pick and ready flag, or frees the seat.
- **Start:** the host, with the guest seated: `ACTIVE`, the setup, drivers
  (seat 0 the host, seat 1 the guest, the rest the host; 2 to 9 seats) and
  the first seat to move.
- **Move:** the driver of `turnSeat` creates move `moveCount` (for that
  seat, with bounded JSON and a 64-hex hash) and, in the same commit, the
  match's `moveCount` becomes one more (`getAfter` / `existsAfter`).
- **Leave:** a seated player sets `ABANDONED` on a lobby or a game in
  play.
- No deletes from browsers; moves are never changed. Size limits on every
  text field.

The rules were written without an emulator (no Java on the development
machine) and have not been run; the request shapes are tested against a
stubbed `fetch`. Expect to fix a rule or two on the first real games.

## 6. Transports

`OnlineTransportV7` (`src/online/types.ts`): `signIn`, `createMatch`,
`getMatch`, `joinMatch`, `updateLobby`, `startMatch`, `appendMove`,
`getMoves(code, from, to)`, `abandonMatch`, and
`watchMatch(code, listener, { intervalMs })` (returns the stop function).
Every call returns `OnlineResultV7` (`{ ok: true, value }` or
`{ ok: false, error: { code, message } }`); `NETWORK` is the retryable
error.

1. **In-memory** (`createMemoryOnlineServerV7()`, then
   `server.transport(uid)` per client): the tests' fake; it applies the
   rules and tells watchers of every change at once.
2. **Local** (`createLocalOnlineTransportV7`,
   `browserLocalOnlineTransportV7(window)`): two tabs of one browser play
   each other with no network. Records in `localStorage`
   (`pulpWars.online.local.*`), a `BroadcastChannel` plus the `storage`
   event and a 1.5 s poll for changes, Web Locks to serialize writes; each
   tab's uid is in `sessionStorage`, so a reload keeps the seat. For
   development and the browser checks.
3. **Firestore** (`createFirestoreOnlineTransportV7({ fetch, storage })`):
   REST with `fetch`, no SDK, the public web config of
   `src/app/leaderboard-v7.ts`. Anonymous Auth through the Identity Toolkit
   `accounts:signUp`, the refresh token kept in `localStorage`
   (`pulpWars.online.auth.v1`), the ID token refreshed through
   `securetoken.googleapis.com` five minutes before it expires and after a 401. Live updates are polled: one read of the match every 2 s while the
   tab is visible, every 15 s while hidden, 10 s on this client's own turn;
   moves are read (`batchGet`, 100 at a time) only when `moveCount` grows.

`browserOnlineTransportV7(import.meta.env.PROD)` picks the page's
transport: Firestore only on the deployed site (production build, not
localhost, not automation, not `?browser-smoke=1`); the local transport
everywhere else, and with `?online=local` on the deployed site.

## 7. The lockstep client

`OnlineLockstepV7` (`src/online/lockstep.ts`):

```ts
const opened = await OnlineLockstepV7.open({ transport, code, uid });
if (!opened.ok) show(opened.error.code); // NOT_FOUND, NOT_ACTIVE, RULESET_MISMATCH...
const client = opened.value;
client.on((event) => {
  /* see below */
});
client.start(); // follow the match live
client.submit(command); // when client.canAct
client.stop(); // leaving the screen
```

- **State:** `state` (the `GameStateV7` as applied here), `setup`,
  `match` (the latest `OnlineMatchV7`), `moveCount`, `pendingMoves`
  (own moves not yet stored), `mySeat` (0, 1, or null for a spectator),
  `myPlayerId`, `drivenSeats` (own seat; the host also every AI seat),
  `activeSeat`, `canAct`, `aiTurn` (`canAct` on an AI seat: the host's
  job), `waitingFor` (the seat everyone waits for), `playable`, `verified`,
  `desynced`.
- **`submit(command)`** applies the command at once (returns
  `{ accepted, index, state, events }` for the screen to play back, or
  `{ accepted: false, reason }`: `NOT_YOUR_TURN`, `REJECTED` with the rule
  error, `MATCH_OVER`, `DESYNCED`, `NOT_ACTIVE`) and appends it in the
  background, retrying network failures with backoff. An append whose
  answer was lost but which landed is recognized and not resent.
- **Events** (`LockstepEventV7`):
  - `COMMAND_APPLIED` `{ index, seat, command, events, state, local }`:
    play back remote ones (`local: false`) with the normal animations;
  - `TURN` `{ seat, playerId, mine, ai }`: whose turn it is now (and once
    on `start`); `mine && ai` means run the AI for that seat;
    `!mine` means show "waiting for ..." (`match.seats[seat].name`, or an
    AI seat);
  - `MATCH_FINISHED` `{ outcome }`, `MATCH_ABANDONED`, `MATCH_UPDATED`
    `{ match }`;
  - `MOVE_REJECTED` `{ index, error }` (the store refused an own move;
    the client resynchronizes);
  - `DESYNC` `{ index, reason, recovered, blame }` and `RESYNCED`;
  - `CONNECTION` `{ ok, error }` (requests failing and retrying, or
    working again).
- **Ordering:** remote moves are applied strictly by index; duplicates are
  ignored (or are a conflict when their hash differs), gaps are fetched.
- **Hashes and desync.** Each applied remote move's state hash must equal
  the logged one. On a mismatch, a refused command or a move from the wrong
  seat, the client refetches the whole log and replays it from the setup
  (`replayOnlineLogV7`). The commands, not the hashes, are the match: if
  the replay reproduces the logged hash, this client's state was off and is
  repaired (`blame: "LOCAL"`); if it does not, the author logged a wrong
  hash (its own game was off): the client plays on with the replayed state,
  `blame: "AUTHOR"`, and applies that author's moves unchecked
  (`verified` false) until one of its hashes agrees again (the author
  repairs itself at its next mismatch). Only a log whose commands do not
  replay is fatal: `recovered: false`, `desynced` true, stuck at the last
  good move.
- **Resume:** `open` replays the stored log (checking the last move's
  hash), so a reload or a later visit continues where the match is.

### 7.1 For the in-match screen (`pulp_wars-eqc6.3`)

- Host-run AI: on `TURN` with `mine && ai`, compute the AI seat's commands
  with the existing AI on `viewForV7(client.state, playerId)` and `submit`
  each, as the single-player controller does for its AI seats. Only the
  host's browser runs the AI (its time budget makes it differ between
  machines), so the guest only ever plays the logged result.
- Draw the board for `myPlayerId` (`viewForV7(state, myPlayerId)`), not
  `state.humanPlayerId` (which is always seat 0).
- The single-player browser controller (`src/app/v7-controller.ts`) assumes
  one human (`humanPlayerId`), runs AI for every other seat and autosaves;
  an online match needs its own controller or a mode of it that runs the AI
  only for `drivenSeats` and keeps the match in Firestore instead of the
  autosave. The engine refuses nothing about that: a setup with
  `humanSeats` saves, loads and replays like any other.
- Game over: `MATCH_FINISHED` comes to both clients from the reducer's own
  outcome; a Victory's `winnerId` may be either human, and a Defeat means
  no human won.

## 8. The lobby API (`pulp_wars-eqc6.2`)

`src/online/lobby.ts`:

- `hostOnlineMatchV7(transport, { name, pick, options })` creates the lobby
  (`newOnlineSeedV7()` for `options.seed`).
- `joinOnlineMatchV7(transport, codeOrLink, { name, pick, ready? })` takes
  the guest seat; opening one's own match again (host or seated guest)
  just returns it. Errors: `INVALID` (not a code), `NOT_FOUND`,
  `RULESET_MISMATCH`, `SEAT_TAKEN`, `NOT_LOBBY`.
- `transport.updateLobby(code, patch)` for picks, names, the ready flag,
  the options (host), and `{ leaveSeat: true }` (guest).
- `transport.watchMatch(code, listener)` with `parseOnlineMatchV7` to show
  the lobby live; start the lockstep client when `status` becomes `ACTIVE`.
- `startOnlineMatchV7(transport, match, pool?)` (host, guest seated):
  resolves the factions, checks the setup starts, stores it. `pool`
  (default `OFFERED_FACTION_IDS_V7`) is where random seats draw from.
- `transport.abandonMatch(code)` (or `client.abandon()`) to leave.
- Names follow the leaderboard's pattern (`LEADERBOARD_NAME_PATTERN_V7`,
  1 to 16 characters); reuse the saved leaderboard name when there is one.

## 9. Known limits

- The Firestore rules are unrun (no emulator here); see section 5.
- No push: live updates are polled, so a move shows up within about 2 s
  (15 s in a hidden tab). Reads cost one per poll plus one per new move.
- An anonymous account lives in one browser: another browser or a cleared
  `localStorage` is a new uid and cannot take back its seat. Two tabs of one
  browser share the account on Firestore (use the local transport to play
  yourself).
- A match is locked to its ruleset: after a deploy that bumps the ruleset,
  matches in progress cannot be continued on the new build.
- Nothing cleans up old matches yet (no deletes from browsers).
- No chat, public matchmaking, spectating UI, or notifications (v1 scope).
- Cheating is possible (full state in each browser, and a client could log
  any command its rules allow); accepted for a friendly game.
- The local transport's records stay in `localStorage` until cleared.

## 10. The lobby screens (`pulp_wars-eqc6.2`)

Code: `src/online/lobby-session.ts` (`OnlineLobbySessionV7`, no DOM) and
`src/render/dom/online-lobby-view-v7.ts` (`OnlineLobbyViewV7`, the screen),
mounted by the app view as the front page `ONLINE`
(`src/render/dom/app-view-v7.ts`, `#frontOnline`). The page passes its
transport as the mount option `online` (`src/main.ts`:
`browserOnlineTransportV7(import.meta.env.PROD)`); without one the menu
has no Play online. Tests: `tests/unit/online-lobby-session-v7.test.ts`,
`tests/integration/online-lobby-dom.test.ts`; the two-tab browser check is
`scripts/browser-online-lobby-review-v7.ts <dev-server-url>` (no match is
played).

### 10.1 The flow

- **Main menu:** Play online, right after New game (a globe). While a lobby
  is open or remembered the button says "Room CODE".
- **Home:** "Playing as NAME · Change" (a name field instead when none is
  saved), **Host a game**, and **Join with code** (an input that
  upper-cases, drops spaces and other characters, keeps five letters, and
  turns a pasted link into its code; Join is enabled once it is a code).
  Hosting is two taps from the menu: Play online, Host a game.
- **Lobby (host and guest):** the room code, big; the share link with
  **Copy link** and, where the browser has the Web Share API, **Share**;
  the seats (name, faction or Random with its emblem, Host / Ready / open
  seat), the AI seats as "AI · random"; **Your faction** (Random or a
  faction; the other human's faction is "taken", one locked for this player
  is "locked"); the settings summary line. The host has a **Settings**
  toggle (closed by default) with AI players (0 to 7, never more than the
  map holds), AI difficulty and Alliances (with AI seats), Map, Size, Game
  mode and Curiosities; each change is written at once and the guest sees
  it live. **Start** is enabled once the guest is seated and the two humans
  have not chosen the same faction; the line above the buttons says what is
  awaited. **Leave**: the guest frees its seat, the host abandons the lobby
  (the guest is told "The host closed the game.").
- **Share link:** a page opened with `?join=CODE` (on the GitHub Pages path
  too) opens Play online at once on the lobby preview: "NAME invited you to
  a game", the code, the seats and the settings, the name field only if no
  name is saved, and **Join** / **Not now**.
- **Error lines** (`onlineLobbyErrorTextV7`): `RULESET_MISMATCH` "Your
  friend is on a different version — reload to update." (with Reload),
  `SEAT_TAKEN` "That game is full.", `NOT_FOUND` "No game has that code.
  Check it with your friend.", `NOT_LOBBY` "That game has already
  started.", `INVALID` "A room code is 5 letters.", `NETWORK` "Can't reach
  the server. Check your connection and try again."

### 10.2 What is remembered

In the settings storage (`localStorage`): the display name
(`pulpWars.online.name.v1`, else the leaderboard's saved name), the last
faction pick (`pulpWars.online.pick.v1`), the host's settings without the
seed (`pulpWars.online.options.v1`; the first time the new skirmish game's
defaults, `defaultOnlineOptionsV7` with no AI seat) and the open lobby's
code (`pulpWars.online.lobby.v1`). While a lobby is open the address
carries `?join=CODE` (replaced in place, no reload), so a reload, or Play
online later, resumes it when this browser is seated; a remembered code of
a lobby this browser no longer sits in is dropped without a word. Nothing
touches the single-player save, progress or stars.

### 10.3 Decisions

- AI seats are always random (drawn at Start); each human picks a faction
  or Random, Random by default (the last pick after that).
- A guest joining through a link whose host already plays the guest's
  remembered faction joins as Random. A clash made in the lobby blocks
  Start with a line rather than being resolved silently.
- The faction locks (campaign progress) apply to a player's own explicit
  pick; Random may draw any offered faction.
- The guest joins ready (`guestReady` true): Start waits only for the seat.
- Menu (or Escape) leaves the lobby screen without leaving the lobby.

### 10.4 The hand-off to the in-match screen (`pulp_wars-eqc6.3`)

When the match becomes `ACTIVE` (the host's Start, seen by the guest's
watch, or a resume of a started match), the session opens the lockstep
client (`OnlineLockstepV7.open`, not started) and its state becomes
`screen: "STARTED"` with `handoff: OnlineMatchHandoffV7`:

```ts
interface OnlineMatchHandoffV7 {
  transport: OnlineTransportV7;
  code: string;
  uid: string;
  mySeat: number; // 0 host, 1 guest
  match: OnlineMatchV7; // ACTIVE (or later, on a resume)
  client: OnlineLockstepV7; // opened; call client.start() to follow it
}
```

The lobby view calls its `onStarted` once per hand-off, which the app view
routes to `#openOnlineMatch(handoff)`: the one place `pulp_wars-eqc6.3`
replaces to show the match. Today it only calls the mount option
`onOnlineMatchStarted(handoff)` (tests, and a hook for the page), and the
lobby shows a "Game on!" placeholder. The session stops its own watch at
the hand-off and keeps the remembered code, so a reload reaches the
hand-off again; eqc6.3 decides when to forget it (`FINISHED` or
`ABANDONED`). The view only hands off while it exists, i.e. once Play
online has been opened in this page (always so for a seated player).
