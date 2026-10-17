# Interface Style: Newsstand

Bead `pulp_wars-2yc.35`. The style of every Ruleset 7 screen: the main menu,
setup, campaign, the match HUD and dock, technology, dialogs, Help, the
Gallery, settings and the end of a match. The legacy Ruleset 5 and 6 pages
keep their own look (`src/styles/main.css`).

## The idea

A printed pulp-magazine cover. Cream plates, a black keyline, a hard offset
shadow with no blur, and red and yellow spot colour. The keyline echoes the
dark outline of the chibi sprites, so the interface and the board read as one
print job. Readability comes first: text is ink on cream everywhere.

## Faces

| Use                           | Face        | Weights            | Licence                         | Package                         |
| ----------------------------- | ----------- | ------------------ | ------------------------------- | ------------------------------- |
| Display capitals, 20px and up | Bowlby One  | 400                | SIL Open Font License 1.1 (OFL) | `@fontsource/bowlby-one` 5.3.0  |
| Everything else               | Public Sans | 500, 600, 700, 800 | SIL Open Font License 1.1 (OFL) | `@fontsource/public-sans` 5.3.0 |

Each package states its licence in its `package.json` (`OFL-1.1`) and ships
the licence text in `LICENSE`. `src/main.ts` imports the Latin subset of each
weight; Vite bundles the font files with the game, so they are served from the
game's own origin. Nothing is requested from a font service or a CDN.

- Bowlby One is for capitals at 20px or larger: the logo, the main menu's
  buttons, and the title of a screen or dialog. Smaller headings are Public
  Sans, heavy, in capitals.
- Public Sans is set with tabular lining figures (`font-variant-numeric`), so
  a Coin count does not change width as it ticks.
- No type is smaller than 12px (`--pw-fs-xs`).
- Board labels drawn on the Canvas (city names, counters, prompts) use
  Public Sans with the system face behind it
  (`src/render/canvas/board-label-font-v7.ts`). The start loads the faces
  beside the art, so a label is not drawn in the fallback
  (`src/app/interface-fonts-v7.ts`).

## Tokens

All of them are declared once, on `.v7-app-shell` at the top of
`src/styles/v7.css`. No rule below that block names a colour.

| Group       | Tokens                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Type        | `--pw-display`, `--pw-ui`, `--pw-fw-body/semi/bold/heavy`, `--pw-fs-xs` to `--pw-fs-4xl`                        |
| Ink, paper  | `--pw-ink`, `--pw-surface`, `--pw-surface-2`, `--pw-surface-raised`, `--pw-dock`                                |
| Text        | `--pw-text`, `--pw-text-2`, `--pw-text-inverse`                                                                 |
| Rules       | `--pw-line`, `--pw-line-soft`, `--pw-line-w`, `--pw-line-w-sm`                                                  |
| Tone        | `--pw-tint-1/2/3`, `--pw-shade`, `--pw-scrim`, `--pw-dim`, `--pw-board-bg`                                      |
| Spot colour | `--pw-accent`, `--pw-accent-dark`, `--pw-accent-text`, `--pw-yellow`, `--pw-focus`                              |
| Meaning     | `--pw-coin`, `--pw-gain`, `--pw-loss`                                                                           |
| Hues        | `--pw-red`, `-amber`, `-green`, `-teal`, `-blue`, `-violet`, `-pink`, `-brown`, `-emerald`, each with a `-fill` |
| Board       | `--pw-sky-high/mid/low`, `--pw-marker-landing/after-move/slide/launch`                                          |
| Tech tree   | `--pw-tree-ground`, `--pw-tree-glow`, `--pw-tree-owned`, `--pw-tree-locked`                                     |
| Shape       | `--pw-radius`, `--pw-radius-sm`, `--pw-radius-xs`, `--pw-radius-pill`, `--pw-shadow`, `--pw-shadow-sm`          |

A hue is two tokens: an ink dark enough to be text or a rule on any plate, and
a pale fill for the plate of a status chip. `tests/unit/interface-style-ui-v7.test.ts`
holds every text pairing of the tokens at 4.5:1 or better and fails on a
colour written outside the token block.

