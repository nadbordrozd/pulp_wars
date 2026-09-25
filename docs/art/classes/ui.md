# UI Asset and Visual Contract

## Ruleset-7 revision-9 action and status inventory

The approved
[revision-9 contract](../../product/RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md)
adds exactly three PixelLab UI sources, all transparent 192 x 192 action icons
scaled within the current compact icon action tiles. They must not increase the
dock height:

| Exact asset ID                    | Required reading                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ui-action-rally-v7r9`            | one bold command pennant or horn burst; no text, portrait, or baked Inspired state               |
| `ui-action-cultivate-forest-v7r9` | one clear Forest-to-furrow/Fertile transformation, distinct from Clear Forest and Replant Forest |
| `ui-action-blast-mountain-v7r9`   | one playful Mountain-clearing blast, distinct from combat damage and Pillage                     |

After the established representative UI sample has passed, these three form one
bounded coherent action family. Review them at native and enlarged size, in the
compact action row at all supported viewport/zoom/DPR states, on light/dark and
high-contrast panels, in grayscale and color-vision simulations, and beside
every existing terrain action. They contain no text, Coin/population number,
focus, disabled state, or animation frame.

Tend Wounded reuses `ui-action-heal`; Land Grant/Planning reuses
`ui-reward-expand`; Disband, Redevelop, Fortification, and Pillage retain their
subject-matching accepted art. Build/selection/technology for Shipyard and
training/identity/technology for Captain and Knight reuse their accepted world
sources or deterministic portraits as specified by their class contracts.
Supply, Inspired, tended-this-turn, Overrun, Charge, Field Defense destruction,
land/sea trade, and dynamic city/dock discounts are code-native accessible
status, effect, or number treatments and authorize no raster.

## Ruleset-7 revision-10 mobility technology reuse

The current Scouting node recruits Raider, so its art reuses the accepted
`portrait-original-raider` rather than the retired Scout identity. Raiding
unlocks the Charge/Pillage upgrade and reuses the accepted
`ui-action-pillage`, whose broad mallet-and-broken-timber silhouette accurately
communicates the destructive capability at technology-card size. The review
must show both at 64 CSS pixels and in the exact 112 x 130 technology viewport,
on light, dark, and grayscale surfaces. These are explicit art registrations;
live technology-tree mapping belongs to the integration task.

## Current Ruleset 7 simplified interface (2026-09-24)

This section supersedes the compact dock and HUD wording below wherever they
conflict. The direction follows the user's request for a Polytopia-like
interface: few words, visual actions, and explanations only behind an explicit
tap.

- **Board-first chrome.** The HUD floats over the map on a light gradient. At
  left: a coin pill (`stock` plus a green `+income`) and a `Turn N` pill.
  At right: a Tech button, a menu button, and a gold `End turn` button. The menu
  holds Leaderboard, Achievements, Help, Settings, and Save & quit. Zoom
  buttons float at the right edge on wide screens.
- **No permanent status line.** Routine confirmations such as a move go only to
  the screen-reader live region. A short toast appears briefly for notable
  events such as a Treasury grant. Errors stay visible as a toast until the next
  action.
- **Floating selection panel.** The dock is a rounded panel sized to its
  content, centered at the bottom. The selected art is scaled from the existing
  112 x 130 identity viewport. Unit stats are small icon pills (HP, attack,
  defense, move, range, sight) with accessible text labels. City facts are pills
  for level, a population pip meter, units/capacity, and income. Tile facts are
  pills.
- **Icon-first actions.** Each action tile shows art, a short name (for example
  `Farm`, `Harvest`, `Fortify`), and cost/effect chips that use the coin and
  population icons instead of prose.
- **Explanations on demand.** The unit `?` dialog and the training `?` dialog
  show stats as icons plus one short line per notable ability or restriction.
  Tech detail opens as a sheet over the tree with a short unlock list and a
  Research button that shows the cost.
- **Interface glyphs.** Monochrome SVG glyphs in `src/render/dom/ui-icons-v7.ts`
  are interface chrome, not game art. They must never stand in for unit,
  terrain, building, coin, or population artwork, which stays PixelLab-made.

## Current Ruleset 7 compact dock and economy icons

Ruleset 7 uses one full-width bottom dock layout for selected units and cities:
the selected world sprite or city art with a short label at left, compact public
stats next, and one left-aligned, nonwrapping action row in the remaining width.
The dock's desktop height follows its 112 x 130 CSS-pixel selected-art viewport,
label, and modest padding. Context action art is scaled within compact buttons
so it cannot increase dock height. The action row scrolls horizontally inside
the dock at 1024 and 1440 CSS pixels without widening the page. The Canvas host
and camera geometry remain fixed as selection changes. On narrow screens the
action row may move below identity and stats and the dock may scroll vertically.
This current contract supersedes the historical fixed-height desktop dock and
112 x 130 action-art growth contract below for Ruleset 7 only.

Unit modifiers use the same font, size, and weight as their base stat values;
only color distinguishes the signed bonus. A focusable or hovered bonus exposes
a readable horizontal explanation outside the stat line. A small question-mark
control beside the selected unit opens an accessible details dialog for abilities,
tactical explanations, and current status. The dialog retains keyboard focus
management and returns focus to the control when closed. Enemy public-stat
visibility remains authoritative. City stats present signed population progress,
unit capacity, next-turn income, and public state without verbose dock prose.

Current Ruleset 7 currency values pair the new accepted gold coin icon
`ui-hud-gold-coin-v7` with signed numeric amounts in the HUD, commands, research,
rewards, and summaries. The HUD shows stock and the projected next-turn total
as `+N/turn`. Population values pair the existing accepted
`ui-hud-population` icon with signed numeric amounts. Semantic text and units
remain available to assistive technology. The existing `ui-hud-coin` asset stays
available to archived rulesets and historical reviews.

## Ruleset-6 active inventory

Ruleset 6 replaces the Star family with Coin stock/income/spend icons and
requires 25 technology icons for each explicit faction tree registration. An
identical approved icon may be aliased by both trees in the manifest, but every
tree/node key must resolve explicitly. Nine Original and nine Candy role
portraits, the full building/resource inventory, signed/negative population,
Market income, Road connection, 3 x 3/5 x 5 territory, and ordered reward-queue
status are required.

Action/icon inventory adds Harvest Fruit, Hunt Game, eleven Build improvement
actions, Clear/Replant Forest, Build Road, Redevelop, Heal, Charge state, Push,
Breach, Survey, Stockpile, Walls, Militia, Expand, Boom, Juggernaut, and
Treasury. Retained Candy Roll/Wall/Candify icons remain. Catapult, old Star,
Animal/Lumber Mill labels, and the nine v5 technology IDs are not v6 UI assets.

Cluster outlines, contributor spokes, Stoneworks opposite axes, mixed-type and
family chips, capital-Road tracing, territory potential, placement highlights,
signed calculations, projectile/Charge/Heal/Push/Breach effects, and reward
queue counters are code-native SVG/Canvas/HTML. Raster art may supply symbols
and portraits but never baked numbers, formulas, connection states, text,
focus, selection, or inaccessible color-only membership.

Live Windmill, Sawmill, Forge, Stoneworks, Workshop, Grand Works, and Market
levels are also code-native: one compact mint square with a dark outline per
public live population/Market-income value. They use no faction color and no
envelope, remain legible at 0.625x, wrap after eight pips, and must not be
confused with the larger stateful city population squares inside a city badge.

The first v6 UI sample is one 24 px Coin/income icon, one 48 px economic build
icon, and one 64 px technology/role portrait. Then validate a representative
five-branch set before batching 25 nodes. Selection-context action artwork has
a later presentation contract: every raster occupies the same exact 112 x 130
CSS-pixel transparent viewport, matching a 256 x 296 standard world-unit canvas
at 0.25 display scale and 1.75 maximum map zoom. Reviews cover the applicable
native size, light/dark/high-contrast, grayscale/color-vision simulations,
320/390/600/1024 px, 200% zoom, keyboard focus, every contributor-pattern
state, and negative population. Ruleset-5 inventory prose below is historical
where it conflicts; shared geometry, AA contrast, semantic labels, scaling,
safe area, and PixelLab gates remain active.

Ruleset-6 technology-card artwork uses that same exact 112 x 130 CSS-pixel
transparent viewport. Technology cards expand around the viewport rather than
downscaling the art; accepted raster aspect ratio and transparent padding are
preserved with `object-fit: contain`, and code-native fallbacks occupy the same
framed footprint.

This contract specializes [Pulp Wars Art Direction](../ART_DIRECTION.md) for
HUD icons, panels, technology, dialogs, status marks, and front-of-game art. The
functional and accessibility authority is [Screen Flow](../../ui/SCREEN_FLOW.md).

## Geometry status

Modern Polytopia does not publish native UI or 2D sprite source sizes usable as
runtime metadata, and its screenshots vary by platform, viewport, and scale.
The measurements below are **Pulp Wars UI contracts**, selected for the POC's
responsive DOM/CSS renderer. They are not copied Polytopia dimensions.

| Asset/use                   |          Source |                  Nominal display | Notes                                      |
| --------------------------- | --------------: | -------------------------------: | ------------------------------------------ |
| Standard action/status icon |    128 x 128 px |                   32 x 32 CSS px | 4x source                                  |
| Primary action icon         |    192 x 192 px |                   48 x 48 CSS px | 4x source                                  |
| Compact HUD icon            |      96 x 96 px |                   24 x 24 CSS px | 4x source                                  |
| Unit/role portrait tile     |    256 x 256 px |                   64 x 64 CSS px | square, transparent or approved panel fill |
| Contextual action artwork   | accepted raster |                 112 x 130 CSS px | transparent, `object-fit: contain`         |
| Technology-card artwork     | accepted raster |                 112 x 130 CSS px | transparent, `object-fit: contain`         |
| Faction picker hero         |  1024 x 1024 px | responsive, max 420 x 420 CSS px | presentation only                          |

CSS layout, text, buttons, focus rings, progress bars, panels, cards, selection
diamonds, health bars, and ownership patterns are code-native and must not be
baked raster images. Raster icons remain crisp at their nominal size and at
200% UI scale. Minimum interactive target is 44 x 44 CSS px regardless of the
visible icon size.

## Visual hierarchy

The map is primary during play. HUD panels use broad simple shapes, strong
edges, and restrained decoration so terrain, units, star count, turn, and
available actions scan in that order. Front-of-game and faction-picker art may
be more theatrical, but stays charming, pulpy, silly, adventurous, flat/cel
shaded, and illustrated—not faux-3D, realistic, painterly, or epic-serious.

Use a limited neutral UI palette plus semantic tokens. Faction colors never
double as error/success/selection colors. Every semantic color has shape, icon,
pattern, or text redundancy. Maintain WCAG 2.2 AA contrast for text and visible
focus and target at least 3:1 for meaningful graphical boundaries/states.

Icons use the same strong dark outline and simplified visual shorthand as world
art, with fewer internal details. A 24 CSS px compact icon must remain distinct
in grayscale. Do not reuse a symbol for two commands in the same context.

## Required POC icon families

- Stars, income, round, city, unit, capital, siege, population, and capacity;
- Move, Attack, Recover, Capture, Promote, Wait, Escape, Harvest Fruit, Hunt
  Animal, Build Lumber Mill, Build Mine, Kamikaze Roll, Build Chocolate Wall,
  Candify, and Choose Candify City,
  and End Turn; selected-city training buttons reuse the exact accepted world
  unit sprite rather than a derived portrait or generic Train icon;
- Original Warrior/Archer/Defender/Rider, Candy Warrior/Gumball Guard/Choco
  Engineer/Donut, and shared Catapult portraits/silhouettes;
- Climbing, Riding, Hunting, Organization, Mining, Forestry, Archery, Strategy,
  and Mathematics;
- Workshop, Survey, Resources, City Wall, Fruit, Ore, Animal, Lumber Mill, and
  locked prerequisite;
- Settings, Stats, Tech, zoom, close/back, info/help, copy, randomize, warning,
  save failure, Fast Forward, victory, and defeat.
- Original and Candy faction marks plus one Candy faction-picker hero at
  1024 x 1024. The hero may group the four Candy characters but contains no
  text, UI, city, Catapult redesign, or gameplay-state promise.

Prefer one coherent icon family. Text labels remain present for primary actions
and all reward/confirmation choices. “Disabled” changes value/opacity and retains
enough contrast to identify the command; selected/focused/available/locked are
four visually distinct states.

## Canvas-attached UI anchors and layers

World sprites never bake UI. Attachments use logical entity anchors:

- selection/target diamond: tile center, 128 x 74 CSS px at nominal zoom;
- selected-city territory perimeter: code-native diamond-edge segments around
  only explored public territory tiles, with no fill or edge crossing fog;
- contact shadow: tile center, maximum 58 x 20 CSS px for standard units;
- health bar: centered immediately at the standard unit feet/ground anchor,
  with its 42 x 6 CSS px fill beginning 4 CSS px below the anchor at nominal
  zoom inside a 46 x 10 CSS px dark backing; status width is bounded from 0.75x
  to 1.25x while its ground offset follows camera zoom;
- faction marker: 48 CSS px above and 34 CSS px right of unit feet,
  18 x 18 CSS px;
- city label/status group: centered 38 CSS px below ground anchor with collision
  avoidance; compact height 24 CSS px;
- capital/reward/siege mark: above the building visible bounds using manifest
  attachment metadata, never guessed from trimmed alpha.

At zoom below 0.75x, simplify to owner marker plus health pips and hide
nonessential labels; selected/focused entity retains full accessible DOM detail.
At high zoom, attachments remain bounded by UI scale rather than becoming huge.
At every supported zoom, the feet-anchored health backing must end above the
top of a colocated city label, including DPR 1 and DPR 2 backing stores.

Readiness animates only the active-human unhandled unit sprite between opacity
1 and 0.62 on a 1.6-second ease-in-out loop. Health and owner cues remain
opaque. Reduced motion schedules no animation and keeps the sprite opaque. Wait
and handled actions remove the pulse at the accepted boundary. No detached
circle/check/tick, `W`/`R`, yellow tile badge, or halo is accepted UI.

The selected dock is code-native responsive DOM, not raster panel art. It is an
absolute viewport overlay above the bottom safe area and may obscure the map;
its content must never resize the Canvas host. Review empty and maximum-line
tile/unit/city docks while asserting identical Canvas and camera geometry.
Every raster in its contextual action list uses the shared 112 x 130 CSS-pixel
transparent viewport without cropping or distortion. The fixed 176 CSS-pixel
button grows vertically around that art and readable label. A code-native
fallback uses the same viewport with a visible high-contrast frame and the
button's semantic accessible name. Frozen Ruleset 6 contextual lists continue
to wrap without horizontal overflow. For Ruleset 7, every selected unit, city,
and tile bar spans the viewport, and contextual plus tactical buttons stay in
one left-aligned, nonwrapping, horizontally scrollable row without page-level
horizontal overflow; identity and facts may reflow or scroll separately.

Required layer order is map ground/objects, sprite readiness plus
selection/target effects,
health and entity status, then viewport DOM HUD/panels/dialogs. Unexplored fog covers hidden
world entities, while HUD remains above fog. UI animation consumes domain events
but cannot decide their order or outcome.

The Archer projectile is a code-native Canvas primitive, not a UI/world raster:
a 16 CSS px shaft with a 5 CSS px triangular head and 2 CSS px dark outline at
1x, scaled with camera and clamped to remain legible from 0.625x to 1.75x. Its
angle follows the logical source-to-target vector and its origin comes from the
unit manifest. The impact is a code-native maximum 22 CSS px radial ring. Both
are presentation-only, use the architecture timing/cancellation contract, and
require no PixelLab generation. Catapult has no approved projectile graphic in
this ruleset.

Gumball Guard uses the same projectile geometry/timing envelope but replaces
shaft/head with a code-native filled circle, nominal 10 CSS px diameter with a
2 CSS px outline, clamped for 0.625x–1.75x zoom. Roll direction arrows,
Chocolate Wall placement outlines, Candify tile wash, damage rings, target
paths, and mandatory-city connector highlights are also code-native. Do not
generate them as sprites or bake them into Candy unit/wall art.

## Transparency, raster scaling, and safe area

Export straight-alpha sRGB with clean edge RGB, no matte/halo, no text unless a
one-off approved wordmark requires it, and no background for icons. Keep 8% of
each icon source dimension as transparent safe area unless the silhouette needs
the permitted hard bound; never trim individual exports. Portrait/hero framing
may have an approved background layer separate from the character.

Raster UI sources are 4x nominal and downsample with high-quality interpolation.
Do not use nearest-neighbor pixel-art scaling. CSS handles responsive sizing,
safe-area insets, UI scale, focus, and high contrast. Device-pixel ratio and UI
scale are presentation settings only and never simulation state.

## Readability and responsive checks

Review each asset at 24, 32, 48, and 64 CSS px as relevant, on light/dark panel
tokens, over busy map areas, disabled, focused, selected, and high-contrast
states. Test all player colors plus grayscale and common color-vision
simulations. Check 320 CSS px portrait, 600 px compact, 1024 px desktop, 200%
browser zoom, DPR 1 and 2, and reduced motion.

Focus indicators, keyboard prompts, accessible names, live-region text, damage
numbers, costs, and dynamic labels are semantic DOM/CSS, never generated art.
An attractive icon that cannot be named, distinguished, or paired with text is
not accepted.

## PixelLab recipe and acceptance

Use checked-in programmatic PixelLab scripts for raster UI illustrations and
portraits; use SVG/CSS/HTML authored in the repository for geometric interface
primitives where appropriate. Do not rasterize code-native focus rings, text,
panels, or simple symbols merely to force PixelLab into the workflow.

For PixelLab outputs, record prompt, negative prompt, exact dimensions,
model/settings, seed when supported, source/output mapping, palette target, and
deterministic downscale. Prompts require isolated readable silhouette, chunky
illustrated style, strong outline, flat/cel shading, no photographic/painterly
rendering, no unintended text, and no scene unless the faction hero explicitly
calls for one.

The first sample must include three functionally different items—one 24 px HUD
icon, one 48 px action icon, and one 64 px tech/unit portrait—and each must pass
native and enlarged review before a family is batched. Reject illegibility,
ambiguous metaphor, poor contrast, inconsistent outline/scale, alpha halos,
accidental text, or states distinguishable only by hue. Batch only after at
least three representative assets pass individually and the recipe is stable;
review labeled contact sheets at actual UI sizes and inspect all suspected
failures individually.
