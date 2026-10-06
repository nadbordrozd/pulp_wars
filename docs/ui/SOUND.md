# Sound

Bead `pulp_wars-2yc.10`. The game has sound effects for attacks, damage,
deaths, cities, the economy, turns, achievements and the interface. Every
sound is synthesised in the browser for now: there are no audio files and no
dependencies. Stock recordings can replace any of them later by changing one
manifest entry ([Swapping in a stock file](#swapping-in-a-stock-file)).

Nobody listened to these sounds while they were written. The recipes are kept
conservative and held to measured bounds by a test, but their character and
relative loudness still need a human ear
([What has not been checked](#what-has-not-been-checked)).

## Player-facing behaviour

- **On by default.** Sound starts with the player's first click, tap or key
  press. Browsers do not allow sound before a gesture, and the game creates
  no audio device before one.
- **Settings.** A loudspeaker toggle (pressed is on) and a volume slider,
  0–100% in steps of 5, default 70%. Letting go of the slider plays a short
  sound at the new level. Below them, a collapsed **Sound test** lists every
  sound with a play button.
- **Mute in a match.** The match menu's first item is **Sound**, a toggle with
  the same loudspeaker icon. It changes in place, so the menu stays open.
- **Gallery.** The Gallery has a **Sounds** tab: every sound as a card with a
  picture, grouped, and a row per faction for its theme
  ([The Gallery's Sounds tab](#the-gallerys-sounds-tab)).
- **Hidden tab.** No sound starts while the tab is hidden, and the sounds
  playing when it is hidden are cut.
- **Reduced motion** does not turn sound off. The sounds of a step play when
  its still frame shows.
- **Fast Forward** skips the animations and their sounds. Only the start of
  the player's turn and the end of the match are still heard.
- **Stored preference.** `pulpWars.audio.v1` in the browser's local storage
  holds `{"enabled": true|false, "volume": 0–100}`. It is outside the shared
  settings envelope, like the art set and the board saturation. A missing or
  malformed value is on at 70%. It never enters a save, a replay or the
  engine.

## How it is built

Everything is in `src/audio/`. Importing it creates nothing.

| File                  | What it does                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sound-manifest.ts`   | The list of sound ids and, for each, its label, category, priority, detune range and source (a synth recipe or a file). Also the list of faction themes.                                      |
| `playable-sound.ts`   | One lookup for the mixer and the device over both lists: an effect or a theme by its id.                                                                                                      |
| `synth.ts`            | Renders a recipe to samples with plain arithmetic: oscillators (sine, triangle, band-limited square and saw), seeded noise, pitch glides, vibrato, simple FM, envelopes and one-pole filters. |
| `mixer.ts`            | Decides which requested sounds start: coalescing, the voice limit, category levels and detune.                                                                                                |
| `web-audio-output.ts` | The WebAudio device: one `AudioBuffer` per sound, a master gain and a limiter. The `AudioContext` is created in `unlock`, never earlier.                                                      |
| `sound-events-v7.ts`  | Maps presentation steps and projected events to sounds. Pure functions.                                                                                                                       |
| `audio-settings.ts`   | Loads and stores the preference.                                                                                                                                                              |
| `game-audio.ts`       | The object the interface talks to: preference, gesture gating, hidden-tab silence and a log of requests.                                                                                      |
| `sound-table.ts`      | The recipe table below, computed from the manifest.                                                                                                                                           |

A recipe is rendered once, on first use, into a buffer at 44.1 kHz. Rendering
in ordinary code instead of with live oscillator nodes means the same samples
can be measured in a test that has no sound card.

### Mixer rules

- **Coalescing.** A sound requested again within 60 ms of a start of the same
  sound (now or already scheduled) is dropped.
- **Voices.** At most 8 sounds play at once. When all are busy, a new sound
  takes the voice of the least important one (the oldest among equals), unless
  every voice is more important than the new sound; then the new one is
  dropped. Priorities: 3 for tunes, deaths and explosions, 2 for most effects,
  1 for small details such as steps and clicks.
- **Crowding.** From the fifth simultaneous voice on, a new sound starts at
  75% of its level.
- **Detune.** Effects are played up to 20–90 cents sharp or flat at random, so
  repeats do not sound mechanical. Tunes are never detuned.
- **Levels.** Category gains are 0.9 for combat, 0.8 for economy and 0.7 for
  the interface. Ambience (0.5) and music (0.5) have a category and no sound
  yet. The volume slider is squared before it becomes the master gain, and a
  limiter sits after the master gain.
- **Music.** One music voice plays at a time: a theme that starts ends the
  theme that was playing. Effects play over it. A looping theme holds its
  voice until it is stopped.
- **One sound.** `stop(id)` ends every voice of one sound and lets it start
  again at once (without it, a replay inside the coalescing window is
  dropped). `remainingMs(id)` is the time until it is over: 0 when it is not
  playing, infinite for a loop. The Gallery uses both.
- **Fixed detune.** `play(id, { detune })` plays at a fixed share of the
  sound's detune range, from -1 (flat end) to 1 (sharp end), instead of a
  random one. The game never passes it; the Gallery does.

### Timing and fog

The board host announces each presentation step as it starts to play
(`setPresentationStepListener`). `soundCuesForStepV7` turns the step into
sounds with delays inside the step: a melee hit lands at 56% of the lunge, a
ranged or siege hit when the projectile arrives, and an attack with its own
cue (`attack-effects-v7`) at that cue's hit time. Delays shrink with the Fast
animation speed.

The steps are built only from the viewer's own before and after views and the
events projected for the viewer. A fight in the viewer's fog is not projected,
produces no step and makes no sound.

Events that no step carries are mapped by `soundCuesForBoundaryV7`. Sounds of
the viewer's own instant actions play when the command is accepted. The others
play after the board has finished the boundary's animations. Other players'
economy is silent.

## Event mapping

### Presentation steps

| Step                                                            | Sounds                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Melee attack                                                    | `attack.melee`, then `impact.hit`                                     |
| Ranged attack                                                   | `attack.ranged`, then `impact.hit`                                    |
| Siege attack (Catapult class)                                   | `attack.siege`, then `impact.heavy`                                   |
| Lich bolt                                                       | `attack.magic`, then `impact.hit`                                     |
| Rocket Cart firework                                            | `attack.rocket`, then `impact.explosion`                              |
| Clockwork Gunner burst                                          | `attack.gatling`, then `impact.hit`                                   |
| Steam Cannon                                                    | `attack.cannon`, then `impact.heavy`                                  |
| Ice boulder and Rockfall                                        | `attack.siege`, then `impact.ice`                                     |
| Harpoon                                                         | `attack.ranged`, then `impact.hit`                                    |
| Pie Launcher                                                    | `attack.siege`, then `impact.splat`                                   |
| Gumball Gunner                                                  | `attack.pop`, then `impact.hit`                                       |
| Martian heat ray and ray pistol                                 | `attack.ray`, then `impact.hit`                                       |
| Any attack that kills either side                               | `unit.death` just after the hit                                       |
| Splash, Wail, Plague, crush and eruption damage                 | `unit.hurt`, and `unit.death` when lethal                             |
| Explosion wave, Mole eruption, Gyrocopter bomb                  | `impact.explosion`                                                    |
| Bomb Chucker bomb, Spitter acid                                 | `attack.siege`; the burst or `impact.splat` follows from its own step |
| Shield flare                                                    | `impact.shield`                                                       |
| Beam Down, Tractor Beam                                         | `special.beam`                                                        |
| Mind Control                                                    | `special.mind`                                                        |
| Control released, ice crush                                     | `impact.ice`                                                          |
| Shatter                                                         | `special.freeze`, then `impact.ice`                                   |
| Cold Snap, Cold Aura, Freeze                                    | `special.freeze`                                                      |
| Bolas                                                           | `attack.ranged`, then `special.freeze`                                |
| Sweep                                                           | `attack.melee`                                                        |
| Ice melting                                                     | `impact.splash`                                                       |
| Lich splash                                                     | `impact.splash`                                                       |
| Prize flag, Rally, Hatch call                                   | `support.rally`                                                       |
| Tend, Cure, Regenerate, Recover, Fountain, Windmill, Sugar Toss | `support.heal`                                                        |
| Raise, Devour, Wail, Infect, Grave, Plague, Bitten              | `support.dark`                                                        |
| Lifesteal                                                       | `support.drain`                                                       |
| Shrine blessing, Sugar Rush, Re-bake                            | `special.sparkle`                                                     |
| Salvage, Spider bounty                                          | `economy.coin`                                                        |
| Tunnel                                                          | `special.burrow`                                                      |
| Assemble, Repair                                                | `economy.build`                                                       |
| Knockback                                                       | `special.puff`                                                        |
| Crash                                                           | `special.dizzy`                                                       |
| Crash ending, Egg laid                                          | `special.pop`                                                         |
| Peppermint Surprise                                             | `special.pop`, then `unit.hurt`                                       |
| Splat, acid landing                                             | `impact.splat`                                                        |
| Bounce                                                          | `special.boing`                                                       |
| Crumbs eaten                                                    | `economy.harvest`                                                     |
| Charge! hit, Bow Ram                                            | `impact.heavy`                                                        |
| Hatch, Egg destroyed                                            | `special.hatch`                                                       |
| Grow                                                            | `unit.levelup`                                                        |
| The viewer's own unit moving                                    | `unit.step`                                                           |
| Another player's move, a push, a visibility crossfade           | none                                                                  |
| Another player's building in sight                              | `economy.build`, quieter                                              |

### Events without a step

"Own" means the event names the viewer as its player, or the city or unit is
the viewer's.

| Event                                             | When                 | Sound                  |
| ------------------------------------------------- | -------------------- | ---------------------- |
| Own End Turn                                      | at once              | `turn.end`             |
| Own research                                      | at once              | `research.complete`    |
| Own harvest, hunt, fishing, pearls                | at once              | `economy.harvest`      |
| Own building, Port, Shipyard, Road, Field Defense | at once              | `economy.build`        |
| Own forest or mountain work                       | at once              | `economy.build`        |
| Own Monument                                      | at once              | `achievement.monument` |
| Own unit trained or granted                       | at once              | `unit.train`           |
| Own city reward chosen                            | at once              | `reward.chosen`        |
| Own Disband that returns Coins                    | at once              | `economy.coin`         |
| City captured by the viewer                       | after the animations | `city.capture`         |
| Neutral village captured by the viewer            | after the animations | `village.capture`      |
| City lost by the viewer                           | after the animations | `city.lost`            |
| Own city levels up                                | after the animations | `city.levelup`         |
| Own unit promoted                                 | after the animations | `unit.levelup`         |
| Own treasure                                      | after the animations | `economy.treasure`     |
| Own spoils, plunder, automatic reward, income     | after the animations | `economy.coin`         |
| Own achievement                                   | after the animations | `achievement.unlocked` |
| The viewer's turn starts                          | after the animations | `turn.start`           |
| Match won                                         | after the animations | `match.victory`        |
| Match lost                                        | after the animations | `match.defeat`         |

Several sounds of one phase are played 140 ms apart, each once. The end of the
match plays its tune alone.

### Interface

| Action                             | Sound       |
| ---------------------------------- | ----------- |
| Any button, link or disclosure     | `ui.click`  |
| Selecting a unit, city or tile     | `ui.select` |
| Sound toggle, volume slider let go | `ui.toggle` |
| A command the game rejects         | `ui.error`  |

## The Gallery's Sounds tab

Bead `pulp_wars-2yc.19`. The tab is the last of the Gallery's tabs and is
remembered with the others. It replaces the header's Sounds button of
`pulp_wars-2yc.10`. The collapsed Sound test in Settings is unchanged.

- **What it lists.** Every id of `SOUND_IDS_V1`, once, and nothing else. The
  list is computed (`src/render/gallery-sounds-presentation-v7.ts`), so a
  sound added to the manifest appears without any Gallery change. Two tests
  compare the cards with the manifest.
- **Groups.** By the first part of the manifest id, in this order:

  | Group              | Id parts                                           |
  | ------------------ | -------------------------------------------------- |
  | Attacks            | `attack`                                           |
  | Hits               | `impact`                                           |
  | Units              | `unit`                                             |
  | Abilities          | `support`, `special`                               |
  | Cities and economy | `city`, `village`, `reward`, `research`, `economy` |
  | Turn and match     | `turn`, `achievement`, `match`                     |
  | Interface          | `ui`                                               |
  | Themes             | one row per faction                                |

  An id whose first part is not in the table goes to a group named Other,
  which is shown only when it has a sound.

- **A card.** A picture, the manifest's label, a few words on when the sound
  plays, and a play mark. The picture is the portrait of the unit that makes
  the sound where one does (the Lich for `attack.magic`), other game art (a
  city, the coin), or an interface glyph. Until the art has loaded the card
  shows a loudspeaker. No manifest id is shown. A sound without a note still
  gets a card, with the loudspeaker and no words; a test names it.
- **Playing.** The whole card is the play button. It plays through the
  game's own audio and mixer, at the player's volume. A second press starts
  the sound again from its beginning. Another card plays over it, as effects
  do in a match. While a sound plays its card is outlined in gold and three
  bars replace the play mark; the bars move only with full motion (the
  `prefers-reduced-motion` setting and the game's own Motion setting both
  still them). A sound of one second or longer, and every theme, shows a
  stop button while it plays. Leaving the tab or the Gallery stops what the
  tab was playing.
- **Variants.** A sound the mixer detunes has two small buttons beside its
  card, ♭ and ♯: the flat and the sharp end of its range. The card itself
  plays it as a match does, at a random pitch in between. **Build** has a
  third, an eye: the quieter level of another player's building in sight.
  No sound differs by faction; a unit with a sound of its own has its own
  card.
- **Volume and mute.** The toggle and the slider of Settings are at the top
  of the tab and change the same stored preference. With sound off the tab
  reads "Sound is off" with a **Turn on** button; with the volume at zero,
  "Volume is at 0" with **Turn up**, which sets 70%. While either shows, a
  card plays nothing and points at the notice. In a browser that cannot
  play sound the notice reads "No sound on this device".
- **Autoplay.** The press on a card is the gesture that opens the audio
  device. When that press is the first of the session the device may need a
  moment; the card tries once more 150 ms later.
- **Keyboard.** Every card is a tab stop. Up and Down move to the card
  above or below, Left and Right through every control in order, including
  a card's variants and stop, Home and End go to the first and last card. Enter or Space
  plays. Each control has a name: "Play: Hit", "Play lower: Hit", "Stop:
  Victory", "Play: Undead theme, coming soon".
- **Phone.** One card per row; the page does not scroll sideways.

## Faction themes

The game has no faction theme music yet. The manifest has the place for it,
and the audio and the Gallery already use it. The music direction, the
prompt for every faction's theme and the process for generating, choosing
and recording one are in
[Faction theme music](../audio/THEME_MUSIC.md) (bead `pulp_wars-2yc.21`).

```ts
// src/audio/sound-manifest.ts
export interface SoundThemeEntryV1 {
  readonly id: `theme.${string}`; // "theme.undead"
  readonly faction: FactionIdV7; // at most one theme per faction
  readonly loop: boolean; // repeats until it is stopped
  readonly source: SoundSourceV1; // a FILE (or a SYNTH recipe), as for effects
}

export const SOUND_THEMES_V1: readonly SoundThemeEntryV1[] = [];
```

To add a theme, put the recording under `public/audio/` and add one entry:

```ts
{
  id: "theme.undead",
  faction: "UNDEAD",
  loop: true,
  source: {
    kind: "FILE",
    url: `${import.meta.env.BASE_URL}audio/theme-undead.ogg`,
  },
},
```

Nothing else changes:

- The audio plays it by its id (`audio.play("theme.undead")`), in the music
  category, never detuned, with the priority of a tune. The file is fetched
  and decoded after the first gesture, like an effect's.
- The Gallery's **Themes** group has one row per faction of the game (eight
  today), with the faction's Fighter portrait in its colour. A faction
  without an entry reads "Coming soon" and cannot be played. A faction with
  an entry has a playable row with a stop button.

Nothing in a match plays a theme yet. When a theme should play (on the
faction's turn, on the title screen) is a product decision that has not
been made; the options and a proposal are in
[Where themes play](../audio/THEME_MUSIC.md#where-themes-play-proposal).

## Recipes

Pitch is the range of the tonal layers in Hz. Length is in ms and includes a
12 ms tail. Peak is the level the rendered sound is scaled to (1 would be
full scale). A unit test compares this table with the manifest.

| Id                     | Label            | Category | Waveforms                        | Pitch (Hz) | Length (ms) | Peak |
| ---------------------- | ---------------- | -------- | -------------------------------- | ---------- | ----------- | ---- |
| `attack.melee`         | Melee swing      | combat   | noise + triangle                 | 140–220    | 122         | 0.3  |
| `attack.ranged`        | Arrow shot       | combat   | triangle + noise                 | 300–520    | 102         | 0.28 |
| `attack.siege`         | Siege thump      | combat   | noise + sine                     | 55–130     | 252         | 0.4  |
| `attack.ray`           | Energy ray       | combat   | saw + sine                       | 210–1400   | 232         | 0.28 |
| `attack.magic`         | Dark bolt        | combat   | sine + triangle                  | 440–1320   | 272         | 0.28 |
| `attack.rocket`        | Rocket launch    | combat   | noise + saw                      | 300–900    | 312         | 0.26 |
| `attack.gatling`       | Gun burst        | combat   | noise + square                   | 110–190    | 149         | 0.32 |
| `attack.cannon`        | Cannon           | combat   | sine + noise                     | 42–110     | 272         | 0.45 |
| `attack.pop`           | Gumball pop      | combat   | sine + triangle                  | 420–1500   | 82          | 0.26 |
| `impact.hit`           | Hit              | combat   | sine + noise                     | 70–190     | 122         | 0.4  |
| `impact.heavy`         | Heavy hit        | combat   | sine + noise + square            | 45–120     | 232         | 0.46 |
| `impact.explosion`     | Explosion        | combat   | noise + sine                     | 36–90      | 432         | 0.5  |
| `impact.ice`           | Ice crack        | combat   | noise + sine                     | 1250       | 182         | 0.26 |
| `impact.splat`         | Splat            | combat   | sine + noise                     | 90–600     | 162         | 0.34 |
| `impact.shield`        | Shield           | combat   | sine + triangle                  | 620–1240   | 252         | 0.26 |
| `impact.splash`        | Splash           | combat   | noise + sine                     | 250–500    | 172         | 0.24 |
| `unit.hurt`            | Damage           | combat   | square + noise                   | 165–330    | 132         | 0.3  |
| `unit.death`           | Death            | combat   | triangle + square + noise        | 82–392     | 372         | 0.34 |
| `unit.step`            | Step             | combat   | noise + sine                     | 110–150    | 42          | 0.1  |
| `unit.train`           | Unit trained     | economy  | square + sine + noise            | 70–784     | 332         | 0.26 |
| `unit.levelup`         | Unit level up    | economy  | square + triangle                | 440–1109   | 352         | 0.24 |
| `support.heal`         | Heal             | combat   | triangle + sine                  | 523–1568   | 412         | 0.26 |
| `support.rally`        | Rally            | combat   | square + sine + noise            | 70–659     | 352         | 0.26 |
| `support.dark`         | Dark magic       | combat   | saw + sine + triangle            | 73–233     | 372         | 0.3  |
| `support.drain`        | Life drain       | combat   | sine + triangle                  | 300–1240   | 292         | 0.22 |
| `special.beam`         | Beam             | combat   | sine + triangle                  | 380–1800   | 392         | 0.22 |
| `special.mind`         | Mind control     | combat   | sine                             | 520–780    | 472         | 0.22 |
| `special.freeze`       | Freeze           | combat   | triangle + noise                 | 1047–1568  | 392         | 0.2  |
| `special.burrow`       | Burrow           | combat   | noise + sine                     | 50–70      | 352         | 0.34 |
| `special.hatch`        | Egg crack        | combat   | noise + sine                     | 500–900    | 212         | 0.26 |
| `special.pop`          | Pop              | combat   | sine + noise                     | 300–900    | 67          | 0.24 |
| `special.puff`         | Steam puff       | combat   | noise                            | noise only | 192         | 0.2  |
| `special.sparkle`      | Sparkle          | combat   | triangle                         | 659–1319   | 337         | 0.2  |
| `special.dizzy`        | Dizzy            | combat   | sine + triangle                  | 130–700    | 392         | 0.22 |
| `special.boing`        | Bounce           | combat   | triangle                         | 160–420    | 232         | 0.26 |
| `city.capture`         | City captured    | economy  | square + sine + noise + triangle | 70–1047    | 662         | 0.32 |
| `village.capture`      | Village captured | economy  | square + sine + noise + triangle | 70–659     | 472         | 0.28 |
| `city.lost`            | City lost        | economy  | square + triangle                | 110–330    | 692         | 0.3  |
| `city.levelup`         | City level up    | economy  | triangle + square                | 262–1047   | 482         | 0.28 |
| `reward.chosen`        | Reward chosen    | economy  | triangle + sine                  | 784–1175   | 362         | 0.24 |
| `research.complete`    | Research done    | economy  | sine                             | 587–880    | 572         | 0.26 |
| `economy.build`        | Build            | economy  | sine + noise                     | 149–280    | 197         | 0.3  |
| `economy.harvest`      | Harvest          | economy  | triangle + noise                 | 370–587    | 202         | 0.22 |
| `economy.coin`         | Coins            | economy  | square + sine                    | 988–1319   | 342         | 0.2  |
| `economy.treasure`     | Treasure         | economy  | square + triangle                | 330–1661   | 492         | 0.22 |
| `turn.start`           | Your turn        | ui       | triangle + sine                  | 440–880    | 442         | 0.24 |
| `turn.end`             | End turn         | ui       | triangle                         | 330–440    | 372         | 0.18 |
| `achievement.unlocked` | Achievement      | ui       | square + triangle + sine + noise | 70–1047    | 1162        | 0.32 |
| `achievement.monument` | Monument         | ui       | triangle + square + sine + noise | 70–1047    | 1612        | 0.32 |
| `match.victory`        | Victory          | ui       | triangle + square + sine + noise | 70–1319    | 1812        | 0.36 |
| `match.defeat`         | Defeat           | ui       | triangle + saw                   | 82–440     | 1712        | 0.32 |
| `ui.select`            | Select           | ui       | triangle                         | 660–700    | 62          | 0.12 |
| `ui.click`             | Click            | ui       | sine + noise                     | 300–420    | 47          | 0.12 |
| `ui.toggle`            | Toggle           | ui       | triangle                         | 523–784    | 152         | 0.14 |
| `ui.error`             | Not allowed      | ui       | square                           | 156–196    | 272         | 0.2  |

### Bounds the test enforces

`tests/unit/sound-synth-ui.test.ts` renders every recipe and checks:

- length: at most 480 ms for effects and 2 s for the twelve tunes;
- peak: equal to the declared peak, which is between 0.1 and 0.5;
- loudness: RMS between 0.02 and 0.15;
- offset: the mean of the samples is below 0.001 in size, and the first and
  last samples are silent (no click);
- brightness: below 4.5 kHz, measured as the pitch of a pure tone whose
  sample-to-sample change equals the sound's;
- every noise layer has a low-pass at 5.2 kHz or lower, no sine layer goes
  above 1.7 kHz and no other tonal layer above 2.2 kHz.

## Swapping in a stock file

1. Put the recording under `public/audio/`, for example
   `public/audio/impact-hit.ogg`. Use a format every target browser decodes
   (Ogg Vorbis or MP3), trimmed, without silence at the start.
2. In `src/audio/sound-manifest.ts`, change the entry's `source`:

   ```ts
   source: {
     kind: "FILE",
     url: `${import.meta.env.BASE_URL}audio/impact-hit.ogg`,
     fallback: previousRecipe, // optional
   },
   ```

   `BASE_URL` keeps the path right on GitHub Pages. With a `fallback` recipe
   the synthesised sound plays until the file has loaded and if it cannot be
   loaded; without one that sound is silent until then.

3. Nothing else changes. Call sites and the event mapping use the id. The
   file is fetched and decoded after the first gesture. `priority`,
   `jitterCents` and `category` still apply; set `jitterCents` to 0 for a
   recording that should not be detuned.
4. The recipe table and its test read the fallback recipe. An entry without a
   fallback shows no waveforms and a length of 0 in the table; update the
   table to match (the test names the row).

## Test hook

`tests/fixtures/fake-audio-context.ts` is a recording `AudioContext` for
jsdom: the sources started, with their rate, level and loop flag, and
whether each was stopped.

`GameAudioV1.log` holds the last 64 requests as `{ id, outcome }`. The outcome
is `PLAYED`, `COALESCED`, `DROPPED`, `UNAVAILABLE`, `MUTED`, `HIDDEN` or
`LOCKED` (no gesture yet, or no device). The app view exposes its audio as
`view.audio`, so the browser smoke reads
`__PULP_WARS_APP__.view.audio.log`. Tests run without WebAudio: every request
is logged as `LOCKED` and nothing else happens.

## What has not been checked

- How the sounds actually sound: character, pleasantness, whether an attack
  reads as an attack.
- Relative loudness between sounds and categories. Peaks and RMS are bounded,
  but perceived loudness depends on pitch and length.
- Whether a busy AI turn is comfortable at the default voice limit and
  coalescing window.
- Timing by ear against the animations, and behaviour on iOS Safari, where
  the audio device follows the mute switch and its own unlock rules.
- A theme played from a real recording. The tests play a theme through the
  manifest with a stand-in device; no recording exists to listen to.