`--pw-emerald` is the Cultists' hue (bead `pulp_wars-mch9.17`,
[the Cult's direction](../art/factions/CULT.md)): Favour and the Cult's
chips (the channel's too, bead `pulp_wars-mch9.18`: Candlelit, a daemon's
"2 / 3"; a daemon short of its Control, Unbound and Furious take
`--pw-loss` on `--pw-red-fill`, and so do the chips of a harm done to a
unit, bead `pulp_wars-mch9.19`: Frog, Grabbed, Taunted; a Herald's attacks
are pips with an emerald rim, filled for an attack it has left; the
faction chip "Cultists" of the leaderboard and the score screens, bead
`pulp_wars-mch9.20`). Its ink is close to `--pw-green` and `--pw-teal`, so
it always stands on its own mint fill or is an icon, never text on a plain
plate.

## Recipes

- **Panel** (dock, dialog, overlay, menu, front panel): `--pw-surface`,
  a `--pw-line-w` ink border, `--pw-radius`, `--pw-shadow`.
- **Control** (button, select, tab group, train card): `--pw-surface-raised`,
  a `--pw-line-w-sm` ink border, `--pw-radius-sm`, `--pw-shadow-sm`.
- **Picker** (bead `pulp_wars-2yc.65`, the menus' choices; no native
  dropdown): a list picker is a Control with the value and a small ink
  caret that opens a Panel-like list (`--pw-surface`, a `--pw-line-w`
  border, `--pw-shadow`); the active option is `--pw-yellow` with an ink
  rule, the chosen one ink with `--pw-text-inverse`. A short list is a
  framed row of segments, the chosen one pressed (ink). Every option is at
  least 44 CSS px tall.
- **Primary action** (New game, Play, Research, End turn): `--pw-accent` with
  `--pw-accent-text`, heavy capitals.
- **Selected or hovered**: `--pw-yellow` with ink text. A pressed toggle or
  the open tab is ink with `--pw-text-inverse`.
- **Chip** (a stat, a status): `--pw-surface-raised` with a soft rule; a
  status of a faction or an effect uses that hue's ink on its fill.
  A unit's status chip is a button (bead `pulp_wars-2yc.86`): an ink
  rule on hover, `--pw-yellow` with ink text while its popover is open.
  The popover is a Control-like plate (`--pw-surface-raised`, a
  `--pw-line-w-sm` ink border, `--pw-radius-sm`, `--pw-shadow-sm`): the
  name heavy, the change in `--pw-gain` (`--pw-loss` when it takes
  away), the sum in ink, the sentence in
  `--pw-text-2`. The HP bar of the compact card is `--pw-green` in a
  `--pw-surface-2` well with an ink rule, `--pw-loss` under a third.
- **Unavailable but explained** (a locked technology, a disabled action):
  a plain plate and `--pw-text-2`, or `opacity: var(--pw-dim)`. Never an
  opacity that takes text under 4.5:1. A dock action the player cannot
  pay for (`.is-blocked`, bead `pulp_wars-2yc.36`) is `--pw-surface-2` with
  a soft rule and no shadow, its art greyed, its name `--pw-text-2` and its
  price `--pw-loss` on `--pw-red-fill`.
- **Technology** (the radial tree, bead `pulp_wars-2yc.58`): round badges
  on a night ground (`--pw-tree-ground` with `--pw-tree-glow` at the hub).
  Available is a `--pw-yellow` badge with the art straight on the yellow and
  a yellow halo inside an ink keyline; owned is `--pw-teal-fill` with a
  `--pw-tree-owned` ring; locked is `--pw-surface-2` with the art greyed.
  Names are `--pw-text-inverse` with an ink keyline straight on the ground,
  never on a plate; prices are small chips. Connectors are `--pw-tree-owned`,
  `--pw-yellow` or `--pw-tree-locked` by state.
- **Hint** (the first-steps line, bead `pulp_wars-2yc.39`): `--pw-yellow`
  with ink text, a `--pw-line-w-sm` ink border and `--pw-shadow-sm`. The HUD
  button a hint points at has a `--pw-yellow` outline; the marker on the
  Canvas is the same yellow arrow with an ink keyline and a hard shadow.
- **Over the board**: a dialog or the technology screen sits on `--pw-scrim`.
  The dock is `--pw-dock`, a tone under the panels, so the wide plate under
  the board does not glare.

## Colour of a faction

A faction's colour (`docs/art/FACTION_COLOURS.md`) appears in the interface
only as a swatch, a stripe or a ring: the leaderboard and setup stripe, the
Gallery column rule, an emblem's ring. It is never the colour of text. The
status chips and badges of a faction use the ink and fill of its hue.

## High contrast, scale, narrow screens

High contrast turns the plates white, the ink black and removes the secondary
grey and the soft rules. UI size behaves as it did before this style: it
multiplies the shell's base size, so text that inherits its size grows, and
text set from a size token keeps its size. The narrow-screen layouts are
unchanged.
