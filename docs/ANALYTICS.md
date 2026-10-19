# Play statistics (Google Analytics)

Bead `pulp_wars-2yc.101`. The deployed game counts plays and the factions
people play with Google Analytics 4 (Measurement ID `G-3BEWEP1Y27`, which is
public). The code is `src/app/analytics-v7.ts`; the banner and the Settings
toggle are in `src/render/dom/app-view-v7.ts`.

## Where it runs

Only a production build served from the real site
(https://nadbordrozd.github.io/pulp_wars/). It is off in the development
server, in the tests, on any local host (`localhost`, `127.0.0.1`, `*.test`,
`*.localhost`, a LAN address: so a local `vite preview` and every review or
smoke script), in a browser driven by automation (`navigator.webdriver`) and
on a page opened with `?browser-smoke=1`. Off means no banner, no toggle, no
queue and no script.

`?analytics-preview=1` shows the banner and the toggle anywhere, with the
queue in place but Google's script never loaded, so their look can be checked
without sending a hit.

## Consent

- On start the page sets up Google's queue (`dataLayer`, `gtag`) and, before
  the tag is configured, Consent Mode v2 defaults:
  `gtag('consent', 'default', {analytics_storage, ad_storage, ad_user_data,
ad_personalization: 'denied'})`. Then `js` and `config`, with
  `allow_google_signals: false` and `allow_ad_personalization_signals: false`.
  No user id is ever set.
- Google's script (`https://www.googletagmanager.com/gtag/js?id=G-3BEWEP1Y27`)
  is loaded only after the player accepts. Before an answer, and after a
  Decline, nothing is sent and no cookie is set.
- The first time, a small strip at the foot of the front screens says "Pulp
  Wars uses Google Analytics to count plays and see which factions people
  play. No ads." with Accept and Decline. It blocks nothing, takes no focus
  and never shows during a match. It goes once answered.
- The answer is kept in `localStorage` under `pulpWars.analytics.consent.v1`
  (`granted` or `denied`). Accept sends
  `gtag('consent', 'update', {analytics_storage: 'granted'})` and loads the
  script; a stored Accept is applied before `config` on the next visit.
- Settings has "Share anonymous play statistics: on/off" to change it later.
  Turning it off sends the `denied` update, stops the events and deletes the
  `_ga` cookies.
- Storage that refuses the write keeps the answer for the visit.

## Events

Sent only while the player has accepted. Parameters are short lowercase words
and numbers; no names, save data or free text. Factions are their ids in lower
case, with `ORIGINAL` sent as `human`.

| Event               | When                                                                                                  | Parameters                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `match_start`       | A match is launched (New game, a campaign mission, the tutorial, Restart)                             | `faction` (the player's), `map_type` (`pangea`, `continents`, `mission`, ...), `map_size` (the board width), `opponents`, `difficulty` (`normal`/`hard`/`harder`/`brutal`, read back from the head start), `mode` (`domination`/`perfection`), `source` (`quick_start`, `advanced`, `campaign`, `tutorial`, `restart`), `game_kind` (`regular`/`custom` for a skirmish, `mission` for a mission or the tutorial) |
| `match_end`         | A match ends; or an unfinished match is replaced by a new launch or its save is deleted (`abandoned`) | `result` (`win`/`loss`/`abandoned`), `rounds`, `stars` (the mission's stars or the skirmish grade on a win, else 0; always 0 for a custom game), `faction`, `difficulty`, `mode`, `game_kind`                                                                                                                                                                                                                    |
| `mission_start`     | With `match_start`, for a campaign mission                                                            | `mission_id` (e.g. `frontier_1`), `faction`                                                                                                                                                                                                                                                                                                                                                                      |
| `mission_end`       | With `match_end`, for a campaign mission                                                              | `mission_id`, `result`, `stars`                                                                                                                                                                                                                                                                                                                                                                                  |
| `tutorial_complete` | The tutorial's last step is done (not on Skip)                                                        | none                                                                                                                                                                                                                                                                                                                                                                                                             |

`source` is `advanced` when Custom game (Advanced settings before
`pulp_wars-2yc.103`) was open or a Size or AI head start was set there.
`game_kind` (`pulp_wars-2yc.103`) is the setup's kind
([QUICK_START.md](ui/QUICK_START.md#regular-and-custom-games)): only a
regular game earns stars. A match left with Save & quit and never resumed sends no
`match_end`. GA4's own page view comes with `config` once the script loads.

## Robustness

Every call is guarded. An ad blocker that blocks the script, a page that
refuses the queue or storage, or no network leaves the game as it is: the
queue then just stays a queue. The service worker
(`src/service-worker/asset-cache-worker.ts`) handles only its own origin, so
it never caches or answers the requests to Google. There is no
Content-Security-Policy to widen.
