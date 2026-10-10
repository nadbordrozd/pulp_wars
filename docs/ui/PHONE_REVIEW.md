# Phone UI review

Bead `pulp_wars-eu3r.9`. Every Ruleset 7 screen and panel was walked at
390 x 844 and 320 x 720 (portrait, DPR 2), and the match scenes also at
844 x 390 (landscape), on hand-built states. No match was played.

## The review command

```text
npx vite --host localhost --port 6173 --strictPort
npm run review:ruleset7-phone-ui -- http://localhost:6173/ --output-dir=<new-dir>
```

`scripts/browser-phone-review-v7.ts` needs the dev server (it imports the
fixtures of `tests/fixtures`) and `CHROME_PATH`; Chrome runs headless and
muted. Options: `--only=<scene,...>`, `--sizes=p390,p320,l844`,
`--report-only` (write the findings, never fail). One size takes about a
quarter of an hour; the three sizes can run side by side.

Each scene is captured as `<scene>-<size>.png` and checked in the page.
The run fails on any of:

| Check                | What it catches                                           |
| -------------------- | --------------------------------------------------------- |
| `page-sideways`      | the page scrolls sideways                                 |
| `panel-sideways`     | a panel scrolls sideways (the Gallery's tables may)       |
| `off-screen`         | text outside the screen                                   |
| `text-clipped`       | text cut by its box (an intended ellipsis is only noted)  |
| `spills-out`         | text, art or a control outside its button or plate        |
| `controls-overlap`   | two buttons on top of each other                          |
| `text-overlap`       | two texts on top of each other                            |
| `text-under-control` | text under a button it is not part of                     |
| `control-covered`    | a button under something else in its own layer            |
| `nested-scroll`      | a list that scrolls inside a dialog that scrolls          |
| `action-hidden`      | the dock's first row of actions below the dock's own edge |

The findings are written to `findings.json` beside the captures.

## Scenes

The main menu; New game (both modes, the tribe picker with its stars and
their rules, eight seats, a seed); the campaign and a briefing; settings;
every Gallery tab, the filters, a unit and a curiosity; the loading screen;
the HUD with the coach line; the match menu; the leaderboard with a score
breakdown; Perfection's round counter; the technology tree and a
technology; Help, settings and achievements in a match; a city with its
training cards and a recruit's details; the unit docks of the seven giants
with their signature buttons, Candy, Ice Folk (Freeze, Frozen, Icebound),
Dwarves, Goblins, Undead, the Vampire and the Banshee (Bat Escape, Feast,
Terror), Martians, Dinosaurs and ships; the unit details of the longest
ability lists; abilities being aimed (Kaboom!, Wail, Freeze, Cold Snap,
Sugar Toss, Assemble, Tunnel, Bomb Run, Goblin Toss, Thunder Stomp); a
mound, a Barricade and every curiosity's tile; the reward choices of level
2 and of the giant; and the end of a match (Domination victory with its
grade, Perfection defeat, a flawless victory, eight players), each with a
breakdown open.

## Findings

Before: `main` at `b99dc9a3`. After: this bead. All three sizes pass the
checks after the fixes.

| Screen                         | Viewport         | Problem                                                                                                               | Fix                                                                                             |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| New game, seats                | 390, 320         | A seat's faction select ran 35 to 70 px out of its card; at 320 with eight seats the page scrolled 33 px sideways     | The label and select wrap under the emblem; at 320 the select is smaller, so "Dinosaur" fits    |
| New game, seed                 | 320              | "Use seed" pushed the seed field out of the panel                                                                     | The toggle fills the row, with its hint and the seed field under it                             |
| Gallery, Curiosities           | 390, 320         | The five-column grid scrolled sideways (354 of 520 px)                                                                | Its cells wrap, two or three a row                                                              |
| Gallery, tabs                  | 390, 320         | The five tabs wrapped raggedly                                                                                        | The tabs fill whole rows                                                                        |
| Gallery, Sounds                | 320              | A recording's file name was cut to a few pixels of height                                                             | The file name sits over its time and badge                                                      |
| HUD, coach line                | 320 (Perfection) | The round counter wraps the HUD to three rows and the coach line was hidden under the Tech, menu and End turn buttons | The line is the HUD's last child and flows under its rows on a phone                            |
| Coach line while aiming        | all              | "Pick a highlighted tile to move" stayed up while an ability was aimed                                                | No cue while an ability, a Kaboom! or a nest is aimed                                           |
| Leaderboard                    | 844 x 390        | The sticky close button covered the viewer's score button                                                             | A scrolling popup keeps a gutter for its close button                                           |
| Technology tree                | 844 x 390        | The tree scrolled sideways (774 of 1250 px)                                                                           | Branches one under another with the branch picker, as on a narrow screen                        |
| Technology detail              | 390, 320         | Its lines ran 49 px out of the plate at 320 and its close slid under the text                                         | The name over the text, both full width; the close stays on top                                 |
| Unit dock, giants              | 320, 844 x 390   | The signature line pushed the action row out of the dock (up to 200 px)                                               | The actions come before the signature line; in landscape they take the last column from the top |
| Unit dock, long names          | 320              | Two stat columns beside "Brontosaurus" or "Shield Projector" made the dock scroll sideways and ran under its close    | One column of stats at 360 px and under, and the dock may take 54% of the height                |
| Unit dock, Martians            | 390              | The Shield stat reached under the dock's close button                                                                 | The stats sit at the bottom of their cell                                                       |
| Unit dock, Engineer            | 390, 320         | The Repair chip "+4 machines, +2 others" ran out of its button and under its neighbours                               | The chip wraps under the label inside the button                                                |
| Unit dock, Vampire             | all              | The status chip read "Escape", not "Bat Escape"                                                                       | The chip and its explanation name the Bat Escape                                                |
| Tile dock, mound and Barricade | 390, 320         | The info box overlapped the tile's name and pushed Road out of view                                                   | The box takes the dock's whole width, after the tile's actions                                  |
| Aiming prompts                 | 844 x 390        | The prompt's `?` was below the dock's edge                                                                            | The prompt takes the last column from the top                                                   |
| Bomb Run                       | all              | About fifteen "Land" labels covered the board                                                                         | Only a threatened landing is labelled, like the Tunnel                                          |
| Unit details ("?")             | 390, 320         | "Confectioner" was cut into syllables beside the close button; at 320 the "10/10" chip covered its neighbour          | The portrait, then the name on its own line; at 320 the chips wrap                              |
| End of match                   | all              | The list of players scrolled inside the dialog, which scrolled too                                                    | One scroll: the dialog                                                                          |
| End of match, rows             | 320              | "You · Human" ran under the score button                                                                              | The emblem and score, then the name on its own line                                             |
| Barricade under attack         | all              | The attack bracket partly covered the Barricade's HP number                                                           | The HP number sits clear of the bracket                                                         |
| Wishing Well, Fountain, Shrine | all              | A unit standing on the curiosity hid it                                                                               | A small copy in the cell's corner, over the unit                                                |

Noted, not changed: an ellipsis on a long sound library name in the
Gallery; the tribe picker's "Dinos..." at 320 (the full name is the card's
label); a dock that scrolls after its first row of actions (a city's
training cards, a Kaboom! confirmation); in landscape the dock's close
button over the zoom-out button while a dock is open.
