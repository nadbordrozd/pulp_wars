# Faction theme music

Beads `pulp_wars-2yc.21` and `pulp_wars-2yc.23` (the Suno Styles-field
form). Every faction gets a theme: a short instrumental loop. The user generates the music in Suno or ElevenLabs Music; this
document holds the direction, the prompts and the process, so that eight
themes made on different days sound like one soundtrack and a ninth can
join them later.

**Status.** The music exists (bead `pulp_wars-2yc.27`): on 2026-10-07 the
user generated the eight faction themes and the title theme with Suno from
these prompts, and the game plays them
([Where themes play](#where-themes-play), [Records](#records)). Nobody on
the development side has listened to them: the levels and the loop points
were set by measurement
([What has not been checked](../ui/SOUND.md#what-has-not-been-checked)).
The service descriptions below are written from general knowledge of the
two products as of October 2026 and were not checked against their live
interfaces ([What to check first](#what-to-check-in-the-service-first)),
with one exception: the user checked on 2026-10-06 that Suno's Styles field
takes up to 1000 characters.

The prompts live in [`theme-prompts.json`](theme-prompts.json). The section
[The prompts](#the-prompts) is generated from that file by
`scripts/audio/theme-prompts.ts`, and a unit test fails when the two differ.

## Quick path

1. Read [Shared direction](#shared-direction) once.
2. Check the service's current fields
   ([What to check first](#what-to-check-in-the-service-first)).
3. For one faction, copy its blocks from [The prompts](#the-prompts) into
   the service ([Suno](#suno), [ElevenLabs Music](#elevenlabs-music)).
4. Generate several takes and judge each against the
   [acceptance checklist](#acceptance-checklist).
5. Trim the chosen take into a loop ([Making a seamless loop](#making-a-seamless-loop)).
6. Fill in a [record](#reproducibility-and-records).
7. Encode and register the file ([Registering an accepted theme](#registering-an-accepted-theme)).

Do the first two factions one after the other and compare them before
generating the rest: the first accepted theme sets the level, the room and
the ensemble size the others are judged against.

## Shared direction

### Tone

Bright, adventurous and a little tongue-in-cheek: pulp adventure played by
toys. The [art direction](../art/ART_DIRECTION.md#tone) asks for "charming +
pulpy + silly + adventurous" and rules out dark, gritty and epic-serious;
the music follows it. No theme is grim. The Undead are spooky-fun, a
Halloween picture book; the Martians are ominous and plainly silly; the
Goblins are rowdy, never menacing.

### Instrumental only

No vocals, no lyrics, no spoken words, no choir, no humming, no crowd. A
voice draws attention away from a game the player is reading, and a
generated voice sings invented words. The Dwarf theme therefore has **no
choir**, not even a wordless one: a tuba and a euphonium in unison carry
the weight a men's chorus would.

### Loop-friendly

A theme repeats until it is stopped, so it must be able to cut from its
last bar to its first:

- one steady tempo from start to end, no slowing at the end;
- the melody starts within the first two seconds: a pickup of one bar at
  most, no ambient intro;
- no fade-out and no big final chord. The last bar is an open turnaround
  that leads back to bar one.

### Length and structure

About 100 seconds; 90 to 120 is accepted. Three parts:

| Part       | Share     | What it does                                             |
| ---------- | --------- | -------------------------------------------------------- |
| A          | about 40% | The theme: the tune a player will know the faction by    |
| B          | about 25% | A contrast: thinner, quieter, different lead, same tempo |
| A again    | about 35% | The theme returns, a little fuller                       |
| Turnaround | one bar   | Leads back to A; this is where the loop is cut           |

In every theme the B section tells a small story about the faction (the
graveyard falls asleep, the egg waits, the sugar crashes) and something
audible brings A back. That gives a player who hears the loop many times
something to wait for.

The [comparison table](#comparison-table) suggests a loop length for each
theme as a whole number of eight-bar phrases.

### Tempo and mix

- **Tempo.** Each faction has a target tempo and an accepted range of a few
  beats per minute around it. The set spans 66 to 156 BPM, and no two
  themes in the same metre are closer than 10 BPM (a test enforces it).
- **Ensemble.** Small: five to eight instruments that can each be heard. No
  wall of orchestra, no thick pads.
- **Room.** Close and fairly dry. A long reverb tail makes the loop point
  audible.
- **Level of the delivered file.** About -16 LUFS integrated, all themes
  within 1 LU of each other, true peak at or below -1 dBTP. Services tend to
  deliver much louder, heavily limited masters: turn those down; do not
  limit them again. The game's music group plays at half level under the
  effects ([mixer rules](../ui/SOUND.md#mixer-rules)), so the file itself
  should be healthy, not quiet.
- **Under the effects.** The game's sound effects are short and are held
  below a brightness bound ([the bounds](../ui/SOUND.md#bounds-the-test-enforces)),
  and the hits and explosions are low thumps. A theme with a clear melody,
  a light bass and no constant bright wash leaves them room.
- **File.** The masters are delivered as WAV and stay outside the
  repository. `scripts/audio/encode-themes.ts` encodes them as AAC-LC in an
  MP4 file (`.m4a`), 44.1 kHz, stereo, 112 kbit/s: about 1.4 MB for 100
  seconds. AAC is what the effects' clips use and what macOS encodes
  without another tool; the encoder writes how many samples it padded, and
  the browser's decoder takes them off again (checked in Chrome: the
  decoded length is the trimmed master's). The first plan here was Ogg
  Vorbis at 128 to 160 kbit/s; MP3 was ruled out because its padding is
  heard as a gap in a loop.

### What all themes share

These threads make eight themes one soundtrack. The first two are written
into every long prompt.

- **The call.** Every theme opens with a short rising three-note call from
  its lead instrument, landing on a longer note: da-da-DAAH, stepping
  upward. A trumpet plays it for the Humans, a theremin for the Martians, a
  toy piano for the Candy. A generator will not reproduce the same three
  pitches each time, and it does not need to: the shared shape in the first
  seconds is what the ear picks up.
- **The map pulse.** Under every melody one plucked or struck instrument
  keeps a steady, even pattern, "like footsteps across a map": a lute, a
  kalimba, a sequencer, a harp. It is the strategy-map feel: unhurried,
  moving forward, music to think to. None of the themes is battle music.
- **Form.** The same A, B, A and one-bar turnaround, at about the same
  length.
- **Size and room.** The same small ensemble in the same close room, at the
  same level.
- **A wink.** Each theme has one comic sound (a slide whistle, a
  firecracker, a ray-gun zap, a steam whistle), used once or twice.

### What varies by faction

The instrument palette, the tempo, the metre and its feel, the mode or
scale colour, and the mood. Two rules keep the themes apart:

- **One signature instrument each.** A lead instrument belongs to one
  faction: the theremin to the Martians, the music box to the Undead, the
  anvil to the Dwarves. Where two factions are near each other (Humans and
  Dwarves both have brass; Dinosaurs and Ice Folk are both primal) the
  register, the tempo and the metre differ: high brass at 116 against low
  brass at 84; a loud 4/4 stomp against a quiet 6/8 lilt.
- **Exclusions point away from the neighbours.** Each faction's exclude
  tags name what would make it sound like another faction (the Undead
  exclude the theremin; the Ice Folk exclude a brass fanfare).

## How to prompt each service

Both services change their fields, limits and model names often. The
prompts are stored in three forms that describe the same piece, so that
one of them fits whatever the service offers:

- a **Suno Styles-field form**: one line of comma-separated phrases and
  short clauses, at most 1000 characters. It is the primary Suno prompt. It
  is complete as stored and pasted as it is: it says "instrumental, no
  vocals" near its start and carries the tempo, the metre, the mode, the
  instruments and what they do, the A-B-A form with its middle section, the
  opening call, the map pulse, the open ending, the mix and the tone;
- a **short tag form** (a comma-separated list within 200 characters), for
  a tool with a small style field and as a fallback;
- a **long descriptive form** (one self-contained paragraph), for
  ElevenLabs Music. At 1300 to 1500 characters it does not fit Suno's
  field.

The Suno forms come with a separate list of things to exclude and a block
of section tags.

The Styles field takes up to 1000 characters, per the user's check in the
Suno interface on 2026-10-06. Field limits change: verify the limit in the
interface before pasting. The strings are written to 940 to 980 characters
(the two seven-second stingers are shorter: there is less to say), so a
small edit still fits; the check counts code points, as a field does.

If a field is shorter than the budget used here, cut from the **end** of a
string. In the Styles-field form the genre, the instrumental statement, the
tempo, the metre, the mood and the instruments come first and the shared
mix and tone phrases come last; in the short tags the faction's own tags
come first and the shared ones last. If the field is much shorter, use the
short tags.

### What to check in the service first

- The **character limit** of the Styles field and of the exclude field. The
  budget here is 1000 characters for the Styles field (the user's check on
  2026-10-06) and 200 for the short tags and for the exclude field (the
  exclude limit was not checked and 200 is conservative). Every string
  shows its length.
- Whether there is an **instrumental** switch, and whether turning it on
  hides the lyrics field (see [Suno](#suno)).
- Which **model or version** is selected. Write it down: it goes into the
  record.
- The **maximum length** of one generation, and whether a duration can be
  set.
- Your **plan** and what it says today about commercial use and ownership
  of what you generate. Free and paid tiers have differed on this, and
  tracks made on a free tier have not always become usable by upgrading
  later. Read the terms on the day; record the plan and what it said.
- Whether a **seed** or a "reuse this prompt" function exists. If it does,
  record the seed too.

### Suno

Use the custom (advanced) mode, which has separate fields.

| Field in Suno               | What to paste                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Styles                      | The faction's "Suno — Styles field (up to 1000 characters)" block, as it is. Where the field is shorter, the "Suno, short tags" block |
| Instrumental switch         | On                                                                                                                                    |
| Lyrics                      | The faction's "structure tags" block, if the field is available (see below)                                                           |
| Exclude styles              | The faction's "Suno, exclude styles" block                                                                                            |
| Title                       | The theme id, for example `theme.undead`, so that takes are easy to find                                                              |
| Weirdness and style sliders | Leave at their defaults for the first takes; record any change                                                                        |

About the lyrics field. The structure block contains only bracketed tags
(`[Intro: …]`, `[A: …]`, `[B: …]`) and no words outside brackets, so there
is nothing to sing. There are two ways to use it, and which works depends
on the current interface:

- If the lyrics field stays available with the instrumental switch on,
  paste the block there.
- If the switch hides the field, generate first with the switch on and no
  block. If the result ignores the A, B, A form, turn the switch off, paste
  the block (it begins with `[Instrumental]`); the Styles field already
  says "instrumental, no vocals". Reject any take with a voice in it.

The Styles-field string names the form too (A-B-A, what the middle
section does, the open last bar), so the structure block reinforces it
and is not required.

Tags are hints, not commands. Expect some takes to ignore the form, add an
intro or end with a flourish; that is what several takes and the checklist
are for.

Suno has offered tools to extend a take, replace a section and crop. They
help to fix an ending. Record their use as an edit.

### ElevenLabs Music

One natural-language prompt, a duration and an instrumental option.

| Field in ElevenLabs Music | What to paste or set                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| Prompt                    | The faction's "ElevenLabs Music, prompt" block                          |
| Duration                  | The duration in the faction's table (100 seconds; 100000 ms in the API) |
| Instrumental              | On, if there is such an option; the prompt says it as well              |

The long prompt is self-contained: it names the instruments, the form, the
tempo and the length, and says "Instrumental only, no vocals, no lyrics, no
spoken words." There is no separate exclude field to rely on, so the
prompt carries its own "never …" phrases.

If the service offers a section-by-section plan for a composition, the
structure block's sections (A, B, A, turnaround) and the suggested loop
length give the section lengths.

### Rules for every prompt

- **No proper names.** No artist, band, composer, film, show, game or song,
  in any field. Services reject such prompts or imitate badly, and the game
  wants its own sound. Describe instruments, eras, genres and moods:
  "1950s space-age sci-fi", never a film title. The Candy faction began
  from a television cartoon; its prompt describes sweets and toy
  instruments and never names it.
- **No request for a voice** anywhere but the exclude tags, the one
  sentence that forbids it and the Styles-field string's "instrumental, no
  vocals".
- **No imitation phrases** such as "in the style of" or "sounds like".
- **Concrete instruments over adjectives.** "Wheezy reed organ" does more
  than "spooky".
- **State the tempo as a number.**

The unit test `tests/unit/theme-prompts.test.ts` enforces the first three
against word lists kept in `scripts/audio/theme-prompts.ts`, along with
the character budgets. For the Styles-field string it also checks that
"instrumental, no vocals" comes within the first 200 characters, that the
entry's tempo in BPM (and no other) and its metre are stated, that the
rising three-note call is named, that a looping piece says "loopable", and
that the string is one line. The name list catches the obvious names only;
the rule is no names at all.

## The prompts

Everything between the two markers below is generated. To change a prompt,
edit [`theme-prompts.json`](theme-prompts.json) and run
`npm run audio:theme-prompts -- render`
([Changing a prompt](#changing-a-prompt)).

In the data file a faction stores its Styles-field string complete
(`sunoStyleLong`), and only its own short tags and its own paragraph. The
blocks below are the complete texts to paste: the shared fragments are
already joined on to the short tags, the exclude tags and the paragraph.

<!-- theme-prompts:begin (generated by scripts/audio/theme-prompts.ts from theme-prompts.json; do not edit by hand) -->

### Shared fragments

Schema version 2; shared fragments version 1. Budgets: Suno Styles field 1000 characters, Suno short tags 200 characters, Suno exclude 200 characters, long prompt 1800 characters. Length: 100 seconds, accept 90–120. The shared opening: a rising three-note call.

The Styles-field string is stored complete for every entry; nothing below is added to it.

Appended to every faction's Suno short tags:

```text
instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

Put before every faction's Suno exclude tags:

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out
```

Appended to every faction's long prompt:

```text
Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Comparison table

| Faction  | Tempo   | Metre                                 | Lead                                     | Rhythm                                                      | Mood                                      | Suggested loop   |
| -------- | ------- | ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | ---------------- |
| Human    | 116 BPM | 4/4, crisp march                      | trumpet, French horn                     | snare drum, soft timpani, pizzicato bass                    | proud, confident, good-humoured, orderly  | 48 bars, 99.3 s  |
| Undead   | 96 BPM  | 3/4, creaky waltz                     | harpsichord, wheezy reed organ           | bass clarinet, plucked double bass, dry xylophone           | spooky-fun, mock-solemn, creepy-cute, sly | 56 bars, 105 s   |
| Goblin   | 138 BPM | 4/4, swung shuffle, lurching offbeat  | squawking bassoon, bass clarinet         | junk percussion (pots, pans, tin cans, chain), off-key tuba | mischievous, rowdy, scrappy, reckless     | 56 bars, 97.4 s  |
| Dinosaur | 104 BPM | 4/4, half-time stomp on one and three | ocarina, tuba and trombone riff          | big toms, log drums, shakers                                | primal, sunny, goofy, lumbering           | 40 bars, 92.3 s  |
| Martian  | 126 BPM | 4/4, straight mechanical pulse        | theremin, vibraphone                     | analogue synth bass pulse, bongos, brushed cymbal           | campy, ominous, smug, retro-futurist      | 56 bars, 106.7 s |
| Ice Folk | 66 BPM  | 6/8, gentle rocking lilt in two       | celesta, glass harmonica                 | soft frame drum, sleigh bells, cello drone                  | calm, crystalline, spacious, friendly     | 56 bars, 101.8 s |
| Dwarf    | 84 BPM  | 4/4, heavy hammer-and-anvil tread     | tuba and euphonium in unison, concertina | anvil on two and four, bass drum, steam hiss                | sturdy, heavy, cheerful, industrious      | 32 bars, 91.4 s  |
| Candy    | 156 BPM | 2/4, bouncy polka                     | toy piano, glockenspiel                  | ukulele offbeats, round rubbery synth bass, woodblocks      | sugary, giddy, bouncy, silly              | 128 bars, 98.5 s |

### Human (`ORIGINAL`)

A tidy storybook-kingdom march: the town band of a practical realm of settlers, soldiers and builders.

| Field          | Value                                        |
| -------------- | -------------------------------------------- |
| Prompt version | `ORIGINAL@2+s1`                              |
| Theme id       | `theme.human`                                |
| Output file    | `public/assets/audio/themes/theme-human.m4a` |
| Tempo          | 116 BPM, accept 112–120                      |
| Metre          | 4/4, crisp march                             |
| Mode           | major, with a Mixolydian lift at the cadence |
| Lead           | trumpet, French horn                         |
| Rhythm section | snare drum, soft timpani, pizzicato bass     |
| Colour         | recorder, lute                               |
| Mood           | proud, confident, good-humoured, orderly     |
| Duration       | 100 seconds                                  |

**Suno — Styles field (up to 1000 characters)** (940 characters):

```text
Storybook medieval kingdom march, playful strategy game theme, instrumental, no vocals, 116 BPM, crisp 4/4 march, bright major key with a Mixolydian lift at the cadence, proud, confident, good-humoured, orderly, toy-soldier pomp, trumpet and French horn lead open at once with a short rising three-note call then carry a catchy fanfare melody, crisp snare drum, soft timpani, walking pizzicato bass, lute keeps a steady plucked map pulse like footsteps, recorder colour, A-B-A form, B section drops the brass for a gentle recorder and lute duet, then the full town band returns with the fanfare, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a snare turnaround left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (190 characters):

```text
storybook medieval march, bright trumpet and horn fanfare, snare, timpani, recorder, lute, major key, 116 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one-bar snare pickup]
[A: trumpet and horn fanfare theme over a march]
[B: recorder and lute duet, softer, no brass]
[A: full town band, fanfare returns]
[Turnaround: one bar of snare, open ending]
[End]
```

**Suno, exclude styles** (167 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, synthesizer, electric guitar, drum machine, sad, slow
```

**ElevenLabs Music, prompt** (1316 characters):

```text
A bright storybook-kingdom march for a turn-based strategy game: the theme of a practical, well-organised medieval realm of settlers, soldiers and builders, with no magic in it. A trumpet and a French horn open at once with a short rising three-note call and carry a confident, catchy fanfare melody over a crisp snare drum, soft timpani and a walking pizzicato bass. A lute keeps a steady plucked pattern underneath, like footsteps across a map. The middle section drops the brass for a recorder and lute duet, gentle and homely, a village at work, and then the full town band returns with the fanfare. Major key, 4/4 march, steady 116 BPM. Proud but good-humoured, toy-soldier pomp rather than an epic. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Undead (`UNDEAD`)

A spooky-fun graveyard waltz from a Halloween picture book: creaky, mock-solemn and creepy-cute.

| Field          | Value                                             |
| -------------- | ------------------------------------------------- |
| Prompt version | `UNDEAD@2+s1`                                     |
| Theme id       | `theme.undead`                                    |
| Output file    | `public/assets/audio/themes/theme-undead.m4a`     |
| Tempo          | 96 BPM, accept 90–100                             |
| Metre          | 3/4, creaky waltz                                 |
| Mode           | harmonic minor, played with a wink                |
| Lead           | harpsichord, wheezy reed organ                    |
| Rhythm section | bass clarinet, plucked double bass, dry xylophone |
| Colour         | music box, pizzicato strings                      |
| Mood           | spooky-fun, mock-solemn, creepy-cute, sly         |
| Duration       | 100 seconds                                       |

**Suno — Styles field (up to 1000 characters)** (965 characters):

```text
Spooky-fun graveyard waltz, playful strategy game theme, instrumental, no vocals, 96 BPM, creaky 3/4 waltz, harmonic minor played with a wink, mock-solemn, creepy-cute, sly, harpsichord lead opens at once with a short rising three-note call then plays the tune answered by a wheezy reed organ, bass clarinet and plucked double bass plod the oom-pah-pah, dry xylophone rattles like bones on the offbeats, pizzicato strings keep a steady plucked map pulse like slow footsteps, A-B-A form, B section sinks to a lone music box playing the tune, very quiet, then the instruments creak back in one by one for the full waltz, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a one-bar turnaround left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (197 characters):

```text
spooky-fun creaky waltz, harpsichord, wheezy reed organ, bone xylophone, music box, bass clarinet, minor 3/4, 96 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one bar of oom-pah-pah]
[A: harpsichord waltz theme, xylophone bones]
[B: lone music box plays the theme, very quiet]
[A: instruments creep back one by one, full waltz]
[Turnaround: one bar, open ending]
[End]
```

**Suno, exclude styles** (171 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, theremin, synthesizer, screams, jump scare, funeral dirge
```

**ElevenLabs Music, prompt** (1431 characters):

```text
A spooky-fun graveyard waltz for a turn-based strategy game: a children's Halloween picture book of grinning skeletons and sleepy zombies, creepy-cute and never horror. A harpsichord opens at once with a short rising three-note call and plays a mock-solemn minor-key melody, answered by a wheezy little reed organ. A dry xylophone rattles like bones on the offbeats, a bass clarinet and a plucked double bass plod the oom-pah-pah, and pizzicato strings keep a steady plucked pattern underneath, like slow footsteps across a map. In the middle section everything sinks away to a lone music box playing the tune sweetly, as if the graveyard had gone to sleep, and then the band creaks back up out of the ground, one instrument at a time, for the waltz again. Lilting 3/4, steady 96 BPM, harmonic minor played with a wink. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Goblin (`GOBLIN`)

A rowdy, ramshackle horde shuffle on junk percussion that always sounds about to fall apart and never does.

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Prompt version | `GOBLIN@2+s1`                                               |
| Theme id       | `theme.goblin`                                              |
| Output file    | `public/assets/audio/themes/theme-goblin.m4a`               |
| Tempo          | 138 BPM, accept 132–144                                     |
| Metre          | 4/4, swung shuffle, lurching offbeat                        |
| Mode           | minor with cheeky chromatic slips                           |
| Lead           | squawking bassoon, bass clarinet                            |
| Rhythm section | junk percussion (pots, pans, tin cans, chain), off-key tuba |
| Colour         | detuned banjo, fuse hiss and firecracker pops               |
| Mood           | mischievous, rowdy, scrappy, reckless                       |
| Duration       | 100 seconds                                                 |

**Suno — Styles field (up to 1000 characters)** (966 characters):

```text
Rowdy ramshackle goblin shuffle, playful strategy game theme, instrumental, no vocals, 138 BPM, swung 4/4 shuffle with a lurching offbeat, minor key with chromatic slips, mischievous, scrappy, reckless, funny not menacing, squawking bassoon and bass clarinet lead open at once with a short rising three-note call then trade a cheeky melody, junk percussion of pots, pans, tin cans and chain, off-key tuba on the offbeats, detuned banjo keeps a steady plucked map pulse like small feet, A-B-A form, B section goes sneaky and quiet, tiptoeing pizzicato and a hissing fuse, a firecracker pop brings the whole gang back louder, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a junk drum fill left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (187 characters):

```text
rowdy goblin shuffle, squawking bassoon, bass clarinet, junk percussion, tuba, banjo, swung minor, 138 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one-bar clatter of pots and pans]
[A: bassoon and bass clarinet trade a cheeky minor theme]
[B: sneaky tiptoe, pizzicato and a hissing fuse, quiet]
[Break: firecracker pop]
[A: whole gang piles back in, louder]
[Turnaround: one-bar junk drum fill, open ending]
[End]
```

**Suno, exclude styles** (168 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, polished, lush strings, synth pads, piano ballad, slow
```

**ElevenLabs Music, prompt** (1422 characters):

```text
A rowdy, ramshackle goblin-horde tune for a turn-based strategy game: cheeky, loud and held together with string, always sounding as if it might fall apart and never quite doing so. A squawking bassoon and a bass clarinet open at once with a short rising three-note call, then trade a mischievous minor-key melody full of chromatic slips. Under them clatters a kit of junk percussion, pots, pans, tin cans and a rattling chain, with an off-key tuba honking the offbeats and a detuned banjo keeping a steady plucked pattern, like many small feet across a map. The middle section goes sneaky and quiet, tiptoeing pizzicato and a hissing fuse, and ends in a firecracker pop that throws the whole gang back into the tune. Swung 4/4 shuffle with a lurching offbeat, steady 138 BPM. Funny and unruly, never menacing. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Dinosaur (`DINOSAUR`)

A cheerful lost-world stomp: a sunny ocarina tune over the footsteps of something huge and friendly.

| Field          | Value                                           |
| -------------- | ----------------------------------------------- |
| Prompt version | `DINOSAUR@2+s1`                                 |
| Theme id       | `theme.dinosaur`                                |
| Output file    | `public/assets/audio/themes/theme-dinosaur.m4a` |
| Tempo          | 104 BPM, accept 100–108                         |
| Metre          | 4/4, half-time stomp on one and three           |
| Mode           | major pentatonic                                |
| Lead           | ocarina, tuba and trombone riff                 |
| Rhythm section | big toms, log drums, shakers                    |
| Colour         | kalimba, stone clicks and egg-shell taps        |
| Mood           | primal, sunny, goofy, lumbering                 |
| Duration       | 100 seconds                                     |

**Suno — Styles field (up to 1000 characters)** (961 characters):

```text
Cheerful lost-world primal stomp, playful strategy game theme, instrumental, no vocals, 104 BPM, 4/4 half-time stomp on beats one and three, major pentatonic, primal, sunny, goofy, lumbering, playful not savage, ocarina lead opens at once with a short rising three-note call then pipes a sunny tune answered by a tuba and trombone riff, big toms and log drums pound the stomp, shakers, stone clicks, kalimba keeps a steady plucked map pulse like footsteps, A-B-A form, B section shrinks to kalimba, shaker and soft egg-shell taps, small and quiet, a drum fill cracks the egg and the stomp returns bigger with full low brass, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a tom fill left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (195 characters):

```text
cheerful primal stomp, big toms and log drums, ocarina, tuba and trombone riff, kalimba, major pentatonic, 104 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: two heavy tom stomps]
[A: ocarina theme over stomping toms, low brass answers]
[B: kalimba, shaker and soft egg-shell taps, small and quiet]
[Break: drum fill, the egg cracks]
[A: stomp returns bigger, full low brass]
[Turnaround: one-bar tom fill, open ending]
[End]
```

**Suno, exclude styles** (182 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, synthesizer, electric guitar, aggressive, war drums, jungle ambience
```

**ElevenLabs Music, prompt** (1405 characters):

```text
A cheerful lost-world stomp for a turn-based strategy game: friendly cavemen and their big goofy dinosaurs, a toy box rather than a nature documentary. An ocarina opens at once with a short rising three-note call and pipes a sunny major-pentatonic tune, answered by a lumbering tuba and trombone riff, the sound of something huge and good-natured walking past. Big toms and hollow log drums pound a heavy stomp on beats one and three with shakers and stone clicks, and a kalimba keeps a steady plucked pattern, like footsteps across a map. The middle section shrinks to the kalimba, a shaker and soft egg-shell taps, small and expectant, and then a drum fill cracks it open and the stomp returns bigger than before. 4/4 with a half-time stomp, steady 104 BPM. Primal but playful, never savage. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Martian (`MARTIAN`)

A campy 1950s pulp sci-fi invasion: a wobbling theremin over a strict machine pulse, menace played for laughs.

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Prompt version | `MARTIAN@2+s1`                                                    |
| Theme id       | `theme.martian`                                                   |
| Output file    | `public/assets/audio/themes/theme-martian.m4a`                    |
| Tempo          | 126 BPM, accept 122–130                                           |
| Metre          | 4/4, straight mechanical pulse                                    |
| Mode           | whole-tone and chromatic, eerie                                   |
| Lead           | theremin, vibraphone                                              |
| Rhythm section | analogue synth bass pulse, bongos, brushed cymbal                 |
| Colour         | bleeping sequencer, electric organ drone, ray-gun zaps and sweeps |
| Mood           | campy, ominous, smug, retro-futurist                              |
| Duration       | 100 seconds                                                       |

**Suno — Styles field (up to 1000 characters)** (966 characters):

```text
Campy 1950s space-age sci-fi invasion, retro-futurist, playful strategy game theme, instrumental, no vocals, 126 BPM, straight mechanical 4/4 pulse, eerie whole-tone and chromatic, ominous, smug, menace played for laughs, wobbling theremin lead opens at once with a short rising three-note call then glides through the tune shadowed by vibraphone, analogue synth bass ticks a strict machine pulse, bongos, brushed cymbal, bleeping sequencer keeps a steady map pulse like radar blips, A-B-A form, B section hovers, no drums, electric organ drone, ray-gun zaps and rising sweeps, then the pulse snaps back with the theremin, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is one bar of bleeps left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (198 characters):

```text
campy 1950s space-age sci-fi, wobbly theremin lead, analog synth pulse, vibraphone, bongos, eerie whole-tone, 126 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one bar of sequencer bleeps]
[A: theremin theme over a strict synth pulse, vibraphone shadows]
[B: hovering organ drone, ray-gun zaps, rising sweeps, no drums]
[A: pulse snaps back, theremin returns]
[Turnaround: one bar of bleeps, open ending]
[End]
```

**Suno, exclude styles** (179 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, acoustic guitar, orchestra, techno, EDM drop, dubstep, modern pop
```

**ElevenLabs Music, prompt** (1492 characters):

```text
A campy 1950s pulp sci-fi invasion theme for a turn-based strategy game: smug little big-headed invaders in bubble helmets and toy flying saucers, a tin-toy invasion that is ominous on the surface and plainly silly underneath. A wobbling theremin opens at once with a short rising three-note call and glides through an eerie melody built on whole-tone and chromatic steps, shadowed by a vibraphone. A vintage analogue synthesizer bass ticks out a strict, machine-like pulse with bongos and a brushed cymbal, and a bleeping sequencer keeps a steady pattern, like blips crossing a radar map. The middle section hovers: a droning electric organ chord, ray-gun zaps and rising sweeps, as if something were beaming down, and then the pulse snaps back and the theremin returns. Straight mechanical 4/4, steady 126 BPM. Retro-futurist space-age lounge, with the menace played for laughs. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Ice Folk (`ICE_FOLK`)

A calm, crystalline winter picture book from the high peaks: glassy bells and a far-off mountain horn.

| Field          | Value                                           |
| -------------- | ----------------------------------------------- |
| Prompt version | `ICE_FOLK@2+s1`                                 |
| Theme id       | `theme.ice-folk`                                |
| Output file    | `public/assets/audio/themes/theme-ice-folk.m4a` |
| Tempo          | 66 BPM (dotted quarter beat), accept 60–72      |
| Metre          | 6/8, gentle rocking lilt in two                 |
| Mode           | Dorian, bright and cold                         |
| Lead           | celesta, glass harmonica                        |
| Rhythm section | soft frame drum, sleigh bells, cello drone      |
| Colour         | long wooden mountain horn, harp, icy bells      |
| Mood           | calm, crystalline, spacious, friendly           |
| Duration       | 100 seconds                                     |

**Suno — Styles field (up to 1000 characters)** (968 characters):

```text
Calm crystalline winter mountain tune, playful strategy game theme, instrumental, no vocals, 66 BPM on the dotted quarter, gently rocking 6/8 lilt in two, bright cold Dorian mode, spacious, friendly, peaceful not bleak, celesta lead opens at once with a short rising three-note call then plays a slow clear melody doubled by glass harmonica, distant long wooden mountain horn answers low, soft frame drum heartbeat, sleigh bells, cello drone, harp keeps a steady plucked map pulse like footsteps in snow, A-B-A form, B section thins to bowed glass and single icy bells, no drum, hushed, then the celesta returns with the horn, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is one bar of harp left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (199 characters):

```text
calm crystalline winter tune, celesta, glass harmonica, distant alphorn, soft frame drum, sleigh bells, harp, slow 6/8, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one bar of frame drum and sleigh bells]
[A: celesta theme, glass harmonica shimmer, distant horn answers]
[B: bowed glass and single icy bells, no drum, hushed]
[A: celesta theme returns with the horn]
[Turnaround: one bar of harp, open ending]
[End]
```

**Suno, exclude styles** (179 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, drum kit, brass fanfare, synth bass, fast, Christmas carol, bleak
```

**ElevenLabs Music, prompt** (1506 characters):

```text
A calm, crystalline mountain theme for a turn-based strategy game: yetis, ice-age hunters and a woolly mammoth from the high peaks, friendly and unhurried, a winter picture book. A celesta opens at once with a short rising three-note call and plays a slow, clear melody, doubled by the glassy shimmer of a glass harmonica. Far off, a long wooden mountain horn answers with low calls, like a mammoth across a valley. A soft frame drum beats like a slow heartbeat, sleigh bells mark the lilt, a cello holds a low drone, and a harp keeps a steady plucked pattern, like footsteps in fresh snow across a map. The middle section thins to bowed glass and single icy bell notes, a hush under falling snow, and then the celesta tune returns with the horn. Gently rocking 6/8 counted in two, steady 66 BPM, bright and cold Dorian colour. Spacious and peaceful, the quietest theme of the set, never bleak. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Dwarf (`DWARF`)

A sturdy steam-and-forge work tune: low brass in unison, an anvil on the backbeat and ticking clockwork.

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Prompt version | `DWARF@2+s1`                                                      |
| Theme id       | `theme.dwarf`                                                     |
| Output file    | `public/assets/audio/themes/theme-dwarf.m4a`                      |
| Tempo          | 84 BPM, accept 80–88                                              |
| Metre          | 4/4, heavy hammer-and-anvil tread                                 |
| Mode           | major, sturdy, with a flat seventh                                |
| Lead           | tuba and euphonium in unison, concertina                          |
| Rhythm section | anvil on two and four, bass drum, steam hiss                      |
| Colour         | ticking clockwork and ratchet, steam whistle, tremolo double bass |
| Mood           | sturdy, heavy, cheerful, industrious                              |
| Duration       | 100 seconds                                                       |

**Suno — Styles field (up to 1000 characters)** (976 characters):

```text
Sturdy steampunk forge work tune, playful strategy game theme, instrumental, no vocals, 84 BPM, heavy 4/4 hammer-and-anvil tread, major key with a flat seventh, cheerful, industrious, toy-like, tuba and euphonium lead in unison open at once with a short rising three-note call then carry a broad melody, concertina fills, anvil on beats two and four, bass drum on one and three, steam hiss as the hi-hat, ticking clockwork and ratchet keep a steady map pulse like turning gears, A-B-A form, B section goes underground with muffled low brass, tremolo double bass rumble and ticking alone, a steam whistle brings the full workshop back, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is anvil and steam left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (192 characters):

```text
sturdy steampunk work tune, tuba and euphonium, concertina, anvil, ticking clockwork, steam hiss, heavy, 84 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one bar of ticking clockwork and an anvil hit]
[A: tuba and euphonium theme, anvil backbeat, concertina fills]
[B: underground, muffled low brass, drilling rumble, ticking only]
[Break: steam whistle]
[A: full workshop returns]
[Turnaround: one bar of anvil and steam, open ending]
[End]
```

**Suno, exclude styles** (186 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, male choir, drinking chant, bagpipes, electric guitar, synthesizer, fast
```

**ElevenLabs Music, prompt** (1524 characters):

```text
A sturdy steam-and-forge work tune for a turn-based strategy game: short, broad, big-bearded engineers in goggles and leather aprons, soot-black iron machines with copper boilers puffing white steam, and wind-up clockwork constructs; heavy, slow, cheerful and toy-like. A tuba and a euphonium open at once with a short rising three-note call and carry a broad, rolling major-key melody in unison, with a concertina filling the gaps. An anvil rings on beats two and four, a bass drum thuds on one and three, steam hisses where a hi-hat would be, and ticking clockwork with a ratchet keeps a steady pattern, like gears turning under a map. The middle section goes underground: muffled low brass, a drilling rumble of tremolo double bass and the ticking alone, and then a steam whistle blows and the full workshop bursts back up. Heavy 4/4, steady 84 BPM, the weightiest theme of the set. Built to last, never grim. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Candy (`CANDY`)

A sugary, bouncy polka on toy instruments with a warm chocolate-rich bass, a giddy rush and a woozy crash.

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Prompt version | `CANDY@2+s1`                                           |
| Theme id       | `theme.candy`                                          |
| Output file    | `public/assets/audio/themes/theme-candy.m4a`           |
| Tempo          | 156 BPM, accept 150–162                                |
| Metre          | 2/4, bouncy polka                                      |
| Mode           | bright major                                           |
| Lead           | toy piano, glockenspiel                                |
| Rhythm section | ukulele offbeats, round rubbery synth bass, woodblocks |
| Colour         | kazoo, slide whistle, marimba                          |
| Mood           | sugary, giddy, bouncy, silly                           |
| Duration       | 100 seconds                                            |

**Suno — Styles field (up to 1000 characters)** (963 characters):

```text
Sugary toy-instrument polka, playful strategy game theme, instrumental, no vocals, 156 BPM, bouncy 2/4 polka, bright major key, giddy, silly, fizzy, toy piano and glockenspiel lead open at once with a short rising three-note call then skip through the melody, kazoo and slide whistle butt in, ukulele strums the offbeats, round rubbery synth bass, warm chocolate-rich low end, popping woodblocks, light brushed snare, marimba keeps a steady map pulse like hopping, A-B-A form, B section is the sugar crash, same tempo in a woozy half-time feel, drooping slide whistle, a pop and the full bounce fizzes back with kazoo, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a glockenspiel run left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (197 characters):

```text
sugary bouncy polka, toy piano, glockenspiel, ukulele, kazoo, slide whistle, round synth bass, bright major, 156 bpm, instrumental, playful strategy game theme, clear melody, steady tempo, loopable
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one bar of woodblock pops]
[A: toy piano and glockenspiel theme, bouncing bass, ukulele]
[B: sugar crash, woozy half-time feel, drooping slide whistle]
[Break: pop]
[A: full bounce returns, kazoo joins]
[Turnaround: one-bar glockenspiel run, open ending]
[End]
```

**Suno, exclude styles** (176 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, sad, slow, distorted, hyperpop, trap beat, orchestral, lullaby
```

**ElevenLabs Music, prompt** (1492 characters):

```text
A sugary, bouncy polka for a turn-based strategy game: a kingdom of living sweets, gumdrops, marshmallows and a chocolate bunny, the silliest army on the map, glossy, round and cheerful. A toy piano and a glockenspiel open at once with a short rising three-note call and skip through a bright major-key melody, with a kazoo and a slide whistle butting in for comic effect. A ukulele strums the offbeats, a round, rubbery synth bass bounces underneath with a warm, chocolate-rich low end, a light brushed snare and popping woodblocks keep time, and a marimba keeps a steady pattern, like hopping across a map. The middle section is the sugar crash: the same tempo in a woozy half-time feel, the slide whistle drooping and the toy piano yawning, and then a pop and the rush comes fizzing back at full bounce. Bouncy 2/4, steady 156 BPM. Sweet, fizzy and giddy, never slow or syrupy. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Small ensemble, clear melody, close and fairly dry, with headroom: light, uncluttered background music that sits under sound effects. Bright, adventurous, slightly tongue-in-cheek pulp tone, never dark or grim.
```

### Extras: title theme and stingers

These are proposals, not part of the faction set: see [Optional extras](#optional-extras-a-proposal). Their strings are complete as stored; the shared fragments are not added.

#### Title theme (`theme.title`)

Title screen and menus. Not a faction theme: its manifest entry names no faction.

| Field          | Value                                        |
| -------------- | -------------------------------------------- |
| Prompt version | `theme.title@2+s1`                           |
| Output file    | `public/assets/audio/themes/theme-title.m4a` |
| Tempo          | 132 BPM, accept 128–136                      |
| Metre          | 4/4, galloping triplets                      |
| Loops          | yes                                          |
| Duration       | 100 seconds                                  |

**Suno — Styles field (up to 1000 characters)** (940 characters):

```text
Pulp adventure title-screen overture, playful strategy game theme, instrumental, no vocals, 132 BPM, galloping 4/4 with a triplet feel, bright major key, bold, adventurous, a little mischievous, small pit orchestra, trumpets and trombones lead open at once with a short rising three-note call then play a bold swashbuckling melody, xylophone doubles the tune, galloping strings keep a steady map pulse underneath, crisp snare drum, A-B-A form, B section passes the melody to playful woodwinds, xylophone and pizzicato strings, lighter, no brass, then the full orchestra returns with the theme, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is a one-bar turnaround left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (142 characters):

```text
instrumental, pulp adventure overture, small pit orchestra, bold brass melody, galloping strings, xylophone, snare, playful, loopable, 132 bpm
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Intro: one-bar snare roll]
[A: bold brass theme over galloping strings]
[B: playful woodwinds and xylophone, lighter]
[A: full orchestra, theme returns]
[Turnaround: one bar, open ending]
[End]
```

**Suno, exclude styles** (125 characters):

```text
vocals, singing, choir, lyrics, spoken word, dark, grim, horror, epic trailer, heavy metal, long intro, fade out, synthesizer
```

**ElevenLabs Music, prompt** (1103 characters):

```text
A pulp-adventure overture for the title screen of a bright, silly turn-based strategy game in which knights, goblins, skeletons, dinosaurs, invaders from space and living sweets all share one map. A small pit orchestra: trumpets and trombones open at once with a short rising three-note call and play a bold, swashbuckling major-key melody over galloping strings and a crisp snare, with a xylophone doubling the tune. The middle section passes the melody to playful woodwinds and pizzicato strings, lighter and a little mischievous, and then the full orchestra returns. Galloping 4/4 with a triplet feel, steady 132 BPM. Instrumental only, no vocals, no lyrics, no spoken words. About 100 seconds in three parts: the main theme, a contrasting middle section, and the main theme again. The melody starts within the first two seconds and the tempo never changes; there is no long intro, no slowing down and no fade-out, and the last bar is an open turnaround that leads straight back to the first bar so the track can loop. Clear melody, with headroom. Adventurous and tongue-in-cheek, never dark or grim.
```

#### Victory stinger (`match.victory`)

Replaces the synthesised Victory tune (sound id match.victory) by changing that entry's source to a file.

| Field          | Value                            |
| -------------- | -------------------------------- |
| Prompt version | `match.victory@2+s1`             |
| Output file    | `public/audio/match-victory.ogg` |
| Tempo          | 132 BPM, accept 128–136          |
| Metre          | 4/4, fanfare                     |
| Loops          | no                               |
| Duration       | 7 seconds                        |

**Suno — Styles field (up to 1000 characters)** (782 characters):

```text
Short triumphant victory fanfare stinger, playful turn-based strategy game jingle, instrumental, no vocals, 132 BPM, 4/4 fanfare, bright major key, triumphant, good-humoured, toy-soldier pomp, never solemn, about 7 seconds long, trumpets and trombones start immediately with a short rising three-note call, repeat it one step higher over a snare roll with a xylophone doubling the brass, then land on a big happy major chord with a cymbal crash, one single phrase, no intro, no middle section, no second tune, ends on that final chord with a clean full stop and a short natural ring, does not repeat, no fade-out, no crowd noise, small ensemble, close and fairly dry mix with headroom, sits beside game sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (128 characters):

```text
instrumental, short triumphant fanfare stinger, bright brass, snare roll, xylophone, cymbal crash, major key, playful, 7 seconds
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Fanfare: rising brass call, snare roll]
[Final chord: cymbal crash, full stop]
[End]
```

**Suno, exclude styles** (113 characters):

```text
vocals, singing, choir, lyrics, spoken word, cheering crowd, dark, grim, epic trailer, long intro, fade out, loop
```

**ElevenLabs Music, prompt** (525 characters):

```text
A seven-second victory fanfare for a bright, silly turn-based strategy game. Trumpets and trombones play a short rising three-note call, repeat it one step higher over a snare roll with a xylophone doubling, and land on a big, happy major chord with a cymbal crash. It starts immediately, ends on that final chord with a clean full stop and a short natural ring, and does not loop or fade. Instrumental only, no vocals, no lyrics, no spoken words. No crowd noise. Triumphant and good-humoured, toy-soldier pomp, never solemn.
```

#### Defeat stinger (`match.defeat`)

Replaces the synthesised Defeat tune (sound id match.defeat) by changing that entry's source to a file.

| Field          | Value                           |
| -------------- | ------------------------------- |
| Prompt version | `match.defeat@2+s1`             |
| Output file    | `public/audio/match-defeat.ogg` |
| Tempo          | 80 BPM, accept 76–84            |
| Metre          | 4/4, drooping                   |
| Loops          | no                              |
| Duration       | 7 seconds                       |

**Suno — Styles field (up to 1000 characters)** (758 characters):

```text
Short comic defeat stinger, playful turn-based strategy game jingle, instrumental, no vocals, 80 BPM, slow drooping 4/4, ends on a gentle minor chord, rueful, funny, gentle, better luck next time, never tragic or gloomy, about 7 seconds long, muted trumpet starts immediately with a short rising three-note call, loses heart and droops down in a comic wah-wah fall, bassoon answers with a low shrug, soft timpani thud closes it on the gentle minor chord, one single phrase, no intro, no middle section, no second tune, ends with a clean full stop and a short natural ring, does not repeat, no fade-out, small ensemble, close and fairly dry mix with headroom, sits beside game sound effects, bright tongue-in-cheek pulp tone, light-hearted, never dark or grim
```

**Suno, short tags (fallback, up to 200 characters)** (133 characters):

```text
instrumental, short comic defeat stinger, muted trumpet wah-wah falling phrase, bassoon, soft timpani thud, rueful, gentle, 7 seconds
```

**Suno, structure tags for the lyrics field:**

```text
[Instrumental]
[Falling phrase: muted trumpet droops, bassoon answers]
[Final note: soft timpani thud, full stop]
[End]
```

**Suno, exclude styles** (108 characters):

```text
vocals, singing, choir, lyrics, spoken word, tragic, funeral, dark, grim, horror, long intro, fade out, loop
```

**ElevenLabs Music, prompt** (484 characters):

```text
A seven-second defeat sting for a bright, silly turn-based strategy game. A muted trumpet starts the same short rising three-note call, loses heart and droops down in a comic wah-wah fall, a bassoon answers with a low shrug, and a soft timpani thud closes it on a gentle minor chord. It starts immediately, ends with a clean full stop and does not loop or fade. Instrumental only, no vocals, no lyrics, no spoken words. Rueful and funny, better luck next time, never tragic or gloomy.
```

<!-- theme-prompts:end -->

## Acceptance checklist

Judge every take against all of these. A take that fails one is rejected,
however good the rest is.

- [ ] **Instrumental.** No voice of any kind, no crowd, no spoken word, at
      any point. Listen to the whole take.
- [ ] **Recognisable in five seconds.** The lead instrument and the rising
      call are heard at once. Play the first five seconds alone: is it
      this faction?
- [ ] **Distinct.** Played next to each accepted theme, it is never
      mistaken for another. Check the neighbours in the
      [comparison table](#comparison-table) first.
- [ ] **On palette.** The lead and rhythm instruments are the faction's.
      None of the faction's excluded sounds is present.
- [ ] **On tone.** Bright and funny at heart. Not grim, not epic, not sad.
- [ ] **Steady tempo**, inside the faction's accepted range.
- [ ] **Has the form.** A recognisable A, a contrasting B and A again.
- [ ] **Loops cleanly.** After trimming, the join is not heard on the third
      repeat ([Making a seamless loop](#making-a-seamless-loop)).
- [ ] **No artefacts.** No garbled instruments, warbling, clicks, drop-outs
      or a sudden change of key or tempo.
- [ ] **Level.** Within 1 LU of the other accepted themes, not clipped.
- [ ] **Sits under the game.** Play it in the Gallery's Sounds tab and
      press some effects over it: the effects stay clear.
- [ ] **Bearable on repeat.** Listen to five loops in a row while doing
      something else. A theme that grates by the third is rejected.

Generate at least four takes before choosing, and stop at about twelve: if
none passes by then, the prompt is the problem. Change it and bump its
version.

## Making a seamless loop

A generated take is almost never a loop as delivered. The work is to cut
from one downbeat to a later one.

1. **Find the tempo.** Tap it, or use an editor's beat detection. If it
   drifts, reject the take.
2. **Choose the loop start:** the downbeat where A begins, after any
   pickup. Keep the pickup out of the loop.
3. **Choose the loop end:** the downbeat at the end of the turnaround, a
   whole number of bars later, ideally a whole number of eight-bar phrases.
   A bar lasts `beats per bar × 60 ÷ BPM` seconds; the
   [comparison table](#comparison-table) gives a suggested count of bars.
   If the take ends with a flourish, cut before it, at the end of the last
   full A phrase.
4. **Cut at zero crossings**, or put a fade of 5 to 10 ms on both ends, so
   that the join does not click.
5. **Carry the tail over.** Notes ringing at the cut point are missing at
   the start of the loop, which makes the join audible. Take the half
   second or so that follows the end cut and mix it over the first half
   second of the loop. Skip this if the take is dry enough.
6. **Listen to the join.** Loop the last four bars into the first four,
   three times, on headphones. Then listen to the whole loop three times.
7. **Set the level** to the target and export as WAV.
8. **Check it in the game.** Encode it
   ([Registering an accepted theme](#registering-an-accepted-theme)), open
   the Gallery's Sounds tab and let the theme play through its join in each
   browser that matters.

A master that was not made into a loop by hand still loops in the game:
the encoder cuts the silence from both ends and measures how long the last
note takes to die away, and the player starts the next pass that long
before the end, under the dying note
([Theme music](../ui/SOUND.md#theme-music)). That is how the nine themes
of 2026-10-07 loop; none of them was edited. It avoids a gap and a click.
It does not put the join on a bar line: whether a join sounds musical is
for a listener to say, and `THEME_MASTERS_V1` in the encoder takes an
`overlapSeconds` per theme to set it by ear.

Any audio editor that shows a waveform and can snap to zero crossings will
do. Write every step you took into the record: the loop points in seconds,
the tail overlap, the gain change.

## Reproducibility and records

Generation is not deterministic: the same prompt gives a different track
each time, and the models are replaced without notice. A theme cannot be
regenerated. What can be reproduced is the **decision**: the inputs, what
was chosen and why, and what was done to it. With that record a theme can
be remade in the same family when a service or a model is gone, and a new
faction's theme can be made the way the first eight were.

Keep one record for each accepted theme, in the
[Records](#records) section below, newest last. Keep the chosen take's
unedited download somewhere safe outside the repository, with the same
name as the output file plus `-raw`; the repository holds only the final
loop.

| Field                 | What to write                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Theme id              | For example `theme.undead`                                                                                            |
| Output file           | For example `public/audio/theme-undead.ogg`                                                                           |
| Date                  | The day it was generated                                                                                              |
| Service               | Suno or ElevenLabs Music                                                                                              |
| Model or version      | Exactly as the interface shows it                                                                                     |
| Prompt version        | The id in the faction's table, for example `UNDEAD@2+s1`, and the Git commit of `theme-prompts.json` it was read from |
| Fields used           | Which blocks went into which fields, every switch and slider that was not at its default, the duration set, any seed  |
| Changes to the prompt | Any word that differs from the stored text. Better: change the data file, bump the version, and write "none" here     |
| Takes generated       | How many                                                                                                              |
| Take chosen           | Which one (the service's own id or link for it), and why it and not the others                                        |
| Edits                 | Extend, replace or crop in the service; loop start and end in seconds; tail overlap; fades; gain change in dB         |
| Final loudness        | Integrated LUFS and true peak of the exported file                                                                    |
| Length                | Seconds and bars                                                                                                      |
| Plan and licence      | The plan the account was on that day, and what its terms said about commercial use and ownership; a link to the terms |
| Checklist             | "All passed", or what was accepted with a known flaw                                                                  |
| Raw take kept at      | Where the unedited download is                                                                                        |

### Record template

Copy this block under [Records](#records) and fill it in.

```markdown
### theme.<name>, <YYYY-MM-DD>

| Field                 | Value |
| --------------------- | ----- |
| Theme id              |       |
| Output file           |       |
| Date                  |       |
| Service               |       |
| Model or version      |       |
| Prompt version        |       |
| Fields used           |       |
| Changes to the prompt |       |
| Takes generated       |       |
| Take chosen           |       |
| Edits                 |       |
| Final loudness        |       |
| Length                |       |
| Plan and licence      |       |
| Checklist             |       |
| Raw take kept at      |       |
```

When a theme is replaced, add a new record and leave the old one, marked
"replaced on <date>".

### Changing a prompt

1. Edit the entry in [`theme-prompts.json`](theme-prompts.json). The three
   forms describe one piece: a change to an instrument, the tempo, the
   metre or the middle section goes into `sunoStyleLong`, the short tags,
   the structure block and the paragraph together.
2. Add 1 to that entry's `promptVersion`. If a shared fragment changed
   (`shared.sunoCommonStyle`, `shared.sunoCommonExclude`,
   `shared.instrumentalSentence`, `shared.longPromptTail`), add 1 to
   `shared.version` instead: it changes every faction's prompt.
3. Run `npm run audio:theme-prompts -- render`, then
   `npm run audio:theme-prompts -- check` and
   `npm test -- tests/unit/theme-prompts.test.ts`.
4. Commit the data file and this document together.

A record cites the version it was made from (`UNDEAD@2+s1`: entry version
2, shared version 1), and Git has the text of every version. Themes
accepted under an older version stay valid; they are not regenerated
because a prompt changed.

Versions so far:

| Version                           | Date       | What changed                                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry version 1, schema version 1 | 2026-10-06 | The first prompts (`pulp_wars-2yc.21`).                                                                                                                                                                                                                                                 |
| Entry version 2, schema version 2 | 2026-10-06 | Adds the 1000-character Suno Styles-field form (`sunoStyleLong`, budget `sunoStyleLongChars`) to all eight factions and the three extras (`pulp_wars-2yc.23`). It changes no musical decision: the short tags, structure blocks, exclude tags and paragraphs are word for word as in 1. |

The shared fragments are still version 1: none of them changed.

## Adding a future faction

A new faction gets a theme in the same family by following these steps.
The unit test fails as soon as a faction exists in the game without a
prompt entry, so the work cannot be forgotten.

1. **Answer five questions about the faction**, from its
   [faction document](../art/factions/README.md) and its rules, not from
   its name:
   - What is it, in one sentence, and what is funny about it?
   - What era or place does it come from? That suggests instruments.
   - What are its materials (bone, brass, sugar, ice)? What do they sound
     like when struck, blown or plucked?
   - How does it play: fast or slow, many or few, sudden or steady? That
     suggests the tempo and the metre.
   - What is its signature mechanic? That becomes the story of the B
     section and the one comic sound.
2. **Choose the palette:** one or two lead instruments that no other
   faction leads with, a rhythm section of two or three, two or three
   colours, one plucked or struck instrument for the map pulse, and one
   comic sound.
3. **Choose tempo, metre and mode** by finding a gap in the
   [comparison table](#comparison-table). Two themes in one metre must be
   at least 10 BPM apart. The free places today: 3/4, 6/8 and 2/4 each
   have one theme; 4/4 has five (84, 104, 116, 126 and 138 BPM), so a new
   4/4 theme fits at 74 or slower, at 94, or at 148 or faster; 5/4, 7/8
   and 12/8 are unused.
4. **Fill the template** below.
5. **Check distinctness on paper.** Add the faction as a row to this table
   beside its two nearest neighbours and make sure at least three columns
   differ clearly from each:

   | Faction   | Tempo | Metre | Lead | Rhythm | Mode | Comic sound |
   | --------- | ----- | ----- | ---- | ------ | ---- | ----------- |
   | New       |       |       |      |        |      |             |
   | Neighbour |       |       |      |        |      |             |
   | Neighbour |       |       |      |        |      |             |

   Then add to the new faction's exclude tags whatever would make it sound
   like those neighbours, and consider adding the new faction's lead
   instrument to theirs (a change to their prompts: bump their versions).

6. **Add the entry** to [`theme-prompts.json`](theme-prompts.json), keyed
   by the game's faction id, with `promptVersion` 1 and all three forms. Add the obvious
   artist and franchise names for the faction's genre to
   `THEME_NAME_DENYLIST_V1` in `scripts/audio/theme-prompts.ts`.
7. **Render and check:** `npm run audio:theme-prompts -- render`, then the
   check and the test, as in [Changing a prompt](#changing-a-prompt).
8. **Generate, choose, loop and record**, as for the first eight. Compare
   the takes with the accepted themes, not only with the prompt.
9. **Register** the file ([below](#registering-an-accepted-theme)).

### Prompt template

The Styles-field string, complete as stored (one line, at most 1000
characters, aim for 850 to 980; the check reports what is missing):

```text
<genre or scene in three to six words>, playful strategy game theme, instrumental, no vocals, <tempo> BPM, <feel> <metre>, <mode or key colour>, <three or four mood words>, <lead instruments> lead open at once with a short rising three-note call then <how the melody goes>, <rhythm instrument and what it plays>, <rhythm instrument>, <plucked or struck instrument> keeps a steady map pulse like <footsteps or the faction's own image>, A-B-A form, B section <what drops out and what is left>, <the comic sound or event> and <the theme returns>, steady tempo, melody starts within two seconds, no long intro, no fade-out, last bar is <the turnaround sound> left open to loop straight back to bar one, loopable, about 100 seconds, small ensemble, close and fairly dry mix with headroom, light background music under sound effects, bright adventurous tongue-in-cheek pulp tone, never dark or grim
```

The faction's own short tags, to which the shared ones are added (keep the
joined string within the budget; the check reports the length):

```text
<genre or scene in two to four words>, <lead instrument and how it plays>, <second lead>, <rhythm instrument>, <rhythm instrument>, <colour instrument>, <mode or key colour>, <tempo> bpm
```

The structure block:

```text
[Instrumental]
[Intro: one bar of <the rhythm's signature sound>]
[A: <lead> theme over <rhythm>]
[B: <what drops out, what is left, how loud>]
[Break: <the comic sound>]
[A: <who returns, fuller>]
[Turnaround: one bar of <sound>, open ending]
[End]
```

The faction's own exclude tags, pointing away from its neighbours:

```text
<another faction's signature instrument>, <a wrong genre>, <a wrong mood>, <a wrong tempo word>
```

The faction's own paragraph, to which the shared ending is added:

```text
A <mood> <kind of piece> for a turn-based strategy game: <who the faction is, in the words of its art direction>, <what it is not>. A <lead instrument> opens at once with a short rising three-note call and <how the melody goes, in which mode>, <answered or doubled by the second lead>. <The rhythm section, instrument by instrument, with the beats they play>, and a <plucked or struck instrument> keeps a steady pattern, like <footsteps or the faction's own image> across a map. The middle section <the faction's story: what drops out and what is left>, and then <the comic sound or event> and <the theme returns>. <Metre and feel>, steady <tempo> BPM. <Two mood words>, never <the wrong mood>.
```

## Where themes play

**Decided and built** (the user, 2026-10-07: "wire them up"; bead
`pulp_wars-2yc.27`). The recommendation below is what the game does; the
table is kept as the reasoning. The exact behaviour is in
[Where the themes play](../ui/SOUND.md#where-the-themes-play).

| Option                                | For                                                         | Against                                                                                             |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Gallery only (today)                  | No further work; no risk of annoyance                       | Most players never hear the themes                                                                  |
| Faction select: preview on choosing   | The theme introduces the faction where the player decides   | A few seconds are heard, rarely the whole loop                                                      |
| The player's own faction, whole match | One loop per match; the faction feels like the player's own | 100 seconds repeat many times in a long match                                                       |
| Whoever's turn it is                  | Each faction is heard                                       | AI turns last seconds, so the music would chop; one voice plays at a time, so every switch restarts |
| Title screen                          | First impression                                            | No faction is chosen yet; needs a ninth piece (see the extras)                                      |

**What was built.**

1. **Faction select:** on New game, the theme of the faction the player
   chooses as their own plays from its start and loops while the screen
   is open. This is where "recognisable in five seconds" pays off. Until
   the player chooses, the title theme plays on.
2. **In a match:** the viewer's own faction theme loops for the whole
   match, including other players' turns. In a hot-seat game it changes at
   the hand-over between human players, never for an AI turn.
3. **Title and menus:** the title theme.
4. **Gallery:** the title theme, like the other menus; its Sounds tab is
   silent of itself, and a theme row there plays that theme.

The three things that had to be settled with it:

- **A music control.** Settings, the match menu and the Gallery's Sounds
  tab have two levels, **Music** and **Sound**, each with its own on/off.
- **Loading.** A theme is fetched and decoded when it is first played, and
  only the one that plays is held: about 38 MB, and twice that for the
  second a crossfade lasts, instead of 340 MB for nine.
- **The end of a match.** The theme plays on through the match-end screen
  (the user, 2026-10-07); the victory or defeat tune plays over it.

## Optional extras (a proposal)

**Also a proposal.** These three pieces are not faction themes and nothing
requires them. Their prompts are stored and checked with the others so
that they can be made in the same session and in the same family:
[Extras: title theme and stingers](#extras-title-theme-and-stingers).

- **Title theme** (`theme.title`). A pulp-adventure overture for a small
  pit orchestra that opens with the same rising call. **Made and in the
  game** (2026-10-07): it belongs to no faction, so its manifest entry has
  no faction and the name "Title".
- **Victory stinger** and **defeat stinger** (`match.victory`,
  `match.defeat`). Seven seconds each, not loops, ending on a full stop.
  The victory states the call and lifts it; the defeat starts the same
  call and lets it droop. They would replace the two synthesised tunes by
  changing each entry's source to a file
  ([Swapping in a stock file](../ui/SOUND.md#swapping-in-a-stock-file)).
  The synthesised tunes are under two seconds, so how a seven-second
  recording fits the end of a match needs a look when they are wired in.

The checklist applies to them except for the loop and form items. A
stinger starts at once, ends cleanly and has no silence at its start.

## Registering an accepted theme

1. Keep the master (WAV) in a folder outside the repository. Git refuses a
   WAV, and a test fails on one.
2. In `scripts/audio/encode-themes.ts`, give the theme a line in
   `THEME_MASTERS_V1`: its id, its faction (null for a theme of none), the
   master's file name and the prompt version it was made from.
3. Run `npx tsx scripts/audio/encode-themes.ts <folder of the masters>`.
   It needs macOS. It writes the theme's `.m4a` under
   `public/assets/audio/themes/` and its measurements to
   `src/audio/theme-music.json`.
4. Run `npx tsx scripts/audio/theme-records.ts render` and fill in the cells of
   the new record that only you know.
5. Nothing else changes: `SOUND_THEMES_V1` is read from that file, the
   game plays the theme for its faction and the Gallery's row plays it
   ([Theme music](../ui/SOUND.md#theme-music)).

The build needs neither the masters nor the script: the encoded files and
the manifest are checked in. A tenth theme needs the size budget of
`tests/unit/stock-sounds-assets.test.ts` raised on purpose.

## Records

The table and the records between the markers are generated
(`npx tsx scripts/audio/theme-records.ts render`); what the author writes into a
cell marked "To be filled by the author" is kept when they are generated
again.

<!-- theme-records:begin (generated by scripts/audio/theme-records.ts from src/audio/theme-music.json; the cells marked for the author are kept) -->

9 themes, Suno, 2026-10-07; 12.6 MB together. The masters were measured and encoded by `scripts/audio/encode-themes.ts`; every number below is from `src/audio/theme-music.json`, which that script writes.

**Still to be filled in by the author**, in every record: the model or version exactly as Suno showed it, which blocks went into which fields, any change to the prompt, the number of takes, and the plan with its terms. The plan's terms on the day a track was generated decide whether it may be used commercially; until that cell is filled in, that is not established.

| Theme            | Master                  | Length   | Cut from start / end | Loudness    | Peak       | Gain  | Ends at    | Loop overlap | Size    |
| ---------------- | ----------------------- | -------- | -------------------- | ----------- | ---------- | ----- | ---------- | ------------ | ------- |
| `theme.human`    | `humans.wav`            | 97.625 s | 0.115 s / 1.58 s     | −16.74 LUFS | −4.91 dBFS | 1.089 | −61.1 dBFS | 2.13 s       | 1.39 MB |
| `theme.undead`   | `undead.wav`            | 99.085 s | 0.155 s / 0.72 s     | −16.64 LUFS | −4.86 dBFS | 1.077 | −59.3 dBFS | 2.09 s       | 1.41 MB |
| `theme.goblin`   | `goblins 4.wav`         | 98.76 s  | 0 s / 0 s            | −14.91 LUFS | −2.45 dBFS | 0.882 | −47.0 dBFS | 2.01 s       | 1.40 MB |
| `theme.dinosaur` | `dino cavemen.wav`      | 99.6 s   | 0 s / 0 s            | −15.37 LUFS | −3.55 dBFS | 0.93  | −32.8 dBFS | 1.35 s       | 1.42 MB |
| `theme.martian`  | `martians.wav`          | 99.145 s | 0.135 s / 0 s        | −14.85 LUFS | −3.97 dBFS | 0.876 | −54.1 dBFS | 1.65 s       | 1.41 MB |
| `theme.ice-folk` | `ice folk.wav`          | 99.175 s | 0.385 s / 0 s        | −14.96 LUFS | −3.86 dBFS | 0.887 | −62.6 dBFS | 2.17 s       | 1.41 MB |
| `theme.dwarf`    | `steampunk dwarfs.wav`  | 98.495 s | 0.145 s / 0 s        | −16.61 LUFS | −5.46 dBFS | 1.073 | −40.5 dBFS | 1.5 s        | 1.40 MB |
| `theme.candy`    | `candy christmassy.wav` | 98.8 s   | 0 s / 0 s            | −15.61 LUFS | −2.57 dBFS | 0.957 | −58.9 dBFS | 1.55 s       | 1.40 MB |
| `theme.title`    | `pulp wars title 2.wav` | 98.8 s   | 0 s / 0 s            | −15.81 LUFS | −2.52 dBFS | 0.978 | −63.8 dBFS | 2.8 s        | 1.40 MB |

### theme.human, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.human`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Output file           | `public/assets/audio/themes/theme-human.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Prompt version        | `ORIGINAL@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Take chosen           | The author's file `humans.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: 0.115 s cut from the start, 1.58 s of silence cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,388,447 bytes). In the game: played at gain 1.089 (+0.74 dB). Loop: the master ends on a note that dies away (−61.1 dBFS in its last 50 ms), so the next pass starts 2.13 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −16.74 LUFS integrated and a sample peak of −4.91 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                                   |
| Length                | 97.625 s (the master: 99.32 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                                       |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                                      |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `humans.wav`                                                                                                                                                                                                                                                                                                                                                                                                                          |

### theme.undead, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.undead`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Output file           | `public/assets/audio/themes/theme-undead.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Prompt version        | `UNDEAD@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Take chosen           | The author's file `undead.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: 0.155 s cut from the start, 0.72 s of silence cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,408,448 bytes). In the game: played at gain 1.077 (+0.64 dB). Loop: the master ends on a note that dies away (−59.3 dBFS in its last 50 ms), so the next pass starts 2.09 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −16.64 LUFS integrated and a sample peak of −4.86 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                                   |
| Length                | 99.085 s (the master: 99.96 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                                       |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                                      |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `undead.wav`                                                                                                                                                                                                                                                                                                                                                                                                                          |

### theme.goblin, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.goblin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Output file           | `public/assets/audio/themes/theme-goblin.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Prompt version        | `GOBLIN@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Take chosen           | The author's file `goblins 4.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                               |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: nothing cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,403,896 bytes). In the game: played at gain 0.882 (−1.09 dB). Loop: the master ends on a note that dies away (−47.0 dBFS in its last 50 ms), so the next pass starts 2.01 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −14.91 LUFS integrated and a sample peak of −2.45 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                         |
| Length                | 98.76 s (the master: 98.76 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                             |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                            |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `goblins 4.wav`                                                                                                                                                                                                                                                                                                                                                                                                             |

### theme.dinosaur, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.dinosaur`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Output file           | `public/assets/audio/themes/theme-dinosaur.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Prompt version        | `DINOSAUR@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Take chosen           | The author's file `dino cavemen.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                           |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: nothing cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,415,611 bytes). In the game: played at gain 0.93 (−0.63 dB). Loop: the master ends on a note that dies away (−32.8 dBFS in its last 50 ms), so the next pass starts 1.35 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −15.37 LUFS integrated and a sample peak of −3.55 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                        |
| Length                | 99.6 s (the master: 99.6 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                            |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                           |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `dino cavemen.wav`                                                                                                                                                                                                                                                                                                                                                                                                         |

### theme.martian, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.martian`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Output file           | `public/assets/audio/themes/theme-martian.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Prompt version        | `MARTIAN@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Take chosen           | The author's file `martians.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                                |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: 0.135 s cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,409,843 bytes). In the game: played at gain 0.876 (−1.15 dB). Loop: the master ends on a note that dies away (−54.1 dBFS in its last 50 ms), so the next pass starts 1.65 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −14.85 LUFS integrated and a sample peak of −3.97 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                         |
| Length                | 99.145 s (the master: 99.28 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                             |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                            |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `martians.wav`                                                                                                                                                                                                                                                                                                                                                                                                              |

### theme.ice-folk, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.ice-folk`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Output file           | `public/assets/audio/themes/theme-ice-folk.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Prompt version        | `ICE_FOLK@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Take chosen           | The author's file `ice folk.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                                |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: 0.385 s cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,409,748 bytes). In the game: played at gain 0.887 (−1.04 dB). Loop: the master ends on a note that dies away (−62.6 dBFS in its last 50 ms), so the next pass starts 2.17 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −14.96 LUFS integrated and a sample peak of −3.86 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                         |
| Length                | 99.175 s (the master: 99.56 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                             |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                            |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `ice folk.wav`                                                                                                                                                                                                                                                                                                                                                                                                              |

### theme.dwarf, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.dwarf`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Output file           | `public/assets/audio/themes/theme-dwarf.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Prompt version        | `DWARF@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Take chosen           | The author's file `steampunk dwarfs.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                       |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: 0.145 s cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,400,880 bytes). In the game: played at gain 1.073 (+0.61 dB). Loop: the master ends on a note that dies away (−40.5 dBFS in its last 50 ms), so the next pass starts 1.5 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −16.61 LUFS integrated and a sample peak of −5.46 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                        |
| Length                | 98.495 s (the master: 98.64 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                            |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                           |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `steampunk dwarfs.wav`                                                                                                                                                                                                                                                                                                                                                                                                     |

### theme.candy, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.candy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Output file           | `public/assets/audio/themes/theme-candy.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Prompt version        | `CANDY@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Take chosen           | The author's file `candy christmassy.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                       |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: nothing cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,404,546 bytes). In the game: played at gain 0.957 (−0.38 dB). Loop: the master ends on a note that dies away (−58.9 dBFS in its last 50 ms), so the next pass starts 1.55 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −15.61 LUFS integrated and a sample peak of −2.57 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                         |
| Length                | 98.8 s (the master: 98.8 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                             |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                            |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `candy christmassy.wav`                                                                                                                                                                                                                                                                                                                                                                                                     |

### theme.title, 2026-10-07

| Field                 | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme id              | `theme.title`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Output file           | `public/assets/audio/themes/theme-title.m4a`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Date                  | 2026-10-07                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Service               | Suno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Model or version      | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Prompt version        | `theme.title@2+s1`, `theme-prompts.json` at commit `5dae5a51`                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Fields used           | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Changes to the prompt | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Takes generated       | To be filled by the author                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Take chosen           | The author's file `pulp wars title 2.wav`: the author's own choice among the takes                                                                                                                                                                                                                                                                                                                                                                                                      |
| Edits                 | None in the service that is known. By `scripts/audio/encode-themes.ts`: nothing cut from the start, nothing cut from the end; no fade, no level change and no loop edit in the file; encoded AAC-LC stereo 44.1 kHz at 112 kbit/s (1,404,582 bytes). In the game: played at gain 0.978 (−0.19 dB). Loop: the master ends on a note that dies away (−63.8 dBFS in its last 50 ms), so the next pass starts 2.8 s before the end and the ending pass is faded out under it, in the player |
| Final loudness        | −15.81 LUFS integrated and a sample peak of −2.52 dBFS in the file; −16.0 LUFS as played, before the mixer's music level. True peak not measured                                                                                                                                                                                                                                                                                                                                        |
| Length                | 98.8 s (the master: 98.8 s). Bars not counted                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Plan and licence      | To be filled by the author: the plan the account was on that day, and what its terms said about commercial use and ownership                                                                                                                                                                                                                                                                                                                                                            |
| Checklist             | Not recorded by the author. The loop join was set by measurement and has not been listened to                                                                                                                                                                                                                                                                                                                                                                                           |
| Raw take kept at      | The author's `suno_score` folder, outside the repository, as `pulp wars title 2.wav`                                                                                                                                                                                                                                                                                                                                                                                                    |

<!-- theme-records:end -->
