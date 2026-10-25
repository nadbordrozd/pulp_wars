# Public leaderboard (Cloud Firestore)

Bead `pulp_wars-2yc.104`. The user, 2026-10-19: "on scored games I want to
have a leaderboard where the player can submit a name and get featured on a
public leaderboard. Since there are very few players I would do just a single
leaderboard for domination and another one for perfection mode but not split
them by faction or difficulty level or anything else. The leaderboard should
just show name, faction icon and score."

The code is `src/app/leaderboard-v7.ts` (the store, the checks, the gating);
the screens are in `src/render/dom/app-view-v7.ts`; the security rules are
[`firebase/firestore.rules`](../firebase/firestore.rules).

## What the player sees

- **Main menu > Leaderboard.** Two tabs, Domination and Perfection. Each shows
  the top 50 scores as rank, faction emblem, name, players and score. Ties
  share a rank. Players (bead `pulp_wars-2yc.112`; the user, 2026-10-25: "the
  leaderboard in the main menu should show number of players also, which is
  related to map size") is a small chip such as "4P", the human and the
  opponents of that match; a regular game's board size follows from it
  (`regularBoardSizeV7`). A score sent before the count was recorded shows
  "—".
  A line says when it is loading, when the player is offline or the store did
  not answer (with Try again), and when a board is still empty. Rows sent from
  this browser are tinted. A board is fetched again after a minute (it is
  cached that long in the page).
- **The end of a match.** After a won Regular game (Domination: every rival
  out; Perfection: ranked first after round 30, or every rival out earlier),
  the Victory dialog has "Submit to the leaderboard": the score and the board,
  a name field (filled with the last name sent from this browser) and Submit.
  Once sent it says "You're #3 on the Domination leaderboard with 812." and
  offers "See the leaderboard". A match is sent at most once (the matches sent
  are remembered in this browser), so showing the same Victory again shows the
  rank, not the form. Custom games, campaign missions, the tutorial and the
  Showcase are not Regular games and are never offered. A Regular game on
  Easy (`pulp_wars-q6cc`) earns its star but is never offered either
  (`leaderboardRegularGameV7`), so the boards hold only Normal and harder
  games and the stored fields are unchanged.
- Nothing waits on the store: every request gives up after 8 seconds and every
  failure is a line of text. Play is never blocked.

The submitted score is the score the stars read (the "Score N" line of the
grade, [RULESET_7_SCORE_AND_STARS.md section 5.1](product/RULESET_7_SCORE_AND_STARS.md#51-the-score-the-stars-read)):
the final score, or the score at round 30 for a longer Domination match, so a
grind after round 30 buys nothing.

"Regular game" is bead `pulp_wars-2yc.103`'s kind (`isRegularGameV7` in
`src/engine/v7/game-kind.ts`, the same query the tribe stars use): a quick
start where the player chose only the mode, tribe, opponents and difficulty.
A custom game, campaign missions, the tutorial and the Showcase are never
offered. "Play again" replays the same setup and seed; a regular game
replayed that way still counts (a new match with its own result).

## What is stored

Firebase project `pulp-wars` (a project of its own, used only by Pulp Wars;
bead `pulp_wars-2yc.105`), Cloud Firestore database `(default)`, collection
**`pulpWarsScores`**, one document per submitted score with a random
20-character id and these fields (the seven always, `players` since bead
`pulp_wars-2yc.112`):

| Field       | Type      | Value                                                                                                                         |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `name`      | string    | 1 to 16 characters: letters, digits, spaces and `. , ! ? ' - _`, no space at either end. Inner spaces collapsed to one.       |
| `faction`   | string    | The player's faction id: `ORIGINAL` (Humans), `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, `DWARF`, `CANDY`, `CULT` |
| `score`     | integer   | 0 to 100000                                                                                                                   |
| `mode`      | string    | `DOMINATION` or `PERFECTION`                                                                                                  |
| `rounds`    | integer   | Rounds played, 1 to 1000 (at most 30 in Perfection)                                                                           |
| `version`   | string    | The ruleset id, such as `pulp-wars-poc-7r100`                                                                                 |
| `timestamp` | timestamp | The server's time of the write                                                                                                |
| `players`   | integer   | Optional. The players of the match, the human included, 2 to 16. Absent on older scores.                                      |

Nothing else: no account, no id of the player or the browser, no save data.
The name is whatever the player types; a small built-in filter in the game
refuses the worst words before sending.

In this browser (`localStorage`) the game keeps the last name sent
(`pulpWars.leaderboard.name.v1`) and the last 100 matches sent with their
document id and rank (`pulpWars.leaderboard.submitted.v1`).

### How the game talks to Firestore

No Firebase SDK is bundled: the game calls Firestore's REST API with `fetch`
and the project's public web API key (the config in
`FIREBASE_CONFIG_V7`):

- **Submit:** `POST https://firestore.googleapis.com/v1/projects/pulp-wars/databases/(default)/documents:commit?key=…`
  with one write: the six fields and `players`, an `updateTransforms` entry
  `{fieldPath: "timestamp", setToServerValue: "REQUEST_TIME"}` (the server
  sets the time; the rules require `timestamp == request.time`) and
  `currentDocument: {exists: false}` (a create, never an overwrite). If the
  store refuses that write (rules published before `players` existed allow
  only the seven older fields), the game sends the same score once more
  without `players` (`submitWithFallbackV7`), so the score is kept and shows
  "—" for players.
- **Top 50:** `POST …/documents:runQuery?key=…`, `mode == <board>`, ordered by
  `score` descending, limit 50.
- **Rank after a submit:** `POST …/documents:runAggregationQuery?key=…`, a
  `count` of `mode == <board>` and `score > <yours>`, ordered by `score`
  descending; the rank is that count plus one.

Requests are sent with `cache: "no-store"` and no cookies, and the service
worker never answers or keeps them (`NEVER_CACHED_HOSTS_V1` in
`src/service-worker/asset-cache-worker.ts`; they are on another origin too).

### Where it runs

Only a production build served from the real site
(https://nadbordrozd.github.io/pulp_wars/) talks to Firestore. Everywhere else
(the development server, the tests, any local host such as a `vite preview`,
the review and smoke scripts, a browser driven by automation, a page opened
with `?browser-smoke=1`) the game uses a board in memory that starts empty and
lives as long as the tab; its screen says "Practice board: scores stay in this
browser tab." `?leaderboard-preview=1` fills that practice board with ten
sample rows to check the look. No test or script writes to the real project.

## What the owner must do in the Firebase console

Both steps are needed once, before the deployed game's leaderboard works.
Until then the game shows "The leaderboard turned the request down." or
"Couldn't reach the leaderboard." and play is unaffected.

### 1. Publish the security rules

`firebase/firestore.rules` holds the `pulpWarsScores` block, its validation
function and a catch-all deny for every other collection.

1. Open https://console.firebase.google.com/project/pulp-wars/firestore
   (Firebase Console > project **pulp-wars** > Build > **Firestore
   Database** > **Rules** tab).
2. Select everything in the editor and delete it.
3. Paste the whole of [`firebase/firestore.rules`](../firebase/firestore.rules).
4. Press **Publish**. (The Rules Playground on the same page can try a
   `create` on `/pulpWarsScores/test` before publishing, if wanted.)

If the rules pasted earlier were the older combined file (written when the
leaderboard shared Vibe Crawler's Firebase project, with an extra
`match /leaderboard/{scoreId}` block for Vibe Crawler), they work too: the
`pulpWarsScores` block is the same and the extra block only governs a
collection Pulp Wars never uses. The current file is cleaner, so paste it the
next time the rules are edited.

What the `pulpWarsScores` rules allow: anyone may read; a document may be
created only with the seven fields above (`hasAll`) and at most `players`
besides (`hasOnly`), each of the right type and in range (`players` an
integer from 2 to 16 when present), the name matching the pattern, the
faction one of the nine, and `timestamp == request.time`; nobody may update or
delete a document from a browser.

**After bead `pulp_wars-2yc.112` (players):** rules published before it
refuse the `players` field. The game copes (it sends the score again without
it), but those scores show "—" until the current file is published. To show
the count, paste the current `firebase/firestore.rules` as above. Existing
documents are untouched: the rules only judge new writes.

### 2. Create the composite index

The top-50 query and the rank count filter on `mode` and order by `score`, so
Firestore needs one composite index:

| Collection ID    | Field 1              | Field 2                | Query scope |
| ---------------- | -------------------- | ---------------------- | ----------- |
| `pulpWarsScores` | `mode` **Ascending** | `score` **Descending** | Collection  |

1. Open https://console.firebase.google.com/project/pulp-wars/firestore
   (Firestore Database > **Indexes** tab > **Composite**).
2. **Create index** (or **Add index**): Collection ID `pulpWarsScores`;
   field `mode` Ascending; field `score` Descending; Query scope
   **Collection**. Create.
3. Wait until its status is **Enabled** (a few minutes).

Without it the store answers the board's query with
`FAILED_PRECONDITION: The query requires an index`, and that answer (visible in
the browser's network panel) also carries a console link that creates exactly
this index.

### 3. If the API key is restricted

The game uses the web API key of the pulp-wars web app
(`AIzaSyCO5yfBepnhE7eL9Ljkn0NcOueoN6FhJo8`, a public client identifier). If
that key has restrictions in
Google Cloud Console > APIs & Services > Credentials:

- **Website restrictions:** add `https://nadbordrozd.github.io/*`. A
  cross-origin request sends only the origin as its referrer, so a pattern
  with the `/pulp_wars/` path would not match.
- **API restrictions:** the **Cloud Firestore API** must be allowed.

With no restrictions nothing needs to change.

## Fake scores, and removing bad entries

The game runs in the player's browser, so anyone who opens the browser's
developer tools can send any score that passes the rules: there is no server
that replays the match. The rules limit the damage: only creates (no edits, no
deletes, no other collections), only the seven fields and the player count, a short name of plain
characters, a known faction, a whole score of at most 100000, a sane round
count and the server's own time. They cannot tell a real 900 from an invented
one. The board is a friendly list for a handful of players, not a contest
with prizes; if abuse ever becomes a problem, Firebase App Check (with
reCAPTCHA) would make scripted writes harder, at the cost of an SDK and a
console setup.

To delete a bad entry:

1. Open https://console.firebase.google.com/project/pulp-wars/firestore
   (Firestore Database > **Data** tab) and open the `pulpWarsScores`
   collection.
2. Find the document (the panel's filter can match `name`, or sort by
   `score`).
3. Open the document's **⋮** menu and choose **Delete document**, then
   confirm.

The console acts as the owner, so the rules' `allow delete: if false` does not
stop it. Players' pages show the change on their next fetch (within a minute).
