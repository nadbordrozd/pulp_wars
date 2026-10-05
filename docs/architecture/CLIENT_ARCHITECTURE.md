# Pulp Wars Client Architecture

## Ruleset-7 revision-12 current boundary

The current client runs `pulp-wars-poc-7r45` (autosave
`pulpWars.save.v7r45.current`; startup removes the obsolete Ruleset 7 keys
through `pulpWars.save.v7r44.current`;
[mission setups](#mission-setups-pulp_wars-68k2),
[map curiosities](#map-curiosities-pulp_wars-7372),
[the Giant Spider](#the-giant-spider-pulp_wars-7373),
[the Martian and Ice Folk balance round](#the-martian-and-ice-folk-balance-round-pulp_wars-1wy3),
[the Candy engine boundary](#candy-engine-boundary-pulp_wars-jdb3),
and [the naval branch boundary](#naval-branch-boundary-pulp_wars-5ti2-and-5ti3)
are described below),
whose rules for all eight factions
the setup screen offers, Human, Undead, Goblin, Dinosaur, Martian, Ice Folk,
Dwarf, and Candy, are described by
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md)
(`pulp_wars-c87.9` folded revisions 19–21 into it, `pulp_wars-t6s.7` the
[Martian overlay](../product/RULESET_7_MARTIANS.md), `pulp_wars-7g3.8` the
[Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md), `pulp_wars-78i.8`
the [Dwarf overlay](../product/RULESET_7_DWARVES.md), `pulp_wars-jdb.8`
the [Candy overlay](../product/RULESET_7_CANDY.md), and `pulp_wars-5ti.9`
the [naval branch overlay](../product/RULESET_7_NAVAL_BRANCH.md)). The Dinosaur faction of
the [revision-19 overlay](../product/RULESET_7_REVISION_19_DINOSAURS.md)
(`pulp_wars-c87.2`: identity, roster, capacity slots, Grow, Acid, Armoured;
`pulp_wars-c87.3`: Eggs, Shaman Hatch, and Nesting, with their public
previews `previewLayEggV7` and `previewHatchV7`); the client offers the
faction, the Egg marker, and those commands from `pulp_wars-c87.4`.
[Revision 20](../product/RULESET_7_REVISION_20.md) (`pulp_wars-0hi.2`)
removes the revision-19 Stampede command with its previews
(`previewStampedeV7`, `queryStampedeLanesV7`) and board lanes: the
Triceratops attacks with the ordinary `ATTACK`, and its Charge! reaches the
client only through `queryCombatPreviewV7` (`runUp`, `fortificationIgnored`,
`push`, `advances`), `publicUnitStats` (the "Charge!" Attack modifier and
status, `dinosaur.runUpBonus` and `runUpMaximum`), and the `UNIT_PUSHED`
and `UNIT_MOVED` events of the attack. The same revision adds Wallbreaker,
the Nesting city slot, and the full heal of a Promotion or growth stage;
the client reads each from the registry and the public previews.
[Revision 21](../product/RULESET_7_REVISION_21_ACHIEVEMENTS.md)
(`pulp_wars-9s0.4`) adds four achievements (Conqueror, Land Baron, Sea Dog,
Slayer): the client reads their progress from
`PlayerViewV7.achievementProgress` and their display names and goals from
`src/render/achievement-presentation-v7.ts`. The
current-rules document
folds in the
[revision-17 Goblin overlay](../product/RULESET_7_REVISION_17_GOBLINS.md)
(`pulp_wars-0ao.9`), the
[revision-13 Undead overlay](../product/RULESET_7_REVISION_13_UNDEAD.md),
[revision-14 balance overlay](../product/RULESET_7_REVISION_14_BALANCE.md)
(Plague, Bitten, and the income, village, Vampire, and Lich changes),
[revision-15 overlay](../product/RULESET_7_REVISION_15_BALANCE.md) (three-turn
Plague that spreads only on its first turn, 18-HP Zombies; the Plague chip
counts the remaining turns), and the
[revision-16 overlay](../product/RULESET_7_REVISION_16.md) (`pulp_wars-wwc`:
orthogonal Shallow Water, the capital growth floor, and the growth-first
Normal AI opening; Help on naval maps explains the Shallow rule;
`pulp_wars-zsa`: 2-tile boats and the landing preview described below;
`pulp_wars-4gc`: economy deflation), which remain as history. The Plague and
Bitten UI surfaces are described in the
[Screen Flow revision-14 overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-revision-14-plague-and-bitten-overlay)
and read only the public `plagued` and `bitten` view lists, previews, and
projected events. The engine registers the faction per seat, and the setup UI
always offers a Human/Undead/Goblin/Dinosaur/Martian/Ice Folk/Dwarf choice
for the human and each AI seat (one faction per player, distinct by
default; see the
[Martian engine boundary](#martian-engine-boundary-pulp_wars-t6s2));
there is no URL flag for it (`pulp_wars-vkq.16` removed the
former `?undead=1` development flag and `src/app/undead-flag-v7.ts`). Saves
with Undead, Goblin, Dinosaur, Martian, Ice Folk, or Dwarf seats load and
resume like any other. Goblin
presentation (`pulp_wars-0ao.5`, `0ao.12`) likewise reads only public views,
the public Kaboom, attack-explosion, and combat previews, the public unit
stats' `goblin` block, and projected events
(`src/render/goblin-presentation-v7.ts`,
`src/render/canvas/goblin-canvas-v7.ts` for the LEGACY badge, and
`src/render/canvas/goblin-explosion-v7.ts` for the code-native blast effect),
with the approved PixelLab CHIBI Goblin sprites and portraits
(`pulp_wars-0ao.8`), as described in the
[Screen Flow revision-17 overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-revision-17-goblin-overlay).
Undead presentation reads
only public views, previews and projected events
(`src/render/undead-presentation-v7.ts`,
`src/render/canvas/undead-canvas-v7.ts`): approved CHIBI Undead rasters, the
LEGACY placeholder (Human sprites plus a faction badge and a code-native Grave
marker), and ability previews, as described in the
[Screen Flow revision-13 overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-revision-13-undead-overlay).
Revision 12 adds
no overlay document: the free opening technology, Fertile Ground mask, and
Raider Escape are specified there. A Raider with `escapeAvailable` stays
selected after its attack, the board highlights its offered escape Moves with
the ordinary move affordance, and the unit card shows "Escape: may move
again". Free research shows as "Free" in the technology tree. The earlier
[revision-11 city logistics contract](../product/RULESET_7_REVISION_11_CITY_LOGISTICS_AI.md),
including its Normal-AI sections 7–8, and the revision-10 and revision-9
overlays are implemented and remain as history. Setup exposes Dry Land, Pangea,
Continents, Archipelago, Lakes, and (revision 18) Showcase, with Continents
selected by default. The
controller persists the selected map type and schedules every AI turn through
bounded `NormalPolicyWorkV7` callbacks over a retained public view.

The public city projection exposes `cityActionAvailable` only to the owner.
Start Turn projects ordered Windmill healing events, and Canvas coalesces their
visible sources and recipients on the existing effects canvas. Roads-derived
population and land trade, Market income (1 Coin plus 1 per distinct adjacent
family, at most 3; Commerce has not doubled it since revision 14),
Drill-visible Ore, and the Raiding Pillage assignment flow through public
queries and previews. The current Port
and Fish map, dock, action, and technology presentation uses the accepted
revision-11 source IDs and manifest geometry.

`PlayerViewV7.naval` is the only naval presentation source: owned Port status,
trade/network city IDs, public sea routes, and recoverable vessel IDs. Canvas
renders explored shallow/deep water, Fish, Pearls, Ports, transport/ship forms,
route, blockade, recovery, and legal command targets from that view. Embark and
disembark movement, visible enemy Port/ship actions, and Battleship fire use the
ordinary presentation queue; projection removes concealed coordinates before
the queue sees them. DOM actions dispatch only exact public commands, including
the selected active Port for naval recruitment and selected passenger for a
landing target. Revision 16 (`pulp_wars-zsa`) adds a landing preview from the
public `queryLandingPreviewV7`: for a selected embarked unit that has not
moved, the board marks direct landing cells ("Land now", teal dashes) and
cells reached by one water step then landing ("Move 1, then land", amber
dots), and the selection dock shows a legend for both. A two-step target
carries the one-cell `MOVE` plus a follow-up `DISEMBARK`; the DOM sends the
landing only when the accepted Move left the unit embarked on that water cell
and the landing is still offered.

**Status:** frozen Ruleset-6 compatibility architecture below the current
Ruleset-7 boundary

**Rules:** [Ruleset 6](../product/RULESET_6.md)

**UI contract:** [Screen Flow](../ui/SCREEN_FLOW.md)

## Martian engine boundary (`pulp_wars-t6s.2`)

The engine registers a fifth faction, `MARTIAN`
([Martian overlay](../product/RULESET_7_MARTIANS.md)), with every rule of
that document. Since the Martian UI bead (`pulp_wars-t6s.4`) the setup
screen offers it for every seat (`FACTIONS` in
`src/render/dom/app-view-v7.ts`), and the client draws and plays it as the
[Screen Flow Martian overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-martian-overlay)
describes (see [Martian presentation](#martian-presentation-pulp_wars-t6s4)
below).

What the Martian UI reads, all from `PlayerViewV7` and the public queries:

- `view.shields`, `view.cooling`, `view.mindControlled` (the Mind Control
  revision, `7r33`: `{ unitId, brainUnitId, originalOwnerId }`, the Brain
  null when the viewer cannot see it), and `view.mindControlCooldowns`: one
  entry per visible unit, public like HP;
- `publicUnitStatsV7(...).martian` (`shield`, `shieldMaximum`,
  `capacitySlots`, `movementMode`, `rayPower`, `cooling`, `pierce`,
  `forceField`, `mindControl` with `controlled` and `controlLimit`), a
  controlled unit's top-level `mindControl`, the `SHIELD` stat row after
  `HP`, and the `HALF_POWER` and `FORCE_FIELD` modifier sources; a unit's
  kind (label, art, faction blocks) through `unitFactionV7`;
- the commands `BEAM_DOWN`, `MIND_CONTROL`, and `TRACTOR_BEAM` in
  `queryPlayerCommandsV7`, with the exact previews `previewBeamDownV7`,
  `previewMindControlV7`, and `previewTractorBeamV7` (null unless the
  command is offered);
- the combat-preview fields `rayPower`, `coolingApplied`,
  `defenderShieldDamage`, and `attackerShieldDamage` (`damageToDefender`
  and `damageToAttacker` stay HP damage), `shieldDamage` on splash, Pierce,
  Wail, and explosion entries, and `fortificationIgnored` for the
  Disintegrator;
- the events `SHIELDS_RECHARGED`, `UNIT_BEAMED`, `UNIT_MIND_CONTROLLED`,
  `UNIT_RELEASED`, and `UNIT_PULLED`, the `UNIT_DIED` cause `BRAIN_LOST`, and the
  `UNIT_MOVE_INTERRUPTED` reason `SETTLEMENT_FORBIDDEN`;
- `MOVE` offers that already follow Stride, Flying, and self-launch (a
  machine's Move that ends on water emits `UNIT_EMBARKED`).

In a match without a Martian seat the four lists are empty and the new
fields have their neutral values, so every existing screen is unchanged.

### Martian presentation (`pulp_wars-t6s.4`)

The Martian UI reads only the sources above, in the pattern of the Goblin
and Dinosaur presentation:

- `src/render/martian-presentation-v7.ts`: every Martian text (section
  13.2 labels, the fourteen Help sentences, unit info lines, the attack
  preview's Shield, ray-power, Cooling, Disintegrator and Pierce lines, the
  Mind Control and Tractor Beam preview lines, the reasons a Beam Down or a
  Mind Control target is unavailable, log lines, unlock and recruit texts),
  with names and numbers from the registry and the engine constants;
- `src/render/canvas/martian-board-plan-v7.ts`: the Martian part of the
  board plan: unit markers (`BoardRenderPlanEntryV7.martian`), the three
  aimed abilities (`BoardRenderInteractionV7.martianPick`; target families
  `BEAM_DOWN_PASSENGER`, `BEAM_DOWN`, `MIND_CONTROL`, `TRACTOR_BEAM`), the
  Force Field and control-link selection previews, and an attack target's
  Martian lines (`previewFocusNote`, `pierce`, `pullTo`, `launch`);
- `src/render/canvas/martian-canvas-v7.ts`: the code-drawn markers (saucer
  badge, Shield bar, Cooling glyph, flyer shadow and lift, wade ripples)
  and the Mind Control revision's control visual (`drawControlHaloV7` over
  the head found by `spriteHeadAnchorV7`, `drawControlBrainChipV7`,
  `drawControlLinkV7`) in `MIND_CONTROL_COLOURS_V7`, the Martian faction
  colour's shades from `factionColourShadesV7` (`faction-colours-v7.ts`);
  the board host keeps a calm redraw while a controlled unit is visible
  (full motion) for the halo's pulse. `src/render/canvas/martian-effects-v7.ts`:
  the cues of the `MARTIAN` presentation step (the halo shattering,
  `CONTROL_RELEASE`, on `UNIT_RELEASED` and `BRAIN_LOST`), beams in code and
  the effect sprites through the support effect art of the effects canvas;
- art: the Martian modules of the direction registry
  (`chibi-direction-martian-art-manifest.ts`), resolved by
  `unitArtSubjectV7` (from the unit's kind; a machine afloat),
  `cityArtSubjectV7`, `portraitSubjectV7`, `technologySubjectV7` and
  `commandSubjectV7`, with `chibiFallbackSubjectV7` falling back to the
  Human subject; the Thrall subjects are retired (`pulp_wars-b5f.3`);
  `MARTIAN_FLAG_ANCHORS_V7` is part of `DIRECTION_FLAG_ANCHORS_V7`.

The Classic look and LEGACY have no Martian art: a Martian unit is the Human
sprite of its role with the saucer badge (the rule of every earlier
faction), and a Martian city the Human city; every marker is code-drawn in
both.

## Ice Folk engine boundary (`pulp_wars-7g3.3`)

The engine registers a sixth faction, `ICE_FOLK`
([Ice Folk overlay](../product/RULESET_7_ICE_FOLK.md), folded by
`pulp_wars-7g3.8` into
[current rules section 21](../product/RULESET_7_CURRENT.md#21-ice-folk-faction-rules)),
with every rule of that document. Since the Ice Folk UI bead (`pulp_wars-7g3.6`) the setup
screen offers it for every seat (`FACTIONS` in
`src/render/dom/app-view-v7.ts`), and the client draws and plays it as the
[Screen Flow Ice Folk overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-ice-folk-overlay)
describes (see [Ice Folk presentation](#ice-folk-presentation-pulp_wars-7g36)
below).

Snow and the Blizzard are derived, never stored: the engine computes them
from the state on demand (`winterV7` in `src/engine/v7/ice-folk.ts`, cached
per immutable state object only), and the view carries what the viewer
knows of them. What the Ice Folk UI reads, all from `PlayerViewV7` and the
public queries:

- the tile flags `snow` and `blizzard` on every explored view tile
  (territory and Deep Winter Snow, and the Blizzard of a Witch the viewer
  can see, water included). They are optional in the type only so that
  hand-built scene fixtures need not spell out `false`; readers test
  `=== true`;
- `view.chilled`: one `{ unitId, sluggish, turnsLeft }` entry per visible
  Chilled unit, public like HP;
- `publicUnitStatsV7(...).chill` for every unit (`null` without Chill) and
  `.iceFolk` for units of an Ice Folk seat (`onSnow`, `inBlizzard`,
  `snowCover`, `glides`, `mountainBorn`, `shatterThreshold`, `rockfall`,
  `planted`, `sweepDamage`, `blizzard`), with the `SNOW` (Snow cover)
  Defense source and the `PLANTED` Attack source;
- the commands `THROW_BOLAS` and `COLD_SNAP` in `queryPlayerCommandsV7`,
  with the exact previews `previewBolasV7` (including the viewer's attacks
  that would then shatter the target) and `previewColdSnapV7` (visible
  targets), both null unless the command is offered;
- the combat-preview fields `shatters`, `coldBloodApplied`,
  `rockfallApplied`, `plantedApplied`, `blizzardHalved`, `snowCover`,
  `sweep` (the flank hits are the `splash` entries), and
  `hiddenBlizzardPossible` (a hidden Witch may halve the shot: the preview
  is not exact), and the `assumeTargetChilled` option of
  `queryCombatPreviewV7` and `estimateCombatV7`;
- `curedChill` in Tend Wounded previews and results;
- the event `UNITS_CHILLED` (its `sourceUnitId` is null when the viewer
  cannot see the source), the `UNIT_DIED` cause `SHATTER` (no Grave, no
  blast), the `FIELD_DEFENSE_DESTROYED` reason `TRAMPLE`, the
  `UNIT_MOVE_INTERRUPTED` reason `SNOW`, and the move-rejection reason
  `SNOW_STOPS_MOVE`;
- `MOVE` offers that already follow Glide, deep snow, Mountain-born, and
  Prowl.

In a match without an Ice Folk seat the `chilled` lists are empty, every
tile flag is `false`, and the new fields have their neutral values, so every
existing screen is unchanged.

### Ice Folk presentation (`pulp_wars-7g3.6`)

The Ice Folk UI reads only the sources above, in the pattern of the Martian
presentation:

- `src/render/ice-folk-presentation-v7.ts`: every Ice Folk text (section
  13.2 labels, the fifteen Help sentences, the Chill state of a unit
  (Frozen, Frosted, Thawing) and the Shatter threshold that applies to it,
  unit info lines, the attack preview's Shatter, Chilled, Sweep, Trample,
  Boulders, Rockfall, Planted, Cold Blood, Snow cover, Blizzard and
  hidden-Blizzard lines, the Bolas and Cold Snap preview lines, why either
  is unavailable, log lines, unlock and recruit texts), with names and
  numbers from the registry and the engine constants;
- `src/render/canvas/ice-folk-board-plan-v7.ts`: the Ice Folk part of the
  board plan: the Snow cells with their exposed edges and variant and the
  Blizzard cells from the view's tile flags (`BoardRenderPlanEntryV7.snow`
  and `.blizzard` on TERRAIN entries), the unit markers
  (`BoardRenderPlanEntryV7.iceFolk`: Chill, Shatter window, Witch; and
  `blizzardRing` on the selected Witch), the two aimed abilities
  (`BoardRenderInteractionV7.iceFolkPick`; target families `THROW_BOLAS`
  and `COLD_SNAP`, the Cold Snap reach as an `ABILITY_AREA`), and an attack
  target's Ice Folk lines (`MapCommandTargetV7.sweep`);
- `src/render/canvas/ice-folk-canvas-v7.ts`: the code-drawn pieces from
  the pure functions of `chibi-direction-ice-folk-presentation.ts`: the peak
  badge, the Snow overlay and snow caps, the Blizzard veil, flakes and the
  Witch's outline, the Frozen casing and the Frosted rime, the frost glyph,
  the HP bar's Shatter window and a Shatter's cracks. Rasters are built once
  and cached by `IceFolkBoardArtV7` (`createIceFolkBoardArtV7`, the board
  host's): at most 64 Snow tiles (edge set by variant), and the caps, rime
  and casings of each body or sprite image (a `WeakMap` keyed by the image,
  which the art resolvers keep stable). `drawBoardV7` takes `iceFolkArt`,
  `blizzardTimeMs` (0 for reduced motion) and `iceFolkShatter` (the unit
  being shattered and the time into the timeline);
- `src/render/canvas/ice-folk-effects-v7.ts`: the cues of the `ICE_FOLK`
  presentation step (Shatter, Cold Snap, Bolas, Cold Aura, Sweep) with the
  effect sprites through the support effect art of the effects canvas, and
  the Shatter's board cue (`shatterBoardCueV7`: casing, cracks, shake, gone)
  from `ICE_FOLK_SHATTER_TIMELINE_V7`. A shattering attack's hit step has
  `holdTarget`, so the defender stays on the board until it bursts;
- art: the Ice Folk module of the direction registry
  (`chibi-direction-ice-folk-art-manifest.ts`), resolved by
  `unitArtSubjectV7`, `cityArtSubjectV7`, `portraitSubjectV7`,
  `technologySubjectV7` (Deep Winter and Brittle: `ICON:TECH:ICE_FOLK:*`)
  and `commandSubjectV7`, with `chibiFallbackSubjectV7` falling back to the
  Human subject; `ICE_FOLK_FLAG_ANCHORS_V7` is part of
  `DIRECTION_FLAG_ANCHORS_V7`.

The Classic look and LEGACY have no Ice Folk art: an Ice Folk unit is the
Human sprite of its role with the peak badge, and an Ice Folk city the
Human city; Snow, the Blizzard and every marker are code-drawn in both
(LEGACY caps its raised Forest and Mountain bodies too).

**Cost.** The Snow overlay is one `drawImage` of a cached tile per Snow cell
(and one of a cached caps raster per Snow Forest or Mountain), a Blizzard
cell one veil rectangle and nine flakes. Measured on whole 16 x 16 Showcase
boards in the live look (headless Chrome, `drawBoardV7` submission time,
median of 120 frames): 2.0 ms with four Human seats, 2.3 ms with one Ice
Folk seat (55 Snow and 9 Blizzard cells), 2.7 ms with four (176 and 36) at
DPR 1, and 1.8 to 2.1 ms for all three at DPR 2. While a Blizzard is in view
and no ready unit already animates the board, the host redraws about
fifteen times a second for the flakes (full motion only).

## Dwarf engine boundary (`pulp_wars-78i.3`)

The engine registers a seventh faction, `DWARF`
([Dwarf overlay](../product/RULESET_7_DWARVES.md), folded by
`pulp_wars-78i.8` into
[current rules section 22](../product/RULESET_7_CURRENT.md#22-dwarf-faction-rules)),
with every rule of that document, under `pulp-wars-poc-7r30` (and the
`pulp_wars-78i.7` bomb of `7r31`). Since the Dwarf UI bead
(`pulp_wars-78i.6`) the setup screen offers it for every seat (`FACTIONS`
in `src/render/dom/app-view-v7.ts`), and the client draws and plays it as
the
[Screen Flow Dwarf overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-dwarf-overlay)
describes (see [Dwarf presentation](#dwarf-presentation-pulp_wars-78i6)
below).

**The off-board list.** A burrowed unit (a Steam Mole that tunnelled and
its rider) is not in `units`: it lives in `GameStateV7.burrowed` as
`{ unit, moleUnitId }` until its owner's next Start Turn. Every reader of
a unit list chooses between `boardUnitsV7` (what stands on the board) and
`allOwnedUnitsV7` (everything a player owns: capacity, orphaning,
elimination, status pruning, the leaderboard, metrics, parsing, entity
IDs), both in `src/engine/v7/units.ts`; `tileOccupiedV7` is the one
occupancy predicate (a unit or a mound). The classification of every
`<expression>.units` reader in `src` is checked in
(`tests/fixtures/v7-unit-reader-classes.ts`) and enforced by
`tests/unit/ruleset-v7-dwarf-unit-readers.test.ts`: a new reader needs a
class, and every all-units reader reads `burrowed` or `allOwnedUnitsV7`.
The UI is a board-only reader: it never selects, cycles, or commands a
mound; a mound is information only.

What the Dwarf UI reads, all from `PlayerViewV7` and the public queries:

- `view.burrowed`: the mounds on tiles the viewer has explored, with the
  ordinary public unit record and `moleUnitId`; `view.surfacedThisTurn` and
  `view.bombedThisTurn` for visible units;
- `publicUnitStatsV7(...)`: `bombedThisTurn` and `surfacedThisTurn`
  (booleans, present for every unit exactly when the match has a Dwarf
  seat) and, for units of a Dwarf seat, the `dwarf` block (`construct`,
  `machine`, `dugIn`, `digsIn`, `shotsLeft`, `plated`, `tunnelRange`,
  `eruptionDamage`, `bombDamage`, `burrowed`); Dig In is the `DIG_IN`
  Defense source of a dug-in unit (when the tile's Field Defense does not
  already count);
- the commands `TUNNEL`, `BOMB_RUN`, and `ASSEMBLE` in
  `queryPlayerCommandsV7`, with `previewTunnelV7` (the eruption forecast on
  the current board, `projected: true`), `previewBombRunV7` (exact damage,
  the blast of a killed exploding target, and `landingThreat`),
  `previewAssembleV7`, and `queryAssembleUnavailableReasonV7`, each null
  unless the command is offered;
- the combat-preview fields `dugIn`, `unflinchingApplied`, and
  `platedApplied`; Knockback in the existing `push` field, Blasting
  Charges in `fortificationIgnored`, the Gunner's second shot in
  `attacksRemaining`;
- `queryThreatenedTilesV7` with a Gyrocopter's bombing reach (Chebyshev 2,
  no ordinary attack), each mound's eruption ring and surfacing reach, and a
  Gunner's two shots from where it stands;
- the events `UNIT_TUNNELLED` (its tiles null where the viewer has explored
  neither), `UNIT_SURFACED` (to a viewer that owns a victim but cannot see
  the mound: its own entries, the Mole hidden), `UNIT_BOMBED` (to a target
  owner who cannot see the Gyrocopter: a `COMBAT_SPLASH_DAMAGE` entry), and
  `UNIT_ASSEMBLED` (owner-private, like training); the `UNIT_DIED` causes
  `BOMB` and `ERUPTION`, the `FIELD_DEFENSE_DESTROYED` reason `UNDERMINED`,
  and the `UNIT_MOVE_INTERRUPTED` and move-rejection reason `MOUND`;
- the errors `TUNNEL_NOT_LEGAL`, `BOMB_RUN_NOT_LEGAL`, and
  `ASSEMBLE_NOT_LEGAL` with their reasons, and the `RECOVER_NOT_LEGAL`
  reason `CONSTRUCT`.

In a match without a Dwarf seat the three lists are empty, the two
per-unit flags and the `dwarf` block are absent, and the three
combat-preview fields are `false`, so every existing screen is unchanged.

### Dwarf presentation (`pulp_wars-78i.6`)

The Dwarf UI reads only the sources above, in the pattern of the Martian
and Ice Folk presentation (one engine query was corrected for it:
`previewTendWoundedV7` now previews an Engineer's Repair of a machine as
the reducer resolves it, `repairMachineHeal`, 4, instead of 2):

- `src/render/dwarf-presentation-v7.ts`: every Dwarf text (section 16.2
  labels, the twelve Help sentences, the mound's information, Dig In, the
  clockwork status, the Gunner's shots, Plated, the rider's surfacing
  brake, the attack preview's Dug in, Plated, Blasting and Knockback notes
  and the shooter's lines (Clockwork, the second shot, "Cannot move after
  firing"), the Tunnel forecast, the bomb and landing lines, the Assemble
  summary, why an ability is unavailable, log lines, unlock and recruit
  texts), with names and numbers from the registry and the engine
  constants;
- `src/render/canvas/dwarf-board-plan-v7.ts`: the Dwarf part of the board
  plan: the mounds (UNIT entries keyed `mound:<id>`, so no unit lookup,
  selection jump, ready cue or command ever finds them, with
  `BoardRenderPlanEntryV7.dwarfMound` and the ring of a selected Mole
  mound), the unit markers (`BoardRenderPlanEntryV7.dwarf`: Dig In,
  clockwork, the flying Gyrocopter), the three aimed abilities
  (`BoardRenderInteractionV7.dwarfPick`; target families `TUNNEL`,
  `TUNNEL_DESTINATION`, `TUNNEL_RIDER`, `BOMB_TARGET`, `BOMB_RUN`,
  `ASSEMBLE`; the forecast and bomb marks as ability entries), and an
  attack target's Dwarf lines (`MapCommandTargetV7.knockback`, the shooter
  lines in `previewFocusNote`) and a Tunnel destination's forecast
  (`MapCommandTargetV7.eruption`, drawn while focused);
- `src/render/canvas/dwarf-canvas-v7.ts`: the code-drawn pieces: the cog
  badge, the Dig In earthwork from `dwarfDigInMarkerV7` (cached per width by
  `DwarfBoardArtV7`, `createDwarfBoardArtV7`, the board host's; the bank
  before the sprite, the sandbags after it, on the ground rectangle), the
  clockwork cog at the HP bar's end, the mound for LEGACY and the classic
  look, the mound's surfacing chip, and the eruption ring
  (`DWARF_MOUND_V7.eruptionRing`). `drawBoardV7` takes `dwarfArt`;
- `src/render/canvas/dwarf-effects-v7.ts`: the cues of the `DWARF`
  presentation step (TUNNEL, ERUPTION on `DWARF_ERUPTION_TIMELINE_V7`, BOMB
  on `DWARF_BOMB_TIMELINE_V7`, ASSEMBLE, REPAIR, KNOCKBACK) with the four
  effect sprites through the support effect art of the effects canvas. An
  eruption step shows the view before it (the mound) until the timeline's
  surfacing frame; a bomb run is a `MOVE` of the Gyrocopter, the `DWARF`
  bomb, then the target's `DAMAGE`; a Knockback is a one-tile `pushSlide`
  `MOVE` and a puff; the flyer's shadow and lift reuse the Martian flyer
  code (`flyerPresentationV7` knows the Gyrocopter);
- art: the Dwarf module of the direction registry
  (`chibi-direction-dwarf-art-manifest.ts`; its naval set is appended to
  `CHIBI_NAVAL_FACTION_ART_ASSETS_V7`, so the generic naval wiring draws
  the Dwarf fleet), resolved by `unitArtSubjectV7`, `moundArtSubjectV7`,
  `cityArtSubjectV7`, `portraitSubjectV7`, `technologySubjectV7` (Dig In
  and Blasting Charges: `ICON:TECH:DWARF:*`) and `commandSubjectV7` (Repair:
  `ICON:ACTION:DWARF:TEND_WOUNDED`), with `chibiFallbackSubjectV7` falling
  back to the Human subject (the mounds have none: code-drawn);
  `DWARF_FLAG_ANCHORS_V7` is part of `DIRECTION_FLAG_ANCHORS_V7`.

The Classic look and LEGACY have no Dwarf art: a Dwarf unit is the Human
sprite of its role with the cog badge, a Dwarf city the Human city, and a
mound a code-drawn heap; every marker is code-drawn in both.

## Mission setups (`pulp_wars-68k.2`)

`pulp-wars-poc-7r34` adds the engine half of the
[campaign design](../product/CAMPAIGN.md) (section 2;
[current rules section 2.6](../product/RULESET_7_CURRENT.md#26-mission-setup)).
A mission is engine data: one frozen `MissionDefinitionV7` per module under
`src/engine/v7/missions/`, registered in `MISSION_REGISTRY_V7`
(`missions/index.ts`, with `missionByIdV7`, `missionDefinitionV7`, and
`missionMatchSetupV7`, which builds the `MISSION` setup of a mission and a
faction choice). `missions/build.ts` is the pure, PRNG-free builder that
`createInitialMapStateV7` dispatches `mapType: "MISSION"` to, exactly as it
dispatches the Showcase; the result is an ordinary `GameStateV7` (no new
state field). The only hidden mission registered so far is the engine
fixture `TEST_GROUNDS`; the chapter, story, and campaign screens are
`pulp_wars-68k.4` and `68k.5`. The skirmish setup never offers `MISSION`:
the browser builds a mission setup only from the campaign briefing
([below](#campaign-progress-and-screens-pulp_wars-68k5)), through
`missionMatchSetupV7`.

- **Setup.** A `MISSION` setup carries `mission: { id, revision }`, which the
  autosave and replays store; any other mismatch with the definition is
  `INVALID_SETUP` and an unregistered pair is `UNKNOWN_MISSION` (the
  controller reports both as an invalid setup).
- **Forbidden technologies.** `forbiddenTechnologiesV7(setup)`
  (`src/engine/v7/forbidden-technologies.ts`) is the one source of the Dry
  Land Naval ban and of a mission's list; the reducer, the public technology
  tree (`DISABLED`), and the research offers read it. The technology tree
  card and detail read the reason from it: "Unavailable in this mission" for
  a mission, "Unavailable on Dry Land maps" otherwise.
- **Stale saves.** `parseSaveV7` maps `UNKNOWN_MISSION` to `INCOMPATIBLE`
  with the diagnostic `STALE_MISSION_DIAGNOSTIC_V7` ("This mission was
  updated since the game was saved. Start it again from the campaign."),
  which the save-recovery screen shows with its Delete action; a replay of
  such a setup is `INCOMPATIBLE_REPLAY`. Adding a mission or bumping a
  mission's revision never changes the ruleset identity or the autosave key.
  A mission setup always carries `curiosities: false`.

### Campaign progress and screens (`pulp_wars-68k.5`)

The campaign UI ([design](../product/CAMPAIGN.md) sections 4 and 5; screens
in the [screen flow overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-campaign-overlay))
adds one browser key and no ruleset change.

- **Storage.** `pulpWars.campaign.v1` (`CAMPAIGN_PROGRESS_STORAGE_KEY_V7`),
  owned by `CampaignProgressStoreV7` (`src/persistence/campaign-v7.ts`),
  holds the format tag `pulp-wars-campaign-progress`, version 1, and
  `completed`, a record from mission ID to `{ firstWonAt, bestRounds }`. It
  is strictly parsed: anything else is unreadable, and an unreadable record
  is never overwritten until reset.
  It is not a save key: it is not in `OBSOLETE_SAVE_STORAGE_KEYS_V7`, so a
  ruleset identity change leaves it alone, and Delete save never touches it.
  Every storage access is guarded; a failing or missing storage reports an
  error (or keeps no progress) and never breaks the match. Unknown mission
  IDs are kept.
- **Derived state.** Only completions are stored. `src/campaign/progress-v7.ts`
  derives, from them and the chapter table (`CHAPTER_ONE_V7`), each
  mission's state (missions open in order), the unlocked factions, the
  filtered faction choice of a mission, and the next mission.
- **Recording.** `Ruleset7BrowserController` records the human's `VICTORY`
  of a chapter mission (`setup.mission` in a chapter; hidden fixtures and
  skirmishes record nothing) inside the accepted boundary, before any
  subscriber or the Victory dialog sees it, and again when a completed
  mission save loads (idempotent: the first date is kept and `bestRounds`
  only falls). `campaignProgress()` returns the completions, a status
  (`OK` or `UNREADABLE`), and the last recorded win with the factions it
  newly unlocked; `resetCampaignProgress()` erases the key. Both are
  optional members of `Ruleset7ControllerPortV7`; a port without them
  shows the campaign with no progress.
- **One autosave slot.** A mission is an ordinary match in the existing
  autosave. Leaving a finished mission through Next mission or Campaign
  deletes that finished save (its win is recorded) and returns to the
  campaign screen.
- **Tests and smoke.** `tests/unit/campaign-progress-v7.test.ts`,
  `tests/integration/ruleset7-campaign-dom.test.ts`, the campaign cases of
  `ruleset7-browser-controller.test.ts` and of the no-coordinates sweep use
  `tests/fixtures/v7-campaign-ui.ts`, real replay-valid mission matches
  played to a win or a loss. The browser smoke's campaign probe wins
  mission 1 from that fixture on the development server, and its
  storage-isolation check seeds the campaign key and expects it to survive
  the obsolete-key cleanup and Delete save.

## Map curiosities (`pulp_wars-737.2`)

`pulp-wars-poc-7r35` adds engine step I of the
[map curiosities spec](../product/RULESET_7_MAP_CURIOSITIES.md)
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities)):
the required setup field `MatchSetupV7.curiosities`, the Fountain of Youth,
the Shrine, and the Sunken Wreck. `src/engine/v7/curiosities.ts` holds the
placement (its own stream after the Rifts, called by `map.ts` under the
`CURIOSITIES` generation rules; `RIFTS` is the parity generator before it)
and the rule helpers that Start Turn (`startTurnEconomyV7`, the Fountain)
and `MOVE` (`applyMove`, the Shrine and the Wreck) call.

- **State and view.** `GameStateV7.curiosities` (`{ kind, at }[]`, sorted
  by `(y, x)`) is parsed against the setup and the board; a Shrine veteran
  may have fewer than three kills only when the option is on.
  `PlayerViewV7.curiosities` is the explored subset. `FOUNTAIN_HEALED`,
  `SHRINE_CLAIMED`, and `WRECK_SALVAGED` are projected by
  `event-projection.ts` (the Wreck to its owner only).
- **Setup screen.** The only UI of this step is the "Curiosities" checkbox
  (`#v7-curiosities`, `.v7-curiosities-choice`) under the Map description:
  checked by default, part of the draft like the other choices, hidden while
  the Showcase is the map, and a Showcase launches with `false`
  (`setupFrom`). The text is the one word, by the minimal-text rule of the
  [screen flow](../ui/SCREEN_FLOW.md#no-coordinates-minimal-text-bead-pulp_wars-b5f8).
- **Not drawn yet.** The board, the tile panel, the event log, and Help do
  not show curiosities until the UI step (`pulp_wars-737.6`, after the
  Monster engine `737.3` and the art `737.5`): a match with the option on
  has them in its state and public view but they are invisible in the
  browser, and their events have no log text. The Normal AI plays them
  since `pulp_wars-737.4`
  ([Normal AI: map curiosities](NORMAL_AI.md#map-curiosities-pulp_wars-7374)).

## The Giant Spider (`pulp_wars-737.3`)

`pulp-wars-poc-7r36` adds engine step II
([current rules section 2.7](../product/RULESET_7_CURRENT.md#27-map-curiosities);
[spec section 18](../product/RULESET_7_MAP_CURIOSITIES.md#18-implementation-notes-pulp_wars-7373)):
the Monster, a unit whose `ownerId` is the reserved neutral owner
`NEUTRAL_OWNER_ID_V7` (0, never a seat).

- **Kind and owner.** `unitFactionV7` returns `UnitKindV7`, a seat faction
  or `"NEUTRAL"`; the role, mechanics, and capability resolvers and
  `factionRulesV7` resolve the neutral registration, and
  `ownerResearchedTechsV7` is the owner's research (empty for the neutral
  owner). `cooperativeAlliesV7` (`economy.ts`) is the one Cooperative
  alliance rule; the canonical relationship helpers and every public copy
  use it, and it never allies the neutral owner. A checked-in
  classification (`tests/fixtures/v7-owner-reader-classes.ts`, scanned by
  `tests/fixtures/v7-owner-readers.ts`) names every owner reader of the
  engine, the Normal AI, and the headless runner as neutral-aware,
  neutral-safe, or player-only.
- **Reducer.** The `ATTACK` exchange after validation is
  `resolveAttackExchangeV7`, shared by `applyAttack` and the neutral turn
  (`resolveNeutralTurnV7`, run by `applyEndTurn` when the round wraps and a
  Monster is on the board). Placement, movement, targeting, the stateless
  wander, the provocation record (derived from each accepted command's
  damage events), and the pruning of the `monsters` list are in
  `curiosities.ts`.
- **State, view, queries.** `GameStateV7.monsters` and
  `PlayerViewV7.monsters` (visible Monsters, `provokedBy` filtered to
  visible units); `previewMonsterV7`, the optional `monsterRetaliates` of
  `queryCombatPreviewV7` (`PublicCombatPreviewV7`), and the Monster's
  `queryThreatenedTilesV7` (its provoke tiles).
- **Presentation until the UI step.** The board, the dock, and the unit
  panel read the Spider's art and labels through
  `presentedUnitFactionV7` (`src/render/neutral-presentation-v7.ts`): the
  base (Human) art of its mechanical role, the Juggernaut, with no owner
  colour (its owner is no player); its role rule names it the Giant
  Spider. Its sprite, web, area and reach
  overlays, the provoke warning, the neutral-turn banner, the event log
  text, and Help belong to `pulp_wars-737.6`; until then the neutral turn
  plays back like any other accepted boundary.

## The Martian and Ice Folk balance round (`pulp_wars-1wy.3`)

`pulp-wars-poc-7r37` implements the engine step of the
[balance design](../product/RULESET_7_BALANCE_MARTIAN_ICE.md)
([current rules sections 20.7](../product/RULESET_7_CURRENT.md#207-beam-down),
[20.10](../product/RULESET_7_CURRENT.md#2010-tractor-beam), and
[21.5](../product/RULESET_7_CURRENT.md#215-snow)).

- **Shared predicates.** The Beam Down and Tractor Beam legality lives in
  `src/engine/v7/martian.ts` as functions that take the roster (a state or
  a view) and plain tile facts: `beamDownCarrierReadyV7`,
  `beamDownPassengerLegalV7`, `beamDownDestinationLegalV7`,
  `beamedActivationV7`, `tractorBeamRuleV7`, `tractorBeamActorReadyV7`,
  `tractorBeamTargetBlockV7`, `tractorBeamStepLegalV7`, and
  `tractorBeamPathV7`. The reducer (`applyBeamDown`, `applyTractorBeam`)
  and the public command query call the same functions and differ only in
  how they collect `PlacementTileFactsV7` (the canonical board, or the
  view's explored tiles), so an offered command is an accepted one.
- **State, view, events.** `GameStateV7.beamedThisTurn` and
  `tractorUsedThisTurn` (sorted unit IDs of the active seat's turn, emptied
  at its End Turn, pruned by `prunedMartianV7`) and their view copies for
  visible units; `UNIT_PULLED.path`; no command or event kind is new.
- **Registry.** The role mechanic `heavyTractorBeam` tells the Mothership's
  free, longer pull from the Saucer's; `coverBonusV7` is the one cover
  multiplier (terrain × 1.5, else Snow × 1.25) read by the combat
  resolution, the public combat preview, Wail, the unit stats, and the
  Normal AI's estimate; Glide's both-ends cost is in the two movement
  validators (canonical and public) and in the AI's reach estimate.
- **Queries.** `previewTractorBeamV7` gains `path`, and
  `queryTractorBeamPathV7` returns it without the full command query.
- **Presentation until the UI step.** The dock's buttons and pickers are
  driven by the offered commands, so a Saucer's Tractor Beam, a
  Mothership's Beam Down, a pick-up passenger, and the Mothership's pull
  after its attack are all reachable now; the texts of
  `src/render/martian-presentation-v7.ts` and
  `src/render/ice-folk-presentation-v7.ts` quote the new rules. The
  two-tile path in the aiming panel, a per-unit Tractor Beam tooltip, and
  the rest of the design's section 11 belong to `pulp_wars-1wy.5`; the
  Normal AI's use of the new tools to `pulp_wars-1wy.4`.

## Candy engine boundary (`pulp_wars-jdb.3`)

`pulp-wars-poc-7r38` implements the engine step of the
[Candy overlay](../product/RULESET_7_CANDY.md), folded by `pulp_wars-jdb.8`
into
[current rules section 23](../product/RULESET_7_CURRENT.md#23-candy-faction-rules).
The UI step (`pulp_wars-jdb.6`) has since replaced the stand-in
presentation of the last item below.

- **Modules.** `src/engine/v7/candy.ts` holds the predicates and derived
  facts, which take the roster (a state or a view) and plain unit facts:
  `sugarRushRejectionV7`, `sugarRushMoveBonusV7`, `sugarRushAttack2V7`,
  `overrunKindV7` and `overrunMayContinueV7` (the Sugar Frenzy cap),
  `attackGrantsEscapeV7`, `attackSplatsV7`, `unitBouncesV7`,
  `attackIsBouncedV7`, `bounceDestinationV7`, `deathLeavesCrumbsV7`,
  `unitEatsCrumbsV7`, `peppermintHitV7`, `crumbsBiteV7`,
  `homeSweetHomeSparesV7`, `candyActionRejectionV7`,
  `sugarTossTargetRejectionV7`, and `rebakeCrumbsV7`.
  `src/engine/v7/candy-reducer.ts` holds the three commands
  (`applySugarRushV7`, `applyRebakeV7`, `applySugarTossV7`), the eating step
  of a Move or a landing (`resolveCrumbsEatingV7`), the End Turn step
  (`resolveCandyEndTurnV7`), and the list pruning (`prunedCandyV7`). The
  reducer and the public command query call the same predicates and differ
  only in how they read the tile (the canonical board, or the view's
  explored tiles: the Re-bake tile and the Bounce destination), so an
  offered command is an accepted one and a preview equals its resolution.
- **Crumbs are folded from events.** A death site only emits `CRUMBS_LEFT`
  (`recordCrumbsV7` in `graves.ts`, called wherever a death records its
  Grave, and the Shatter path directly); `applyCommandV7` folds the
  `CRUMBS_LEFT` events of an accepted command into `state.crumbs`
  (`withCrumbsLeftV7`), the precedent of the Monster's provocation list. No
  death site writes the list.
- **State, view, events.** `GameStateV7.sugarRush`, `crumbs`,
  `splattedThisTurn`, and `tossedThisTurn` and their view copies (visible
  units, explored tiles; a view's Crumbs carry their owner's public
  `bite`). Three commands, seven events, the `UNIT_DIED` cause
  `PEPPERMINT`, four combat-preview fields, and the no-retaliation reason
  `SPLATTED`; Bounce reuses `UNIT_PUSHED`.
- **Registry.** The abilities `SUGAR_RUSH`, `BOUNCE`, `SPLAT`, `REBAKE`, and
  `SUGAR_TOSS`, the role mechanics `rushPerk` and `leavesCrumbs`, the
  capabilities `homeSweetHome` and `crumbsBite`, and `REBAKE` in
  `MIND_CONTROLLED_LOST_ABILITIES_V7`.
- **Queries.** `previewSugarRushV7`, `previewRebakeV7`,
  `previewSugarTossV7`, and `previewCrumbsEatV7`; the public unit stats'
  `rushed`, `crashed`, `splatted`, and `tossedThisTurn` flags (present only
  in a match with a Candy seat) and `candy` block, and the `SUGAR_RUSH`
  source of the Attack row.
- **Presentation.** `src/render/dom/app-view-v7.ts` offers
  the Candy in the setup select (cotton-candy pink `#ffb8d8` in
  `FACTION_COLOURS_V7`) and draws its units, portraits, cities, and ships
  with the `pulp_wars-jdb.5` art (`unitArtSubjectV7`, `portraitSubjectV7`,
  `cityArtSubjectV7`, and the generic naval wiring; both Candy manifests
  are in the live direction registry, and a raster that fails falls back
  to the Human art with no Candy badge). The engine bead showed the three
  commands as plain dock buttons. The UI bead (`pulp_wars-jdb.6`) added the
  Candy interface: `src/render/candy-presentation-v7.ts` (the labels,
  chips, unavailable reasons, preview lines, Help sentences, technology
  text, and log lines; it reads the view with the engine's shared
  predicates and decides no legality),
  `src/render/canvas/candy-board-plan-v7.ts` (the Rushed, Crashed,
  Splatted, and Home Sweet Home markers, the Crumbs tokens, the Sugar Rush,
  Re-bake, and Sugar Toss aiming, and the attack lines),
  `candy-canvas-v7.ts` (the marker drawing), and `candy-effects-v7.ts` (the
  cues, including the end of a Crash, which has no event and is read from
  the two views of the boundary). `npm run review:ruleset7-candy-ui`
  captures them on the fixtures of `tests/fixtures/v7-candy-ui.ts`, and the
  browser smoke has a Candy step (`scripts/browser-smoke-v7-candy.ts`). The
  faction emblem is registered and not drawn, and the Classic and LEGACY
  looks draw Candy units as Human sprites with no badge
  (`pulp_wars-jdb.9`). The Gallery shows the Candy column with the art and
  plays Sugar Rush, Re-bake, and Sugar Toss on its demo board.

## Naval branch boundary (`pulp_wars-5ti.2` and `5ti.3`)

`pulp-wars-poc-7r43` and `pulp-wars-poc-7r44` implement the two engine
steps of the [naval branch overlay](../product/RULESET_7_NAVAL_BRANCH.md),
folded by `pulp_wars-5ti.9` into
[current rules section 14](../product/RULESET_7_CURRENT.md#14-naval-rules)
(the Submarine, the Ram, Board, Harbours) and
[section 21.16](../product/RULESET_7_CURRENT.md#2116-the-frozen-sea) (the
Ice Folk frozen sea). The interface (`pulp_wars-5ti.7`) and the art
(`pulp_wars-5ti.6`) are live.

- **Modules.** `src/engine/v7/naval-branch.ts` holds the Board target rule
  (`boardTargetBlockV7`), shared by the `BOARD` command and the public
  command query. `src/engine/v7/ice.ts` holds the ice reads (`iceAtV7`,
  `iceIndexSetV7`, `iceIsPermanentV7`), the slide and slip predicates
  (`unitSlidesV7`, `unitKindWalksIceV7`), the Freeze set (`freezeSetV7`,
  called with the canonical board by the reducer and with the view's
  explored tiles by the query, so a preview equals its resolution), and
  the Start and End Turn steps (`resolveBlackIceV7`, `resolveIceCrushV7`,
  `resolveThawV7`). The registry (`src/engine/rules/ruleset-v7.ts`) holds
  the helpers every layer shares: `attackIsRamV7`, `attackIsTorpedoV7`,
  `unitIsSubmergedV7`, `boardableAtV7`, `boardedHpV7`, `dockPopulationV7`,
  `isIceAtV7`, and `unitIsIceboundV7`. The slide itself is part of the
  movement validation in `movement.ts` (the canonical one and its public
  twin).
- **The ice list is never cached across commands.** It changes in the
  middle of a turn (a Freeze), is read once per `MOVE` from the state
  before the command, and is empty in a match without an Ice Folk seat,
  where every helper returns the neutral answer.
- **State, view, events.** `GameStateV7.ice` and `PlayerViewV7.ice` (the
  entries on tiles the viewer has explored, each with `permanent`); the
  commands `BOARD` and `FREEZE`; the events `SHIP_BOARDED`,
  `WATER_FROZEN`, `ICE_MELTED`, and `UNITS_CRUSHED`; the `UNIT_DIED` cause
  `CRUSHED`; the combat-preview fields `ram`, `torpedo`, `iceCover`, and
  `icebound`. A boarded ship changes owner in place, so every reader of a
  ship resolves its faction through its current owner (`unitFactionV7`).
- **Queries.** `previewBoardV7` and `previewFreezeV7`; the public unit
  stats' `submerged`, `boardableAt`, and `icebound`, and the `iceFolk`
  block's `onIce`, `slides`, and `iceCover`.
- **Presentation.** `src/render/naval-presentation-v7.ts` (the words of
  Board, the Bow Ram, the Submarine, and Harbours),
  `src/render/canvas/naval-board-plan-v7.ts` (the Board aiming, the hook
  badges, the shove preview, the Submarine markers), and
  `naval-canvas-v7.ts`; `src/render/frozen-sea-presentation-v7.ts` (the
  words of Freeze, the slide, the slip, Icebound, the crush, Black Ice,
  Glacier, and the Ice Folk technology cards),
  `src/render/canvas/frozen-sea-board-plan-v7.ts` (ice cells, the Freeze
  aiming and the Witch's ring, slide arrows, the icebound marker), and
  `frozen-sea-canvas-v7.ts`; `src/assets/sea-ice-v7.ts` cuts the ice tile
  at open water and dusts permanent ice (`seaIceTileV7`), and
  `src/assets/chibi-naval-submarine-art-manifest.ts` registers the faction
  Submarines. The presentation reads the view with the engine's shared
  predicates and public previews and decides no legality. The rules of the
  two aimed actions are in
  [board targeting sections 3.4 and 3.5](../ui/BOARD_TARGETING.md#34-board-the-bow-ram-and-the-submarine-bead-pulp_wars-5ti7),
  the surfaces in the
  [screen flow](../ui/SCREEN_FLOW.md#naval-branch-board-bow-ram-submarine-harbours-bead-pulp_wars-5ti7),
  and the art in
  [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-naval-branch-art-bead-pulp_wars-5ti6).
  Tests: `tests/unit/naval-presentation-render-v7.test.ts`,
  `tests/unit/frozen-sea-presentation-render-v7.test.ts`,
  `tests/integration/ruleset7-naval-dom.test.ts`,
  `tests/integration/ruleset7-frozen-sea-dom.test.ts`, and
  `tests/integration/ruleset7-naval-canvas.test.ts`, on the fixtures of
  `tests/fixtures/v7-naval-ui.ts` and `tests/fixtures/v7-frozen-sea-ui.ts`;
  `npm run smoke:naval-browser` plays both parts in the browser, the
  frozen sea in the current look.
- **Open.** Freeze has no registered action icon and the five Ice Folk
  Naval technology cards show registered ice art as stand-ins
  (`pulp_wars-5ti.10`).

## 0. Ruleset-6 replacement boundary

Ruleset 6 uses `pulp-wars-poc-6` and schema/command/event/save/replay version 6. The ruleset-5 interfaces and examples later in this file are retained only
as historical implementation context. Where an identifier, union, table,
currency, faction rule, or version differs, this section and Ruleset 6 are the
only active authority; code must not merge the two versions.

The dependency direction, renderer separation, strict TypeScript posture,
canonical JSON/SHA-256, Mulberry32, serialized dispatch, local-storage adapter,
Canvas geometry, responsive docks, and performance budgets remain unchanged.
Rules data now owns two explicit faction-tree registrations and may not infer a
tree from a faction label.

```ts
type FactionId = "ORIGINAL" | "CANDY";
type FactionTreeId = "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
type UnitRoleId =
  | "FIGHTER"
  | "SCOUT"
  | "MARKSMAN"
  | "GUARD"
  | "RAIDER"
  | "MEDIC"
  | "HEAVY"
  | "BREACHER"
  | "JUGGERNAUT";

interface MatchSetupV6 {
  readonly rulesetId: "pulp-wars-poc-6";
  readonly seed: number;
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColor;
  readonly factions: readonly FactionId[];
  readonly mapGenerationRevision: "SPATIAL_ECONOMY";
}

interface GameStateV6 {
  readonly schemaVersion: 6;
  readonly rulesetId: "pulp-wars-poc-6";
  readonly setup: MatchSetupV6;
  readonly pendingChoices: readonly PendingChoiceV6[];
  readonly treasureChests: readonly Coord[];
  // retained deterministic turn, board, player, entity, PRNG, and outcome data
}

interface FactionTechnologyTree {
  readonly id: FactionTreeId;
  readonly faction: FactionId;
  readonly startingTechIds: readonly ["GATHERING"];
  readonly nodes: readonly TechnologyNode[]; // all 25, frozen order
  readonly roleRules: Readonly<Record<UnitRoleId, EffectiveRoleRule>>;
}

interface CityStateV6 {
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number; // may be negative; exact derived invariant
  readonly expanded: boolean;
  readonly rewards: readonly CityRewardRecord[];
}

interface TileStateV6 {
  readonly terrain: "GRASS" | "FOREST" | "MOUNTAIN";
  readonly resource:
    "FRUIT" | "GAME" | "FERTILE_GROUND" | "ORE" | "STONE" | null;
  readonly improvement: EconomicImprovementId | null;
  readonly road: boolean;
  readonly territoryCityId: CityId | null;
}
```

`RulesetDefinition.version` is 6 and owns the complete orders/formulas in
Ruleset 6 sections 1–12. Effective half-point stats are integers in half-units.
The kernel invariant recomputes every city's economic population, progress,
Market income, capacity, footprint, processor limits, and building legality
from canonical tile/entity data. Cached values are validated, never trusted.

The v6 `Command` union has the exact kinds and payloads in Ruleset 6 section 12.
The v6 `DomainEvent` union contains the corresponding economic, reward, Heal,
Push, and retained faction/combat facts. Parsers are exhaustive by version:
v6 rejects v5 `stars`, `ANIMAL`, `LUMBER_MILL`, Catapult, old technology IDs,
`ESCAPE_MOVE`, and a singular `pendingChoice`; v5 readers remain diagnostic
only. Stable `RuleError` codes use `INSUFFICIENT_COINS` and the ordered v6
validation tables.

The public boundary adds:

```ts
interface EconomicPreview {
  readonly at: Coord;
  readonly cost: number;
  readonly populationDeltaByCity: readonly CityValueDelta[];
  readonly coinIncomeDeltaByCity: readonly CityValueDelta[];
  readonly contributingTiles: readonly Coord[];
  readonly distinctTypes: readonly string[];
  readonly oppositePairAxes: readonly string[];
  readonly capitalRoadConnected: boolean;
  readonly complete: true;
}

interface PublicRulesApiV6 {
  queryPlayerCommands(view: PlayerViewV6): readonly CommandSummaryV6[];
  previewEconomic(
    view: PlayerViewV6,
    command: EconomicCommandV6,
  ): EconomicPreviewResult;
  previewCombat(
    view: PlayerViewV6,
    attacker: UnitId,
    target: CombatTargetRef,
  ): CombatPreviewV6;
}

interface PublicLeaderboardEntryV6 {
  readonly playerId: PlayerId; // stable public player identity, not EntityId
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColor;
  readonly faction: FactionId;
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly isViewer: boolean;
  readonly cityCount: number;
  readonly livingUnitCount: number;
}

interface PublicUnitStatsV6 {
  readonly unitId: UnitId;
  readonly stats: readonly PublicUnitStatBreakdownV6[];
}

interface PublicUnitStatBreakdownV6 {
  readonly id: "HP" | "ATTACK" | "DEFENSE" | "MOVE" | "RANGE" | "SIGHT";
  readonly current: number | null; // current HP only
  readonly base: PublicUnitStatTermV6;
  readonly modifiers: readonly PublicUnitStatTermV6[];
  readonly total: { readonly numerator: number; readonly denominator: number };
}
```

Technology-hidden v6 resources project as a content-free `UNKNOWN_RESOURCE`
arm even on explored terrain. Game is the exception: it is public on every
explored Forest from match start, while Hunting gates only Hunt Game. The
unknown arm carries no candidate kind or existence bit. Economic preview is
available only for an exact public offered command and is complete;
contributors are sorted `(y,x)`. Combat preview represents hidden-behind Push
as `UNKNOWN_BEHIND_FOG`, which resolves as no Push. Equal `PlayerViewV6` values
must produce byte-identical commands, previews, AI tuples, and selections.
`PlayerViewV6.leaderboard` is projected from authoritative cities and living
units in exact `turnOrder`, not reconstructed from fog-filtered entity arrays.
It contains only stable player/seat presentation identity and the two approved
global totals; it carries no city/unit entity IDs, coordinates, Coins,
technologies, exploration, or other hidden state.

`PlayerViewV6.unitStats` contains one entry for each and only each visible
unit. It is projected by the authority from the same canonical helpers used by
combat and exploration, so the client never recreates modifier formulas. Terms
are exact reduced rationals in fixed HP, Attack, Defense, Move, Range, Sight
order. Active modifiers retain a stable source ID, short source label, and
public explanation. Current HP is paired with the attributed maximum: role
base plus the promotion increase. Charge is the sole Attack modifier; defense
reports the additive difference produced by the canonical greatest-single
multiplier; Surveying high ground is the sole Sight modifier. Roads,
Fieldcraft, and Maneuver affect path legality/cost rather than the unit's Move
allowance and therefore do not fabricate Move terms. Hidden units have neither
an entity nor a stat entry.

Replay and save envelopes use version 6. A v6 save stores the complete ordered
reward queue, exact faction tree IDs, live/cached economic values, Roads,
faction role IDs, and accepted command log. Loading runs parse -> version
selection -> invariant validation (including a full economy recomputation) ->
canonical hash -> atomic install. Recognized v1–v5 data is incompatible and
preserved; no implicit migration exists.

The exact v6 setup parser rejects `scenario`; the ruleset-5 Demo scenario and
Hub action remain historical and have no v6 reconstruction path. It requires
the exact `SPATIAL_ECONOMY` map revision and rejects missing, undefined, old,
or unknown markers.

The active test strategy extends section 11 with all 25 nodes in both faction
registrations, five resource visibility gates, every spatial formula and
recompute trigger, negative population, Market/Road connectivity, every reward
queue boundary, all nine roles/effective Candy mappings, and public preview
equality. New v6 goldens and corpora never overwrite v5 fixtures.

## Historical ruleset-5 architecture detail

The numbered sections below document the implemented v5 client and retained
cross-version infrastructure. Versioned examples are not v6 schemas.

## 1. Architectural constraints

Pulp Wars is a client-only browser application written in strict TypeScript.
Vite supplies development and production builds; Vitest supplies unit,
integration, replay, and headless tests. The development entry point is
`http://localhost:6173`, with Vite configured to fail rather than silently use
another port. There is no application server, database, account, telemetry, or
required network request after static files load.

The authoritative game is a deterministic, renderer-independent command/state/
event engine. Canvas 2D projects and draws the map. Semantic HTML and CSS render
screens, menus, dialogs, HUD, and accessible alternatives. Neither renderer nor
DOM decides game legality, randomness, AI behavior, damage, capture, income, or
victory.

Required compiler posture:

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, and
  `useUnknownInCatchVariables` enabled;
- no `any` in simulation, persistence, AI, or command boundaries;
- browser and headless tests import the same engine package;
- ruleset data is immutable at runtime and referenced by a versioned ID.

## 2. Dependency direction

```text
rules data <--- simulation <--- AI
                    ^            ^
                    |            |
             application controller
               /        |        \
       persistence   Canvas map   DOM UI
                         |
                   art manifest
```

Arrows mean “may import.” Simulation imports rules data and deterministic
utilities only. It cannot import Canvas, DOM, browser storage, audio, time,
animation, device-pixel ratio, CSS dimensions, or application controllers. AI
uses a filtered player view and public command-query API; it never receives
authoritative hidden state.

## 3. Suggested module boundary

```text
src/
  app/             route/screen state, match controller, input coordination
  engine/
    commands/      command schemas, validation, reducer
    model/         serializable state and IDs
    rules/         ruleset tables and pure calculations
    map/           deterministic generation and invariants
    combat/        preview and resolution
    fog/           player-view projection
    events/        domain event contracts
    replay/        canonicalization, hashing, replay runner
    random/        PRNG and seed conversion
  ai/              candidate enumeration and deterministic policy
  headless/        public non-DOM runner
  render/
    canvas/        projection, camera, layers, picking, animation
    dom/           semantic screens, panels, dialogs, HUD
  persistence/     save/settings repositories and migrations
  assets/          typed art manifest; no gameplay constants
  styles/          tokens, responsive layout, reduced-motion behavior
tests/
  fixtures/        versioned setup/command/hash golden cases
  unit/            pure rule tests
  integration/     complete turn and match slices
  replay/          browser/headless parity and determinism
```

Imports across these boundaries go through each directory's public index. UI
may depend on read models and command types, not mutable engine internals.

## 4. Core illustrative contracts

These interfaces illustrate required information and ownership. Exact source
layout may change, but implementations must preserve their semantics. All IDs
are branded decimal integers serialized as JSON numbers; `EntityId` allocation
is monotonic and IDs are never reused.

```ts
type PlayerId = number & { readonly __brand: "PlayerId" };
type CityId = number & { readonly __brand: "CityId" };
type UnitId = number & { readonly __brand: "UnitId" };
type WallId = number & { readonly __brand: "WallId" };
type EntityId = CityId | UnitId | WallId;
type FactionId = "ORIGINAL" | "CANDY";
type CardinalDirection = "NORTH" | "EAST" | "SOUTH" | "WEST";

interface Coord {
  readonly x: number;
  readonly y: number;
}

interface MatchSetup {
  readonly rulesetId: "pulp-wars-poc-5";
  readonly seed: number; // uint32
  readonly width: 11 | 14 | 16 | 20 | 25;
  readonly height: 11 | 14 | 16 | 20 | 25;
  readonly aiCount: 1 | 2 | 3;
  readonly aiDifficulty: "NORMAL";
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly humanColor: PlayerColor;
  readonly factions: readonly FactionId[]; // exact seat order, aiCount + 1
  readonly mapGenerationRevision?: "REDUCED_VILLAGES";
  readonly scenario?: "DEMO"; // absent is canonical STANDARD
}

interface GameState {
  readonly schemaVersion: 5;
  readonly rulesetId: "pulp-wars-poc-5";
  readonly setup: MatchSetup;
  readonly random: RandomState;
  readonly humanPlayerId: PlayerId; // immutable diplomatic role in headless too
  readonly nextEntityId: number;
  readonly commandIndex: number;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly board: BoardState;
  readonly players: readonly PlayerState[];
  readonly cities: readonly CityState[];
  readonly units: readonly UnitState[];
  readonly chocolateWalls: readonly ChocolateWallState[];
  readonly pendingChoice: PendingChoice | null;
  readonly outcome: MatchOutcome | null;
}

interface CityState {
  readonly id: CityId;
  readonly level: number; // positive safe integer; no gameplay ceiling
  readonly population: number; // non-negative safe integer below level + 1
  // ownership, position, capital and level-2/3 reward fields omitted here
}

interface PlayerState {
  readonly faction: FactionId; // equals setup.factions[seat]
  // retained v4 player fields omitted here
}

interface UnitActivation {
  readonly moved: boolean;
  readonly attacked: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly handled: boolean;
  readonly escapeAvailable: boolean;
  readonly specialActed: boolean; // v5 wall-build terminal action; reset each turn
}

interface UnitState {
  readonly id: UnitId;
  readonly homeCityId: CityId | null;
  readonly capacityExempt: boolean;
  readonly activation: UnitActivation;
  // owner, type, position, health, kills and veterancy omitted here
}

interface ChocolateWallState {
  readonly id: WallId;
  readonly ownerId: PlayerId;
  readonly at: Coord;
  readonly hp: number; // 1..10 while present
}

type PendingChoice =
  | {
      readonly kind: "CITY_REWARD";
      readonly cityId: CityId;
      readonly level: 2 | 3;
    }
  | {
      readonly kind: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[]; // ascending, length >= 2
    };

type CombatTargetRef =
  | { readonly kind: "UNIT"; readonly unitId: UnitId }
  | { readonly kind: "CHOCOLATE_WALL"; readonly wallId: WallId };

interface CombatPreview {
  readonly attackerId: UnitId;
  readonly target: CombatTargetRef;
  readonly damageToDefender: number;
  readonly damageToAttacker: number;
  readonly defenderDies: boolean;
  readonly attackerDies: boolean;
  readonly advances: boolean;
  readonly noRetaliationReason:
    | "DEFENDER_DIED"
    | "OUT_OF_RANGE"
    | "ATTACKER_UNEXPLORED"
    | "STRUCTURE"
    | null;
}

type MatchOutcome =
  | { readonly kind: "VICTORY"; readonly winnerId: PlayerId }
  | {
      readonly kind: "DEFEAT";
      readonly humanId: PlayerId;
      readonly defeatedByPlayerId: PlayerId;
    }
  | { readonly kind: "HEADLESS_VICTORY"; readonly winnerId: PlayerId };

type Command =
  | { readonly kind: "RESEARCH"; readonly tech: TechId }
  | { readonly kind: "HARVEST_FRUIT"; readonly at: Coord }
  | { readonly kind: "HUNT_ANIMAL"; readonly at: Coord }
  | { readonly kind: "BUILD_LUMBER_MILL"; readonly at: Coord }
  | { readonly kind: "BUILD_MINE"; readonly at: Coord }
  | { readonly kind: "TRAIN"; readonly cityId: CityId; readonly unit: UnitType }
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly target: CombatTargetRef;
    }
  | {
      readonly kind: "ESCAPE_MOVE";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | { readonly kind: "RECOVER"; readonly unitId: UnitId }
  | { readonly kind: "WAIT"; readonly unitId: UnitId }
  | { readonly kind: "PROMOTE"; readonly unitId: UnitId }
  | { readonly kind: "CAPTURE"; readonly unitId: UnitId }
  | {
      readonly kind: "KAMIKAZE_ROLL";
      readonly unitId: UnitId;
      readonly direction: CardinalDirection;
    }
  | {
      readonly kind: "BUILD_CHOCOLATE_WALL";
      readonly unitId: UnitId;
      readonly at: Coord;
    }
  | { readonly kind: "CANDIFY"; readonly unitId: UnitId }
  | {
      readonly kind: "CHOOSE_CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly cityId: CityId;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reward: RewardId;
    }
  | { readonly kind: "END_TURN" };

type CreateResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | { readonly ok: false; readonly error: RuleError };

type ApplyResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly error: RuleError;
    };

interface SimulationApi {
  create(setup: MatchSetup): CreateResult;
  apply(state: GameState, command: Command): ApplyResult;
  legalCommands(state: GameState, actor: PlayerId): readonly CommandSummary[];
  previewCombat(
    state: GameState,
    attacker: UnitId,
    target: CombatTargetRef,
  ): CombatPreviewResult;
  viewFor(state: GameState, viewer: PlayerId): PlayerView;
}
```

Ruleset 5 retains `TileState.terrain` as
`"GRASS" | "MOUNTAIN" | "FOREST"`, `resource` as
`"FRUIT" | "ORE" | "ANIMAL" | null`, and `improvement` as
`"MINE" | "LUMBER_MILL" | null`. The exhaustive invariant accepts only the
terrain/resource/improvement combinations in POC Rules section 0.9. These are
authoritative values; renderers must not infer content from variants or pixels.

`RulesetDefinition.version` is 5 and owns Fruit `(2,1)`, Animal `(2,1)`,
Lumber Mill `(3,1)`, and Mine `(5,2)` cost/population pairs. It also owns the
frozen faction, technology, archetype, command-kind, direction, terrain,
resource, and improvement ordinals plus faction-specific effective unit rules.
Map validation owns the exact failures from POC Rules section 0.11.
The kernel adds `HUNTING_REQUIRED`, `ANIMAL_INVALID_TILE`,
`FORESTRY_REQUIRED`, and `LUMBER_MILL_INVALID_TILE` to the retained resource
errors. `CITY_AT_MAX_LEVEL` is not a v5
error because city growth is uncapped; `INTEGER_OVERFLOW` atomically guards the
safe-integer serialization boundary without imposing a gameplay level cap.

Chocolate Walls live in their own sorted collection and their occupancy is
joined with units only in movement/target queries. Combat accepts the exhaustive
`CombatTargetRef`; no numeric ID is cast between branded entity classes.
Territory ownership remains normalized on `TileState.territoryCityId`, so
Candify and city capture share one source of truth. The kernel invariant checks
one owner city per controlled tile, a city at its own center, and eight-way
connectivity from every assigned tile to that center.

`legalCommands(GameState, actor)` and authoritative `previewCombat` are kernel
and test surfaces. Observation-limited callers use `viewFor` followed by
`queryPlayerCommands(PlayerView)` and the public combat estimate. AI and UI must
not pass authoritative state into a query. The filtered query is intentionally
a pure function of `PlayerView`, including optimistic blind movement, so equal
views always expose equal candidates.

`PlayerView.commandIndex` is observation-safe transition metadata. Presentation
code may use it only to invalidate ephemeral state at an accepted-command
boundary, such as a pending same-coordinate inspection cycle; it conveys no
hidden board or entity data. Harmless rerenders retain the same value. Canvas
occupancy, selection, and disappearance checks still use only the visible
entities and explored tiles in `PlayerView`.

`PlayerViewV6.treasureChests` is an explicit globally public coordinate list,
including coordinates whose tile arm remains fogged. Public movement treats a
chest as non-blocking; the reducer alone draws and resolves its reward after an
accepted Move. The Canvas plan may therefore draw `FOG` and `TREASURE` for one
coordinate without reconstructing terrain, and removes the chest from the
post-command snapshot before presenting the unit slide. Reward fields enter
presentation only through the exact `TREASURE_CAPTURED` event.

Territory-themed map art is a cosmetic projection of that same public view.
For every explored tile, Canvas resolves `PlayerTileView.territoryOwnerId`
through `PlayerView.players` and selects the owning faction's accepted terrain
and resource family. It must not infer ownership by locating a visible city:
the owner remains public when the controlling city center is unexplored and
`territoryCityId`/`territoryCenter` are withheld. Hidden and diplomatic-only
tile arms contain no owner, so their render plans contain only fog and cannot
disclose faction art. Visible city art independently uses the visible city's
public `ownerId`. These choices are renderer-only: capture and Candify swap art
on the next `PlayerView` without changing terrain/resources, cosmetic variant
selection, canonical state, saves, replays, PRNG, geometry, sorting, or picking.

V5 `PlayerView` exposes owned-city `assignedCounted` and `assignedExempt`
totals, plus each visible unit's public handled state and capacity-exemption
status when owned by the viewer. It also exposes the public immutable
`humanPlayerId`, every public player's faction, and explored Chocolate Walls;
external headless controller choice never changes those fields.
Rival city views omit assignment totals. In
cooperative mode, an AI view may mark an otherwise unexplored coordinate only
as `diplomaticBlock: "ALLIED_TERRITORY"`; that union arm contains no terrain,
site, resource, improvement, city, unit, wall, or controlling-player identity. Human and
rival-mode views never receive it. Public queries use the marker solely to
exclude Move/Escape/reveal paths and must remain pure for equal views.

Rejected commands return the identical state object, emit no domain events,
consume no random number, do not increment `commandIndex`, and are never saved
to the replay log. Rule errors are stable codes plus safe parameters, never
localized prose.

Events describe completed domain facts, not animation instructions:

```ts
type DomainEvent =
  | {
      readonly kind: "TURN_STARTED";
      readonly playerId: PlayerId;
      readonly income: number;
    }
  | {
      readonly kind: "UNIT_MOVED";
      readonly unitId: UnitId;
      readonly path: readonly Coord[];
    }
  | {
      readonly kind: "UNIT_WAITED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
    }
  | {
      readonly kind: "TILES_REVEALED";
      readonly playerId: PlayerId;
      readonly tiles: readonly Coord[];
    }
  | {
      readonly kind: "DONUT_ROLL_STEP";
      readonly unitId: UnitId;
      readonly at: Coord;
    }
  | {
      readonly kind: "ROLL_DAMAGE_RESOLVED";
      readonly sourceUnitId: UnitId;
      readonly target: CombatTargetRef;
      readonly at: Coord;
      readonly damage: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_BUILT";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly wallId: WallId;
      readonly at: Coord;
      readonly cost: 1;
      readonly hp: 10;
    }
  | {
      readonly kind: "CHOCOLATE_WALL_DESTROYED";
      readonly wallId: WallId;
      readonly ownerId: PlayerId;
      readonly at: Coord;
      readonly cause: "ATTACK" | "KAMIKAZE_ROLL";
    }
  | {
      readonly kind: "CANDIFY_CITY_CHOICE_REQUIRED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | {
      readonly kind: "TILE_CANDIFIED";
      readonly playerId: PlayerId;
      readonly unitId: UnitId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly previousCityId: CityId | null;
      readonly previousOwnerId: PlayerId | null;
    }
  | {
      readonly kind: "FRUIT_HARVESTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "ANIMAL_HUNTED";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 2;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "LUMBER_MILL_BUILT";
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly at: Coord;
      readonly cost: 3;
      readonly populationAdded: 1;
    }
  | {
      readonly kind: "CITY_LEVELED_UP";
      readonly cityId: CityId;
      readonly level: number; // reached positive safe integer
    }
  | { readonly kind: "COMBAT_RESOLVED"; readonly preview: CombatPreview }
  | {
      readonly kind: "UNIT_DIED";
      readonly unitId: UnitId;
      readonly cause:
        | "ATTACK"
        | "RETALIATION"
        | "ELIMINATION"
        | "KAMIKAZE_ROLL"
        | "KAMIKAZE_ROLL_SELF"
        | "CANDIFY";
    }
  | {
      readonly kind: "CITY_CAPTURED";
      readonly cityId: CityId;
      readonly from: PlayerId | null;
      readonly to: PlayerId;
    }
  | { readonly kind: "PLAYER_ELIMINATED"; readonly playerId: PlayerId }
  | { readonly kind: "MATCH_ENDED"; readonly outcome: MatchOutcome };
```

Event arrays are already in authoritative presentation order. Renderers may
coalesce or skip animations, but cannot reorder events for replay or state.

## 5. Command transaction and application control

Every accepted command is one atomic transition:

1. parse an untrusted UI/replay payload into a typed command;
2. validate actor, phase, ownership, targets, costs, prerequisites, and path;
3. calculate all effects from the pre-command state;
4. apply effects in documented stable order and emit events;
5. run state invariants and victory checks;
6. increment command index; then expose the immutable next state;
7. append command and checkpoint hash to the in-memory log and request autosave.

The application controller serializes dispatch. A second command cannot enter
while one is reducing, while a required city/Candify choice is open, or while AI is
choosing. Visual animation does not lock the engine: it locks human input in the
controller and consumes the already-produced event queue. A Fast Forward action
drains presentation immediately without changing state transitions.

The DOM consumes every controller snapshot emitted during a human dispatch but
coalesces its transitioning, accepted-state, and settled notifications into one
render after the dispatch result is available. That render installs the accepted
post-command view and its movement/combat presentation together. It must not
remount and redraw the complete Canvas once per intermediate notification: on a
large board that presentation-only churn delays the first animation frame even
though validation and reduction have already completed. Rejected commands never
install a presentation, and controller serialization remains the input lock.
For an accepted visible Move, the DOM updates the already-mounted board with the
post-command view and movement presentation before rebuilding surrounding HUD
chrome; the action dock is replaced with its locked Movement status in place.
The host schedules that movement before any redundant zero-progress redraw; the
previous accepted frame already contains the authoritative origin. The normal
shell render resumes when the slide completes.

## 6. Determinism, PRNG, and canonical data

### 6.1 Seed conversion and PRNG

UI text-to-seed conversion follows the FNV-1a rule in the product spec. FNV
operates on UTF-8 bytes with initial value `2166136261`; for each byte XOR then
multiply by `16777619`, retaining the low 32 bits with `Math.imul`. The resulting
unsigned integer may be zero.

The engine uses **Mulberry32** with one serialized `uint32` state. For each draw:

```text
state = (state + 0x6D2B79F5) mod 2^32
z = state
z = imul(z xor (z >>> 15), z | 1)
z = z xor (z + imul(z xor (z >>> 7), z | 61))
result = (z xor (z >>> 14)) >>> 0
```

Only `nextUint32()` is primitive. A bounded draw `n` uses rejection sampling:
set `threshold = 2^32 mod n`, reject results below `threshold`, then return
`result mod n`. This avoids modulo bias. `n` must be an integer in `[1, 2^32]`.
Do not derive rule randomness from floats.

Each PRNG draw has one named call site. Candidate collections are sorted before
sampling. Adding visual effects cannot add draws. State stores the post-draw
PRNG state, so saves resume at the exact stream position.

### 6.2 Canonical serialization and hash

Authoritative values are JSON-compatible: null, booleans, strings, safe
integers, and arrays/objects containing them. No `undefined`, `NaN`, infinity,
Date, Map, Set, BigInt, class instance, cyclic reference, or floating rule
value enters state. Coordinates, entity collections, revealed tiles, and events
use specified sorted arrays rather than object iteration order.

Canonical JSON uses UTF-8, no insignificant whitespace, JSON escaping, object
keys sorted by Unicode code-point order, and arrays in semantic order. Hashes
are lowercase hexadecimal SHA-256 of canonical UTF-8 bytes. The hashed state
excludes camera, animation, audio, localization, focus, and settings. A shared
canonicalizer must be used in browser and headless paths.

## 7. Replay and headless API

```ts
interface ReplayFile {
  readonly format: "pulp-wars-replay";
  readonly version: 5;
  readonly setup: MatchSetup;
  readonly commands: readonly Command[];
  readonly checkpoints: readonly { index: number; stateHash: string }[];
}

interface HeadlessResult {
  readonly outcome: MatchOutcome | null;
  readonly acceptedCommands: number;
  readonly state: GameState;
  readonly stateHash: string;
  readonly events: readonly DomainEvent[];
}

interface HeadlessApi {
  run(
    replay: ReplayFile,
    options?: { readonly stopAfter?: number },
  ): Promise<HeadlessResult>;
  runAiMatch(setup: MatchSetup, maxCommands: number): Promise<HeadlessResult>;
}
```

`run` fails on schema errors, rejected commands, checkpoint mismatch, or a
command after match end. `runAiMatch` is a soak-test surface; the command limit
prevents an infinite match. Headless code has no DOM shims and no Canvas import.
Golden fixtures record setup, commands, ordered events, and final hash.

`scenario: "DEMO"` is a first-class creation discriminator. The engine applies
its pure deterministic transform after ordinary map/player/entity creation and
before the ordinary opening Start Turn. It consumes no PRNG draw. Replay,
autosave, load, restart, browser, and headless all call the same `createGame`
path. Exact setup parsers accept the nine base fields, an optional standard-only
`mapGenerationRevision: "REDUCED_VILLAGES"`, or the base fields plus the one
valid DEMO discriminator. An absent map revision remains absent and selects the
historical v5 village tables; no default is injected while parsing or loading.
They reject unknown marker values, marker `undefined`, extra fields, unsupported
sizes, invalid/wrong-length/sparse faction arrays, a marked Demo, and a
non-rival or non-Original Demo. New STANDARD writers omit `scenario` and emit
the revision marker. Every setup writes its exact seat-ordered `factions`; Demo
requires three Original entries and remains unmarked for golden compatibility.

## 8. Renderer and input boundary

The renderer owns configurable projection and display dimensions. The simulation
stores only grid coordinates. Default projection and asset contracts live in
[terrain tiles](../art/classes/terrain-tiles.md), [units](../art/classes/units.md),
and [buildings](../art/classes/buildings.md).

The active experiment is the axis-aligned
[128 x 128 square presentation](../art/SQUARE_GRID_EXPERIMENT.md): logical x
projects right, logical y projects down, inverse input covers the complete
square, ties choose the lowest row then column, and body depth is row-major.
This replaces only Canvas geometry. Engine coordinates, adjacency, legality,
commands, AI, persistence, replay, and headless hashes remain unchanged.

Large and Huge boards start at minimum zoom centered on the human capital when
the whole board cannot fit. Pan, wheel/pinch, keyboard and explicit zoom
controls remain camera-only and must retain tall-sprite overhang.

A new match (and an art-set switch) frames the camera at the fitted zoom in
the visible map region: the canvas width by the band between the top HUD's
bottom and the open dock's top. With no dock open, compact layouts (800 CSS
px and narrower) reserve the stacked dock's height, published as the board
host's `scroll-padding-bottom`, so the start view sits above where the dock
opens. On each axis the viewer's explored cells are centred when they fit
the region, else the capital; the camera then slides the least distance
that keeps a board that fits wholly inside the region, or leaves no empty
off-board margin in the region when the board is larger
(`frameCameraOnArea`). Both art sets frame this way. Framing only sets the
starting camera: opening a dock never moves it, and pan and zoom stay
unclamped.

Canvas 2D responsibilities:

- camera pan/zoom, device-pixel-ratio backing size, grid projection, stable draw
  sorting, fog treatment, highlights, hit testing, and map animation;
- redraw on state/event/camera changes, not as an unconstrained rule loop;
- resolve pointer coordinates to logical tiles, then ask the engine for legal
  commands; never infer legality from pixels or alpha.

Semantic DOM responsibilities:

- all menus, setup fields, HUD text, panels, technology tree, stats, dialogs,
  settings, AI progress, and end screens;
- non-modal selected-tile, selected-unit, and selected-city bottom docks with
  accessible descriptions and explicit exact action buttons so Canvas is not
  the only source of game information;
- focus management, keyboard controls, labels, errors, and live announcements.

An exact contextual command whose target is already fixed by the current
selection dispatches from its semantic button in one activation. The client
must not convert deterministic tile economy commands into Canvas target modes,
confirmation clicks, or choice dialogs. Additional confirmation or choice
steps exist only when explicitly required by product direction; Move, Attack,
and genuinely unresolved spatial targets remain map-driven.

The Canvas host owns one ephemeral inspection-activation cycle keyed by visible
coordinate and unit ID. Pointer, touch, keyboard, and semantic coordinate
activation enter the same resolver. Exact offered Move, EscapeMove, or Attack
commands retain priority and dispatch on that one activation; there is no staged
path/combat confirmation state. Other explored unit coordinates alternate unit
then visible underlying city/tile. Match identity, `PlayerView.commandIndex`,
Escape, coordinate changes, or visible-entity disappearance invalidate the
cycle, while redraws and DOM remounts do not.

Selected-unit identity is ephemeral presentation state shared by the semantic
dock and Canvas render model. A visible unit selection never enters
`MatchOverlay`; therefore it cannot create a backdrop, claim modal focus, or
disable map camera/target input. Every dock rerender filters
`queryPlayerCommands(PlayerView)` by the exact selected owned `unitId`; direct
Capture, Recover, Promote, and Wait commands are dispatched through the normal
exact revalidation boundary, while Move, Attack, and Escape remain
one-activation spatial Canvas commands. The dock identity resolves the exact
owner-faction role through the accepted world-sprite coverage registry and
places compact role/HP text beside it; it does not substitute a training
portrait. Highlighted attack targets carry their
exact public combat preview visually and semantically before activation.

A transition from any other selection to a visible unit starts one renderer-
owned selection jump through that same shared selection boundary, including
pointer, touch, Enter/Space, direct semantic-unit, and semantic-coordinate
activation. Full/Normal motion moves only that unit raster through a 240 ms
half-sine, from its ground anchor to a 12 nominal-CSS-pixel apex and exactly
back; Fast uses the same geometry in 120 ms. Camera zoom scales the visual
offset. The ground/contact anchor, owner cue, health/status layer, selection
diamond, picking, draw order, camera, commands, state, and hash never move.
Selecting the already-selected same unit does not restart it; selecting a
different unit does. Selection clear/change, disappearance, combat/ability
presentation, match/route replacement, remount, and destroy cancel it. Reduced
motion draws the ordinary selected frame, applies no offset, and schedules no
selection-jump RAF.

Candy unit docks additionally filter exact `KAMIKAZE_ROLL`,
`BUILD_CHOCOLATE_WALL`, and `CANDIFY` summaries for that unit. Roll enters one
ephemeral cardinal-direction target state; Build enters one ephemeral exact-cell
target state. One highlighted cell activation dispatches without confirmation.
Candify dispatches immediately; only an authoritative `CANDIFY_CITY` pending
choice creates a blocking modal. Escape, command-index change, unit
disappearance, route/match replacement, or another selection cancels targeting.

An explored Chocolate Wall participates in the visible-occupant-first cycle as
a structure after a unit and before the underlying tile. Its non-modal dock
shows owner and HP. A selected attacker highlights an exact wall target only
when the public query offers it; friendly/allied wall attacks receive the same
preview and immediate dispatch as hostile attacks.

Selected-city identity follows the same ephemeral `BoardSelection` path and
never enters `MatchOverlay`. Its render plan derives perimeter segments only
from explored `PlayerTileView` entries whose public `territoryCityId` matches
the visible city; it never consults authoritative fogged tiles. Its compact
dock identity resolves only the visible owner faction and level through the
accepted city coverage registry, with city/capital, level, and population text
beside the art. The semantic
dock filters `queryPlayerCommands(PlayerView)` only to Train commands with that
exact owned `cityId`; it never lists Harvest, Hunt, Lumber, or Mine. Training
controls visibly contain only the exact accepted world-unit art, bare unit name,
and cost. Every contextual raster shares one 112 x 130 CSS-pixel transparent
viewport derived from the standard 256 x 296 unit canvas at 0.25 scale and
1.75 maximum zoom; 176 CSS-pixel controls grow vertically and wrap. Raster
padding and aspect ratio are preserved with `object-fit: contain`, while a
code-native fallback occupies the same accessible framed viewport.
The mandatory city reward remains a dedicated blocking `REWARD` overlay.

Selected-tile identity also stays in `BoardSelection` and never enters
`MatchOverlay`. Its bottom dock identifies the exact public terrain, resource,
improvement/site, territory owner, defense/movement implication, and occupying
entity, then filters exact Harvest Fruit, Hunt Animal, Build Lumber Mill, or
Build Mine commands only for that selected coordinate. It has no backdrop,
focus trap, or hidden-tile look-through. Locked prerequisites may be explained
as text, but only commands returned by the public query render as buttons.
The identity header chooses accepted art in public specificity order—economic
improvement, revealed resource, then terrain—and shows only the corresponding
plain semantic name. It never displays logical coordinates; an unknown resource
falls back to terrain art and language without an existence or type hint.

The match root is a fixed `100dvh` containing a Canvas host whose CSS rectangle
is established by viewport/safe-area changes only. Tile/unit/city docks are
absolutely overlaid above the bottom safe-area inset at inline inset 0 and
z-layer `match-dock`; their natural wrapping may obscure the board. Selection,
dock content, fonts finishing load, and action-row changes must not resize the
host, backing store, or camera. Normal layouts cap the dock at 45dvh and do not
scroll; only when 200% zoom or a 320 CSS px viewport would make required content
unreachable may the dock use `max-block-size: calc(100dvh - topHudBlockSize -
env(safe-area-inset-bottom))` and its own vertical overflow. The map remains
pannable behind every non-modal dock. ResizeObserver callbacks caused only by a
dock are forbidden from entering Canvas resize logic.

The following paragraph describes the historical Ruleset-7 revision-2
implementation. The authoritative revision-3 interaction changes are in
[Ruleset 7](../product/RULESET_7.md#11-domcanvas-interaction-contract) and
supersede conflicting revision-2 content for subsequent implementation.

Ruleset 7 revision 2 keeps the fixed Canvas and non-modal dock layering but
broadens that dock-only overflow exception: compact-width, 200% UI-scale, or a
viewer-safe late-game command set whose natural wrapping would otherwise make
legal actions unreachable may use the bounded vertical scroller. Normal-width
content continues to grow and reflow without horizontal or page scrolling.

Readiness is presentation derived from public activation. A surviving unit
owned by the active human with `handled = false` pulses its actual sprite from
opacity 1 to 0.62 and back, scales it about its feet anchor, and draws a compact
unit-attached silhouette glow over a 1.6-second ease-in-out loop. The glow is
rendered in a reusable destination-local buffer at the Canvas backing scale;
the source silhouette is removed from that buffer before it is composited at
the same destination rectangle. Far-off-canvas shadow offsets are forbidden,
because they do not preserve registration across camera zoom and device-pixel
ratios. Health and owner cues remain steady. Reduced motion leaves the sprite
fully opaque, uses a static attached glow, and schedules no readiness RAF; dock
text and the semantic label say **Needs action**. No detached circle, check,
tick, letter `W`/`R`, or tile badge represents readiness. Wait or any handled
action removes the treatment immediately after the accepted boundary without
disabling remaining actions. Movement and combat presentation suppress it.

All eligible sprites share one presentation phase keyed by match instance,
active player, and the `TURN_STARTED` command boundary: opacity 1 at 0 ms, 0.62
at 800 ms, and 1 at 1,600 ms. Harmless rerenders, selection, dock changes, and
camera changes do not restart it. Resume/reload has no serialized phase and
starts a fresh cycle at opacity 1; this cannot affect rules or hashes.

Ruleset 7 (pulp_wars-q8b) replaces the sprite pulse with a thick attached
silhouette outline in both art sets, so a ready sprite is never faded or
scaled and the city under a garrison stays readable. The sprite silhouette is
dilated into a warm-white band (`#fff6cf`, at least 3 CSS px and 4 CSS px per
unit of sprite scale) with a dark rim (`#2b1a00`) outside it, over a soft gold
aura (`#ffc83d`); the silhouette itself is removed from both layers. Widths
follow the sprite's own display scale (the CHIBI zoom step, or the LEGACY
camera zoom), so the cue stays legible at the smallest zoom. The two layer
rasters are phase-free and cached per sprite size; the shared 1.6-second loop
changes only their composite opacity (aura 0.3 to 1, band 0.88 to 1). Reduced
motion draws one static strong frame. High contrast uses a solid white band
with a thicker black rim at full opacity. The outline is attached to the
sprite, not a detached ring or tile badge. This is the cue of LEGACY and the
CHIBI Classic look; the CHIBI default look draws a static cream ring on the
ground under a ready unit instead (bead `pulp_wars-w5j.3`, see
[Ruleset 7 art sets](#ruleset-7-art-sets)).

`COMBAT_RESOLVED` presentation plans retain public pre/post render snapshots.
When the public attacker archetype is Archer, Full/Normal motion draws a
code-native projectile from its manifest weapon attachment to the target torso
for exactly 280 ms with cubic-out progress, then a 100 ms impact
ring/crossfade; Original uses an arrow and Candy uses a round gumball. Post-combat
HP/death becomes visible at 280 ms. Reduced motion has no travel and one 100 ms
impact crossfade. Fast Forward is immediate. Camera/viewport changes reproject
the logical endpoints; Settings pauses the presentation clock. Match/route or
queue-token replacement and missing public endpoints cancel to the post-event
frame. Cancellation and Fast Forward never modify simulation state or event
order. Catapult does not borrow either Archer projectile primitive.

Roll, Build, and Candify presentations consume only their ordered v5 events.
Roll advances at 90 ms per cell with a 900 ms total cap; Build rises for 180 ms;
Candify washes/dissolves for 240 ms. Reduced motion gives each complete command
one 100 ms crossfade, and Fast Forward installs the final frame immediately.
Path reveal is installed at the corresponding Roll step, never from animation
sampling.

The exhaustive ephemeral state is renderer-owned and never serialized:

```ts
type CombatAnimationState =
  | { readonly kind: "IDLE" }
  | {
      readonly kind: "ARCHER_PROJECTILE";
      readonly queueToken: number;
      readonly commandIndex: number;
      readonly phase: "FLIGHT" | "IMPACT";
      readonly elapsedMs: number; // clamped to 0..280 or 0..100 for phase
      readonly from: Coord;
      readonly to: Coord;
      readonly projectile: "ARROW" | "GUMBALL";
    };
```

Only the presentation clock changes `elapsedMs`/`phase`. Installing a final
frame always returns `IDLE`; a reload begins `IDLE` at the saved accepted state.

CSS custom properties own renderer size tokens and responsive layout. Changing
tile size, zoom, canvas dimensions, or source raster density cannot alter a
state hash.

### Ruleset 7 art sets

Ruleset 7 has two presentation-only art sets. CHIBI, from the
[chibi migration](../art/CHIBI_MIGRATION_PLAN.md), is the default. LEGACY
draws exactly as described above and remains an opt-out until its retirement
(`pulp_wars-67q.13`). The app resolves the art set once at bootstrap
(`src/app/art-set-v7.ts`):

- `?art=legacy` or `?art=chibi` selects that art set and stores it under its
  own `pulpWars.ruleset7.artSet.v1` key, so the shared exact-schema settings
  envelope is unchanged.
- Without a valid parameter, a stored choice applies, so a player who chose
  LEGACY keeps it.
- Otherwise, including unreadable storage or a corrupt stored value, the app
  uses CHIBI and stores nothing.

Views and board hosts constructed directly without an art set, as tests and
review harnesses do, still fall back to LEGACY until the legacy path is
retired. Ruleset 6, rules, commands, saves, replay and hashes never see the
art set.

CHIBI follows [chibi direction](../art/CHIBI_ART_DIRECTION.md) sections 3–4:

- World coordinates keep the 128-unit square projection, so picking, depth
  sorting and code-native overlays are shared. A zoom step `s` sets
  `camera.zoom = s x 80 / 128`, so a cell is exactly 80 CSS px at step 1.
- Zoom is discrete: 0.75, 1, 1.5 and 2. Buttons, `+`/`-`, one wheel notch
  (accumulated trackpad deltas) and pinch move between steps only. Fit to
  board picks the largest step up to 1 that shows the board and never goes
  below 0.75; larger boards pan. The camera offset snaps to whole device
  pixels while drawing.
- Each plan entry carries an art-set-neutral `artSubject` such as
  `UNIT:FIGHTER`, `CITY:2` or `TERRAIN:FOREST`. `src/assets/chibi-art-manifest.ts`
  registers accepted rasters per subject; several entries for one subject
  are coordinate-hashed variants. The class table in `src/assets/chibi-art-v7.ts`
  validates canvas size, anchor and overflow: units, settlements, buildings
  and tall terrain are bottom-centred; terrain fills the cell; resources are
  centred; nothing overflows below its cell.
- A DPR-1 master draws at master size x step with smoothing off. Whole
  device scales use nearest-neighbour from the master or from a manifest
  x2/x3 variant that divides the scale. Fractional scales, such as step
  0.75 on a DPR 2 screen, draw the master smoothed.
- A unit standing on a city or village centre draws through
  `chibiGarrisonDestinationRect`: 0.75 x its normal size, canvas bottom on
  the cell's bottom edge, right edge at the population-pip column (46 world
  units right of the centre), so the settlement stays readable under it
  ([chibi direction](../art/CHIBI_ART_DIRECTION.md#3-geometry-and-resolution)).
  The overlay frame is unchanged; LEGACY draws units on cities as before.
- Tall terrain draws its owning cell in the ground pass, below Roads, and
  its upward overflow in the row-major foreground pass. Cities, units and
  buildings draw in the foreground pass, so upward and side overflow cover
  the rows behind them and are covered by later rows.
- Owned subjects recolour through a checked-in owner mask with the master's
  dimensions: a mask pixel with alpha >= 128 selects an owner pixel, which
  becomes the owner colour scaled by its brightness relative to the key
  colour `#d8262c`. The result is cached per asset, density and owner. There
  is no runtime hue matching. A mask or pixel readback that fails falls back
  to the legacy asset rather than showing the key colour.
- A subject with no registered raster, or whose raster fails to load, draws
  its legacy asset at the chibi geometry. A registered raster that is still
  loading draws nothing, as legacy images do; in the game the look's
  rasters are preloaded, so this state is not reached (see
  [Asset preloading](#asset-preloading-pulp_wars-2yc6)).
- **The default look** of the CHIBI set is the visual direction
  ([VISUAL_DIRECTION_2026-10.md](../art/VISUAL_DIRECTION_2026-10.md)):
  `liveBoardLookV7` (`src/render/canvas/live-board-look-v7.ts`) gives the
  board host `LIVE_DIRECTION_V7` and the direction art registry
  (`chibiDirectionArtRegistryV7`), which the board and the interface
  (`createChibiDomArtV7`'s `preferred`) resolve before the default
  registry; the Classic look developer option and LEGACY get neither. Since
  bead `pulp_wars-w5j.3` (every player plays a different faction) the
  faction's look carries ownership: no base plates (`unit.base: "SHADOW"`,
  a faint neutral ground shadow), the ready cue is a cream ring on the
  ground (`chrome.ready: "GROUND"`, in place of the outline glow described
  above), and every faction's ships, transport and ship portraits are its
  own (`navalArtSubjectV7`: `UNIT:<FACTION>:<ROLE>`, the Humans' shared
  `UNIT:<ROLE>`). A faction's naval subject without a usable raster stands
  in with the classic shared ship in the owner's colour
  (`navalSharedSubjectV7`), never the Human direction ship.
- **Owner colour = faction colour** (bead `pulp_wars-b5f.4`,
  [FACTION_COLOURS.md](../art/FACTION_COLOURS.md)). Every owner colour the
  client draws, in every look and art set, comes from the owner's faction:
  `FACTION_COLOURS_V7`, `factionColourV7` and `playerFactionColourV7` in
  `src/render/canvas/faction-colours-v7.ts`. The board plan's
  `ownerPresentation` (`ownerColor` on every owned entry, territory borders
  included, and `counterpartOwnerColor` on shared borders), the DOM
  view's chibi art in owner areas, and the leaderboard row (`--player`, set
  inline, with `data-faction`) all read it. The engine's seat `color` and
  `setup.humanColor` stay in state, saves and replays but are never shown;
  the setup form offers no colour and sends `CORAL`. `RULESET7_PLAYER_COLORS`
  (`owner-recolour-v7.ts`) keeps the four retired seat colours for the
  recolour tests and the study benches only. In the default look the
  territory border is the only owner colour on the board: `LIVE_DIRECTION_V7`
  sets `city.banner` and `building.flags` to false, so no pennant is drawn on
  a city, a Port or a Shipyard (`drawDirectedFlagV7` and the corner pennant
  remain for the study directions), and a capital gets the stock crown
  (`drawCapitalCrownV7`).

### Asset preloading (`pulp_wars-2yc.6`)

The Ruleset 7 route starts through `bootstrapPreloadedRuleset7App`
(`src/app/v7-preload-boot.ts`), which fetches and decodes the art of the
look in use before it mounts the app. Every screen (title and setup, Resume,
the campaign, a match, the Showcase, the Gallery) is drawn by that app, so a
piece seen for the first time is drawn with its final art in that frame.

- **Inventory.** `assetInventoryV7(look)` in
  `src/assets/asset-inventory-v7.ts` derives the files of a look from the
  manifests the client resolves art from: `CHIBI_ART_ASSETS_V7`, the
  direction registry's `chibiDirectionArtAssetsV7()`, the composed forest
  and mountain sets and the faction grass tiles for the CHIBI set, each
  with its density, owner-mask and layer files, and `ACCEPTED_ART_URLS` for
  LEGACY. Nothing is listed by hand; `preload-inventory-ui-assets-v7.test.ts`
  fails when a manifest module under `src/assets` exports a raster the
  inventory does not cover. Each entry carries a group (`SHARED` or a
  faction); `assetInventoryForFactionsV7` gives the part a match can show.
- **Looks.** `LIVE` (the CHIBI set with the visual direction) contains
  `CLASSIC` (the developer option "Classic look"), because the live look
  draws the default art for shared terrain, icons and effects and as the
  stand-in of a failed direction raster. `LEGACY` is preloaded only when
  `?art=legacy` selects it. The Classic look option asks
  `MountRuleset7AppOptions.ensureLookAssets` before it switches and waits
  for a preload when the other look is not loaded yet (a page started in
  the classic look switching to the live one).
- **One blocking phase.** The whole look, every faction, is preloaded at
  the start (671 files, about 1.4 MB, for `LIVE`): the Gallery and an
  eight-player match show all of them, and the set is small enough that a
  second, background phase would add nothing.
- **Preloader.** `createAssetPreloaderV7` (`src/app/asset-preloader-v7.ts`)
  loads at most 24 rasters at once through an injectable loader (the
  browser's creates an image element and awaits `decode()`), retries a
  failure once, and gives each raster 15 s and the whole preload 30 s. A
  raster that fails is reported once with `console.warn` and left out; the
  game starts regardless, and rasters still in flight when the budget runs
  out reach the store when they arrive.
- **Store.** Decoded rasters go to the page's store
  (`src/render/canvas/preloaded-rasters-v7.ts`).
  `browserChibiRasterEnvironmentV7().loadImage` (the board, the interface,
  the Gallery, the composed forests, massifs and faction grass, the effect
  sprites) and `createBoardImageResolverV7` (legacy assets) ask it first
  and settle synchronously, so the resolvers never report `LOADING` for a
  preloaded raster and the caches derived from it (owner recolours, tones,
  shadows, forest and massif bakes, grass spills, trimmed interface art)
  are built in the frame that first needs them. A URL the store does not
  hold (no preload in tests and the art reviews, a failed preload, a
  legacy stand-in of a subject without CHIBI art) loads on demand exactly
  as before, with its fallback; after the preload such a load is recorded
  (`lazyRasterLoadsV7`, exposed as `lazyAssetLoads()` on the app), and the
  browser smoke fails when a match or the Gallery recorded one.
- **Loading screen.** `mountLoadingScreenV7`
  (`src/render/dom/loading-screen-v7.ts`): an inline crest over a progress
  bar (`role="progressbar"`, label "Loading"), no visible text, no raster.
  It appears only when the preload takes longer than 150 ms, so a warm
  cache never flashes it; the bar's width eases only without
  `prefers-reduced-motion: reduce`.

### Sound (`pulp_wars-2yc.10`)

Sound effects live in `src/audio/` and are described in
[Sound](../ui/SOUND.md). They are presentation only: the engine, the AI, saves
and replays do not import the module or see its preference.

- The DOM view owns one `GameAudioV1` (injectable through
  `MountRuleset7AppOptions.audio`). Importing `src/audio/` or constructing the
  view creates no `AudioContext`; the first user gesture does.
- The board host announces each presentation step as it starts through
  `BoardHostV7.setPresentationStepListener` with a `PresentationStepCueV7`
  (the step, the before and after views, the projected events and the
  animation's time scale). The view maps it with `soundCuesForStepV7`. The
  host does not import the audio module.
- Events without a step are mapped from the accepted boundary by
  `soundCuesForBoundaryV7`.
- Both mappings read only the viewer's views and projected events, so sound
  reveals nothing the board does not show.

## 9. Application and screen state

Navigation is a finite state separate from `GameState`:

```ts
type AppRoute =
  | { readonly name: "SPLASH" }
  | { readonly name: "HUB" }
  | { readonly name: "MODE" }
  | { readonly name: "SETUP"; readonly draft: SetupDraft }
  | { readonly name: "FACTION"; readonly draft: SetupDraft }
  | { readonly name: "MATCH" }
  | { readonly name: "RESULT"; readonly outcome: MatchOutcome };

type MatchOverlay =
  | { readonly name: "NONE" }
  | { readonly name: "TECH" }
  | { readonly name: "STATS" }
  | { readonly name: "SETTINGS" }
  | { readonly name: "REWARD"; readonly cityId: CityId }
  | {
      readonly name: "CANDIFY_CITY";
      readonly unitId: UnitId;
      readonly candidateCityIds: readonly CityId[];
    }
  | { readonly name: "CONFIRM"; readonly action: ConfirmAction };
```

Routes and overlays may be restored from benign UI state, but only GameState
and replay data are authoritative. A reload during animation resumes at the
latest accepted command without trying to recreate animation progress.

## 10. Persistence and versioning

Use browser `localStorage` behind injected repositories for the POC:

- `pulpWars.save.current`: one autosave envelope, maximum 1.5 MiB UTF-8;
- `pulpWars.settings.v1`: display/audio/accessibility settings, maximum 16 KiB.

The save envelope contains format/version, ruleset ID, resolved setup,
authoritative state, PRNG state (also present in state), accepted command log,
command index, canonical state hash, and ISO save timestamp. The timestamp is
metadata excluded from hashes and never enters the simulation. Writes occur
after each accepted command through a coalescing queue; End Turn and page
visibility loss request an immediate flush. `beforeunload` is not treated as a
durable guarantee.

Loading follows parse -> schema validation -> version selection -> invariant
validation -> canonical hash check -> atomic install. Version mismatch has no
implicit best-effort conversion. Explicit pure migrations may be added later
and must have fixture tests. Corrupt/incompatible saves remain untouched until
the user confirms Delete Save; New Match does not silently overwrite a save
until final setup confirmation.

The schema-6 treasure addition has one deliberately narrow persistence-boundary
compatibility rule: a valid version-6 save whose state predates the
`treasureChests` field is hash-checked against its untouched source state, then
normalized in memory to `treasureChests: []` and a new canonical hash. The
strict runtime state parser, replay parser, and new save writer still require
the field; no command or replay history is synthesized, and source bytes are
never rewritten.

Storage is an adapter: unit tests use memory repositories. Storage failure must
not crash an active match. No IndexedDB, cloud sync, cookies, or server storage
is required for the POC.

The faction/dynamic-territory expansion is an intentional compatibility boundary:

| Contract                  | Legacy values | Ruleset 5 active value | Compatibility behavior |
| ------------------------- | ------------: | ---------------------: | ---------------------- |
| Game state schema         |       1/2/3/4 |                      5 | no state migration     |
| Command/event envelope    |       1/2/3/4 |                      5 | exhaustive v5 parser   |
| Replay format             |       1/2/3/4 |                      5 | legacy incompatible    |
| Save envelope             |       1/2/3/4 |                      5 | legacy incompatible    |
| Settings envelope/storage |             1 |                      1 | reused unchanged       |

The loader detects recognized v1-v4 envelopes before attempting v5 state
parsing, returns `INCOMPATIBLE` rather than `CORRUPT`, preserves stored bytes,
and offers deletion/new-match recovery. It never invents seat factions,
synthesizes walls, rewrites Attack targets, or replays legacy commands under
the expanded Normal policy. Tests retain v1-v4 save/replay fixtures for
diagnostics; fresh v5 goldens cover both faction choices in every seat, both AI
modes, all board sizes, Demo, all Candy actions, wall combat, and resume at a
Candify pending choice.

## 11. Testing strategy and quality gates

Vitest suites must cover:

- every table/constant in POC Rules, technology prerequisites and current-city
  costs, income, uncapped Fruit/Animal/Lumber/Mine growth, level-2/3-only rewards, durable
  capacity exemptions, legal over-capacity states, siege, capture, elimination,
  and victory;
- map invariants across at least 1,000 seeds per supported setup, plus fixed
  retry/failure fixtures; coverage asserts exact global Mountain/Forest counts,
  per-terrain resource thresholds, at least two opportunities per settlement,
  observed non-constant settlement mixes, and no out-of-territory resource;
- a targeted Huge corpus of at least 1,000 seeds for each AI count, with a
  deterministic repeat, exact 22-settlement/113-mountain assertions, attempt
  ceiling and recorded wall-clock runtime; the existing 6,000-seed 11/14/16
  corpus remains part of the normal suite; Large covers 1,000 seeds per AI count
  and exactly 15 settlements/72 mountains without changing Auto;
- every unit's movement, Dash/Escape/Fortify behavior, fog interruption, ZOC,
  recovery, Wait/handled monotonicity, promotion, training, and capture lifecycle;
- per-seat faction exact parsing/persistence, roster labels/effective rules,
  Donut four-direction paths and every edge position, path-only reveal, fixed
  friendly/hostile/wall damage and event order, and self-removal;
- Chocolate Wall placement on every allowed terrain/resource/improvement,
  every forbidden occupancy/site/fog/relationship case, movement blocking,
  friendly/allied/hostile attack, zero retaliation/defense, persistence through
  capture/elimination, and no capacity/tally effects;
- Candify unique/nearest/tied city selection, mandatory save/resume choice,
  neutral/hostile annexation, connectivity rejection, chained expansion,
  resource/improvement preservation, capture transfer, and fog-safe views;
- combat rational arithmetic, every half boundary, no-retaliation reasons,
  advance, kill attribution, and preview/resolution identity;
- hidden-state filtering, content-free allied boundary projection, reveal/path
  exclusion, and an assertion that AI cannot import authoritative state types/API;
- identical seed/setup/commands -> byte-identical canonical JSON, event log,
  and hash across repeat runs; save/resume at each command boundary;
- headless/browser engine parity, malformed replay/save rejection, and golden
  replay hashes;
- DOM flow, focus return, dialogs, keyboard action parity, one-activation
  Move/Escape/Attack, Candy direction/build targeting, mandatory Candify city
  choice, tile-only resource controls, readiness/reduced-motion presentation,
  faction setup at 320/600/1024 CSS px, and accessible names;
- Canvas projection/picking at min/default/max zoom and high device pixel ratio.

Property tests should assert non-negative stars/HP/population, positive safe
integer levels, unique IDs, one unit per tile, valid ownership/home references,
capacity training gates without rejecting valid over-capacity states, and that
only the active player can command. Deterministic rival and cooperative soak
corpora must finish or stop cleanly at their explicit command caps without
exceptions and must repeat command/event/state hashes exactly.

Minimum delivery gates are typecheck, lint, unit/integration tests, production
build, and a headless golden replay verification.

## 12. Performance and size budgets

Budgets apply on a current desktop Chromium reference run with a 16 x 16 map,
four players, 64 living units, and device-pixel ratio 2. Record the test machine
and browser version with measurements.

| Operation                                        |                           Budget |
| ------------------------------------------------ | -------------------------------: |
| Normal command validation + reduction, p95       |                          <= 4 ms |
| Combat preview or legal-action query, p95        |                          <= 2 ms |
| Canvas interactive frame while panning, p95      |                       <= 16.7 ms |
| Full static map redraw, p95                      |                         <= 12 ms |
| Normal AI decision, p95                          |                         <= 50 ms |
| Complete AI turn engine compute                  |  <= 1,000 ms and <= 128 commands |
| Initial JS, CSS, and first-party data compressed | <= 500 KiB, excluding raster art |
| Current autosave                                 |                 <= 1.5 MiB UTF-8 |
| First usable hub after cached load               |                           <= 1 s |

AI presentation may yield to the browser between commands and may be animated
or fast-forwarded. Timing never alters its action budget, evaluation, PRNG, or
command sequence. If a budget is exceeded, profiling may change algorithms or
renderer caches, not authoritative rules or replay results.

Huge validation is deliberately targeted rather than added to every default
test run. Each fixed 25 x 25 Normal-policy completion uses hard safety caps of
20,000 accepted commands and 500 rounds. The generation corpus must finish in
240 seconds on the reference machine; complete-match wall time is recorded as
diagnostic evidence, while deterministic command/round caps remain the
authoritative stall protection.
