# Attack effects

**Status:** bead `pulp_wars-b5f.5` (epic `pulp_wars-b5f`, playtest round 5).
The user (2026-10-03): "i love the beam effect of martian tripod attack. i
like the goblin explosion effect. review attacks of existing units and see if
you can do cool animations like that. most of the time the answer will be no
and that's ok."

Every unit's attack was reviewed against what the board shows today. Six
shots got a code-drawn cue of their own in
[`attack-effects-v7.ts`](../../src/render/canvas/attack-effects-v7.ts); every
other attack keeps its feedback. No rule, engine or sprite changed.

## What the board shows today

- **Lunge:** a melee attacker leans 22% toward its target (230 ms), then the
  target shakes and flashes (100 ms). Every melee attack.
- **Arrow:** a ranged shot (`RANGED`): a cream arrow flies straight (280 ms),
  then the impact shake.
- **Stone:** a `CATAPULT` shot: a grey ball arcs 72 world units high (280
  ms), then the impact shake.
- **Faction cues** already on the effects overlay: the Martian heat ray
  (Ray Gunner, Tripod, Colossus), the Goblin bomb and blasts, the Spitter's
  acid, the Triceratops' Charge! flash, the Lich's splash burst, Lifesteal,
  the Ice Folk Shatter, Sweep and Bolas, and the Dwarf Knockback puff and
  Gyrocopter bomb.

## The review

"Yes" means a new cue; the Martian Grunt and Tripod were left to bead
`pulp_wars-b5f.2`, which is changing their attacks.

| Faction  | Unit                 | Attack                | Feedback today                | Cue | Why                                                                                                         |
| -------- | -------------------- | --------------------- | ----------------------------- | --- | ----------------------------------------------------------------------------------------------------------- |
| Human    | Fighter              | melee                 | lunge                         | no  | an ordinary sword hit; the lunge and shake say it                                                           |
| Human    | Raider               | melee, Charge         | lunge                         | no  | a rider's hit; nothing to draw that the lunge does not                                                      |
| Human    | Marksman             | ranged 2              | arrow                         | no  | the arrow is exactly what an archer shoots                                                                  |
| Human    | Guard                | melee                 | lunge                         | no  | a spear thrust                                                                                              |
| Human    | Captain              | melee                 | lunge                         | no  | a weak hit; Rally and Tend have their own cues                                                              |
| Human    | Catapult             | siege 2-3             | stone                         | no  | the grey stone is a catapult's stone                                                                        |
| Human    | Knight               | melee, Overrun        | lunge                         | no  | a lance hit; Overrun is a move                                                                              |
| Human    | Juggernaut           | melee, Push           | lunge, push slide             | no  | the push slide is the event                                                                                 |
| Undead   | Skeleton             | melee                 | lunge                         | no  | an ordinary hit                                                                                             |
| Undead   | Ghoul                | melee, Devour         | lunge, Devour cue             | no  | Devour already has its cue                                                                                  |
| Undead   | Banshee              | none (Wail)           | Wail rings                    | no  | she never attacks; the Wail has its cue                                                                     |
| Undead   | Zombie               | melee, Infect, Bite   | lunge, Infect and Bitten cues | no  | the afflictions have their cues                                                                             |
| Undead   | Necromancer          | melee                 | lunge                         | no  | a weak hit; Raise Dead has its cue                                                                          |
| Undead   | **Lich**             | siege 2-3, Plague     | stone, then the violet splash | yes | a robed caster with a violet orb threw a grey rock; now it casts a violet bolt into its own splash          |
| Undead   | Vampire              | melee, Lifesteal      | lunge, Lifesteal wisp         | no  | the wisp is the effect                                                                                      |
| Undead   | Abomination          | melee, Push           | lunge, push slide             | no  | a brute's hit                                                                                               |
| Goblin   | Goblin               | melee, Kaboom         | lunge; blast when it dies     | no  | the Kaboom blast is the effect                                                                              |
| Goblin   | Wolf Rider           | melee, Charge         | lunge                         | no  | a rider's hit                                                                                               |
| Goblin   | Bomb Chucker         | ranged 2, splash      | black bomb, then a bang       | no  | already has the bomb and the blast                                                                          |
| Goblin   | Orc Brute            | melee                 | lunge                         | no  | a cleaver hit                                                                                               |
| Goblin   | Orc Warboss          | melee                 | lunge                         | no  | a hit; WAAAGH! is a rally                                                                                   |
| Goblin   | **Rocket Cart**      | siege 2-3             | stone                         | yes | a fireworks cart threw a grey stone; now its paper rocket wobbles over and bursts in coloured stars         |
| Goblin   | Scrap Buggy          | melee, Overrun        | lunge                         | no  | a ram                                                                                                       |
| Goblin   | Troll                | melee, Push           | lunge, regeneration "+N"      | no  | a club hit                                                                                                  |
| Dinosaur | Caveman              | melee                 | lunge                         | no  | a club hit                                                                                                  |
| Dinosaur | Raptor               | melee, Charge         | lunge                         | no  | a bite                                                                                                      |
| Dinosaur | Spitter              | ranged 2, Acid        | cream acid blob, Acid hit     | no  | already has its own shot and hit                                                                            |
| Dinosaur | Ankylosaurus         | melee                 | lunge                         | no  | a tail hit                                                                                                  |
| Dinosaur | Shaman               | melee                 | lunge                         | no  | a weak hit; Hatch has its cue                                                                               |
| Dinosaur | Triceratops          | melee, Charge!        | run-up, star flash, push      | no  | already has the Charge! flash                                                                               |
| Dinosaur | T-Rex                | melee, Overrun        | lunge                         | no  | a bite; a bigger lunge would only add noise                                                                 |
| Dinosaur | Brontosaurus         | melee, Push           | lunge, push slide             | no  | the push slide is the event                                                                                 |
| Martian  | Grunt                | melee                 | lunge                         | no  | excluded: bead `pulp_wars-b5f.2` changes its attack                                                         |
| Martian  | Saucer               | melee, Charge         | lunge                         | no  | a ram; Beam Down has its cue                                                                                |
| Martian  | Ray Gunner           | ray 1-2               | heat ray                      | no  | already has the beam                                                                                        |
| Martian  | Shield Projector     | melee                 | lunge, Shield flare           | no  | the flare is the effect                                                                                     |
| Martian  | Brain                | melee                 | lunge                         | no  | a weak hit; Mind Control has its cue                                                                        |
| Martian  | Tripod               | ray 1-2, Pierce       | heat ray with Pierce          | no  | excluded: bead `pulp_wars-b5f.2` changes its attack                                                         |
| Martian  | Mothership           | melee                 | lunge                         | no  | a ram; the Tractor Beam has its cue                                                                         |
| Martian  | Colossus             | ray 1-2, Push         | heat ray                      | no  | already has the beam                                                                                        |
| Ice Folk | Yeti                 | melee; Rockfall       | lunge; stone from a Mountain  | yes | only Rockfall: it now throws the same ice-crusted boulder as the Boulder Yeti; the melee hit stays a lunge  |
| Ice Folk | Sled                 | melee, Charge, Bolas  | lunge, Bolas cue              | no  | the Bolas has its cue                                                                                       |
| Ice Folk | **Snow Hunter**      | ranged 1-2            | arrow                         | yes | a hunter with an ivory harpoon shot a cream arrow; now an ice-tipped harpoon flies out on a line            |
| Ice Folk | Mammoth              | melee, Sweep          | lunge, Sweep arc              | no  | the Sweep arc is the effect                                                                                 |
| Ice Folk | Ice Witch            | melee                 | lunge                         | no  | a weak hit; Cold Snap and Blizzard have cues                                                                |
| Ice Folk | **Boulder Yeti**     | siege 1-2             | stone                         | yes | it lifts a blue ice-crusted boulder; now that boulder flies and bursts into ice shards and snow             |
| Ice Folk | Sabretooth           | melee                 | lunge                         | no  | a pounce                                                                                                    |
| Ice Folk | Frost Giant          | melee, Push           | lunge, Cold Aura              | no  | the aura is the effect                                                                                      |
| Dwarf    | Hammerer             | melee                 | lunge                         | no  | a hammer hit                                                                                                |
| Dwarf    | Gyrocopter           | Bomb Run              | the bomb cue                  | no  | already has its bomb                                                                                        |
| Dwarf    | **Clockwork Gunner** | ranged 1-2, Twin Shot | arrow                         | yes | a gatling automaton shot arrows; now each shot is a three-round burst with a muzzle flash and copper sparks |
| Dwarf    | Steam Mole           | melee, Eruption       | lunge, eruption               | no  | the eruption is the effect                                                                                  |
| Dwarf    | Engineer             | melee                 | lunge                         | no  | a weak hit; Assemble and Repair have cues                                                                   |
| Dwarf    | **Steam Cannon**     | siege 2-3, Knockback  | stone, Knockback puff         | yes | the stone fits, but a steam cannon wants its bang: muzzle flash, rolling steam, an iron ball, thrown earth  |
| Dwarf    | Steam Tank           | melee                 | lunge                         | no  | its cannon snout is a range 1 ram; a blast on every melee hit would be noise                                |
| Dwarf    | Brass Titan          | melee, Push           | lunge, push slide             | no  | a fist                                                                                                      |
| All      | Patrol Boat          | melee                 | lunge                         | no  | a ram, the same for every faction                                                                           |
| All      | **Battleship**       | ranged 1-3, splash    | arrow                         | yes | the arrow looked puny; now a broadside with each faction's own shell and an area blast (see below)          |

The Battleship's arrow was the weakest match left; the user found it puny,
and bead `pulp_wars-eu3r.4` replaced it with the broadside below.

## The six cues

Each cue has a flight, a hit at `ATTACK_EFFECT_HIT_V7` (the board shows the
attack's result from there, with the usual 100 ms shake) and a short burst.
The durations are 380 to 480 ms (the arrow and its shake took 380 ms; the
heat ray 360 ms, the Goblin blast 520 ms); the fast speed halves them. The
cue runs on its own linear timeline, and only the effects overlay repaints
during the flight.

| Cue               | Who                           | Flight                                                                                                                       | Burst                                                                 | ms  |
| ----------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --- |
| `NECRO_BOLT`      | Lich                          | the orb flares, a violet orb with a tapering wisp tail and circling motes                                                    | a pale flash and a violet ring with six wisps; the splash cue follows | 440 |
| `FIREWORK_ROCKET` | Rocket Cart                   | a soot puff at the cart; a red paper rocket, cream cone, spark and stick, wobbling and speeding up, leaving smoke and sparks | a white bang star, then ten coloured stars that spread and droop      | 480 |
| `GATLING_BURST`   | Clockwork Gunner (every shot) | a flickering muzzle flash and a steam puff; three copper tracer rounds                                                       | a copper spark on each round's hit, a little apart                    | 380 |
| `CANNON_BLAST`    | Steam Cannon                  | a white muzzle flash, four steam puffs rolling out; an iron ball arcs                                                        | a star, thrown earth and flying clods; the Knockback puff follows     | 460 |
| `ICE_BOULDER`     | Boulder Yeti; Yeti's Rockfall | a lumpy slate boulder crusted with ice crystals, shedding snow                                                               | a pale ice star, snow puffs and seven ice shards                      | 460 |
| `HARPOON`         | Snow Hunter                   | an ivory harpoon with an ice-crystal head on a sagging line                                                                  | a pale ice star and frost sparks; the line falls slack                | 380 |

Colours come from the faction palettes: the Undead violet effects (the
Classic look and LEGACY use the classic pale blue, as the other Undead
cues do), the Goblin blast palette and the rocket paper colours (no
orange), the Dwarf iron, copper, steam and earth, and the Ice Folk ice and
snow.

**Looks.** The cues are code only, so they draw in the live look, the
Classic look and LEGACY alike. On the CHIBI board their sizes are 1.7 times
world size (`ATTACK_EFFECT_SCALE_V7`), so a shot reads beside a 70 px unit
at zoom step 1; LEGACY, whose stand-in units are drawn at a larger zoom,
draws them at world size.

**Reduced motion** holds one frame for 220 ms (`attackReducedMotionProgressV7`:
the shot near its target with its trail behind it, the gatling with one
round landed), before the cues the attack causes, like the other faction
cues.

## The Candy cues (bead `pulp_wars-jdb.6`)

The Candy faction came after the review. Its two shooters have a cue each,
on the same timeline rules:

| Cue            | Who            | Flight                                               | Burst                                          | ms  |
| -------------- | -------------- | ---------------------------------------------------- | ---------------------------------------------- | --- |
| `PIE_THROW`    | Pie Launcher   | a cream pie lobbed in a high arc, shedding cream     | cream over the target: the Splat               | 460 |
| `GUMBALL_SHOT` | Gumball Gunner | one glossy pink gumball with a short trail, straight | a white sugar star and pink and mint sprinkles | 380 |

Unlike the six cues above they draw the Candy art's own sprites where the
look has them (`EFFECT:PIE`, `EFFECT:SPLAT`, `EFFECT:GUMBALL_SHOT`), and the
same shapes in code in the Classic look and LEGACY.

## The Battleship broadside (bead `pulp_wars-eu3r.4`)

Every faction's Battleship has splash (`combat.ts`: the hostile units within
one tile of the target), yet it shot the archer's arrow. Now it fires
`BROADSIDE`, one cue for every hull, flavoured by the shooter's faction
(`broadsideShellForV7`, by its kind, so a Mind Controlled ship keeps its
own):

| Faction  | Shell        | In flight                                                      | Blast colours                              |
| -------- | ------------ | -------------------------------------------------------------- | ------------------------------------------ |
| Human    | `CANNONBALL` | an iron ball with a gold fuse spark                            | gold fire, grey gunsmoke, iron and wood    |
| Undead   | `GHOST_FIRE` | a burning orb with flame tongues                               | the Undead violet (classic pale blue)      |
| Goblin   | `SCRAP`      | a tumbling bundle: a tin gear, a rusty drum with hazard yellow | hazard yellow fire, soot, tin and rust     |
| Dinosaur | `BOULDER`    | a basalt boulder with a red-orange war-paint stripe            | sand and hide dust, basalt chips           |
| Martian  | `PLASMA`     | a magenta bolt with a white core and glass-cyan crackle        | magenta energy, glass vapour, motes        |
| Ice Folk | `ICE`        | a cluster of ice crystals                                      | ice-blue burst, snow, ice shards           |
| Dwarf    | `STEAM`      | an iron ball with a copper band                                | copper fire, steam, earth and iron         |
| Candy    | `CANDY`      | a dark chocolate truffle with a caramel drizzle and a shine    | caramel fire, cream, mint/cherry sprinkles |

The Ice Folk own no ships (they walk the frozen sea; the state schema
refuses an Ice Folk ship), so their shell is drawn only by the review.

**Timeline** (580 ms, the heaviest cue; the fast speed halves it):

- three guns flash along the hull, 5% apart, and gunsmoke rolls out toward
  the target and up;
- the middle gun's shell arcs over (76 world units high) and lands at 50%,
  where the board shows the result with the usual 100 ms shake;
- the target bursts: a white-hot twelve-point star, a seven-lobed fireball,
  smoke rising and debris flung out;
- a shock ring, a rounded square, runs out from the target's tile over the
  3 x 3 tiles of the splash, the area flushing with the ring's colour; at
  59% it reaches the splash tiles and each splashed unit (the step's
  `splash` cells, the units the viewer sees) bursts with a smaller blast.
  The DAMAGE cues of the splashed units follow the cue as before.

The ring shows the whole splash area even when no other unit stands in it.
The sound is the cannon and an explosion at the hit.

**Reduced motion** holds one frame for 220 ms like the other cues, but the
broadside's frame is after the hit (`attackReducedMotionProgressV7` 0.64):
the blast, the ring over the splash tiles and the splash bursts, since the
area is what the frame must say. High contrast changes nothing, as for the
other cues.

## The giants' signatures (bead `pulp_wars-w49.32`)

Each giant's signature
([rules](../product/RULESET_7_CURRENT.md#111-the-giants-signatures)) has
a cue of its own, drawn in code over the board by
`src/render/canvas/giant-effects-v7.ts` in its faction's colours. The
presentation plan adds a `GIANT` step for each signature event
(`UNIT_CRUSHED`, `UNIT_SWALLOWED`, `UNIT_DIGESTED`, `UNIT_REGURGITATED`,
`GOBLIN_TOSSED`, `THUNDER_STOMP`, `UNITS_TRAMPLED`, `GIANT_BROKE_OFF`),
plus a Glacial Smash's shards after the Ice Folk shatter and a Siege
Hammer's swing in place of the melee strike. The damage cues of the units
hit follow the step as for any attack.

| Cue           | Signature              | What it shows                                                                                                                                                        | Sounds (start, hit)              | ms  |
| ------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --- |
| `CRUSH`       | Crushing Shove         | a crack ring, a white star and dust puffs on the crushed unit, and on the unit behind it when it collides; both units jolt                                           | -, `impact.heavy`                | 420 |
| `SWALLOW`     | Swallow                | the Abomination bulges, a violet maw closes over the victim, which shrinks into it, with dark wisps                                                                  | `support.drain`, `special.pop`   | 640 |
| `DIGEST`      | a held victim's damage | violet bubbles rise from the Abomination's belly                                                                                                                     | -, `support.dark`                | 520 |
| `REGURGITATE` | a victim freed         | a violet glob arcs from the holder to the freed unit's tile and splats; the unit pops up                                                                             | `support.dark`, `impact.splat`   | 560 |
| `TOSS`        | Goblin Toss            | the Troll heaves; the Goblin's own sprite cartwheels along a high arc and lands with a dust puff                                                                     | `attack.siege`, `special.puff`   | 640 |
| `STOMP`       | Thunder Stomp          | the Brontosaurus rears and slams; a shock ring and cracks run over the 3 x 3 tiles, one ground puff per tile; the board shakes                                       | -, `impact.explosion`            | 560 |
| `TRAMPLE`     | Overstride             | a footprint lands on each trampled unit, which jolts                                                                                                                 | -, `impact.heavy`                | 420 |
| `SHARDS`      | Glacial Smash          | ice shards fly from the shattered unit to its other neighbours (never back at the Frost Giant)                                                                       | `special.freeze`, `impact.ice`   | 520 |
| `HAMMER`      | Siege Hammer           | a hammer swings onto the target; on a walled city a low rampart of stone blocks crumbles in front of it                                                              | `attack.melee`, `impact.heavy`   | 560 |
| `BREAK_OFF`   | Break Off              | the Gingerbread Giant cracks and shudders, shedding crumbs; two chunks fly to the new men's tiles and pop (a sugar star, sprinkles, a ring of icing); the men pop up | `special.pop`, `special.sparkle` | 640 |

The sounds are existing ids (`GIANT_EFFECT_SOUNDS_V7` in
`src/audio/sound-events-v7.ts`), the hit sound at the cue's impact beat
(`GIANT_EFFECT_BEAT_V7`); a Hammer that kills adds the death sound. The
board shows the result at the cue's hit fraction (`GIANT_EFFECT_HIT_V7`):
at once for the Crush, the Trample, the Shards and the Hammer, after the
maw closes, the Goblin lands, the Stomp slams or the chunks land for the
others. While a Goblin is in the air it is drawn by the cue only, not on
its tiles. The fast speed halves every duration.

**The Gingerbread Men** are the Gingerbread Giant's own sprite drawn at 0.6
of its size (`GINGERBREAD_MAN_SPRITE_SCALE_V7`), so they read as small
gingerbread men without new art; the unit card names them "Gingerbread
Man" with the chip "Toffee Trooper". An Abomination holding a victim wears
a belly badge: the victim's portrait in a disc with its owner's colour on
the rim and its HP.

**Reduced motion** holds one frame for 240 ms, like the other faction
cues (`giantReducedMotionProgressV7`: the maw closing, the Goblin at the top
of its arc, the Stomp's ring over the area, the hammer on the target, the
chunks in flight). The board never shakes under reduced motion.

## Evidence

`npm run art:attack-effects-review` (with `CHROME_PATH` set) draws each cue
with the real board host over its shooter and an enemy Human Fighter
(`scripts/art/attack-effects/scene.ts`) at progress 0.15, 0.35, 0.5, 0.65
and 0.85, at zoom steps 1 and 0.75 on desktop (1440 x 900) and phone
(390 x 844, DPR 3), plus the reduced-motion frame and the Classic and
LEGACY looks, with one contact sheet per viewport and zoom. The
broadside is one case per faction (`broadside-<faction>-*.png`): the
faction's Battleship on a strip of Shallow Water at range 2 from an enemy
Fighter, with two more Fighters in its splash, one beside the target and
one diagonal to it.

Tests: `tests/unit/attack-effects-render-v7.test.ts` (which attacks map to a
cue, through the presentation plan from real attacks; the plan's geometry;
the drawing) and `tests/integration/attack-effects-canvas.test.ts` (the
board host plays the Lich's bolt instead of the stone, and holds a frame
under reduced motion). The broadside's tests sit in the same files: every
faction's Battleship maps to it, its plan step carries the shell and the
splashed units' cells, the guns, ring and splash bursts are timed, each
shell draws its own colours, and the board host plays it instead of the
arrow, in full and reduced motion.

The giants' cues are not in `art:attack-effects-review`, which starts a
match. `scripts/browser-giants-review-v7.ts` (dev server only, no match)
mounts the hand-built scenes of `tests/fixtures/v7-giants-ui.ts` and pins
each cue with `pinGiantFeedback` at three or four progress points and at
its reduced-motion frame, at desktop (1440 x 1000) and phone (390 x 844)
widths, beside the buttons, aiming and previews:
`npx tsx scripts/browser-giants-review-v7.ts http://localhost:<port>/ --output-dir=<new-dir>`.
Their tests are in the same two files: every signature event maps to its
cue and sounds, the plan's geometry and timing, each cue draws, and the
board host plays the Stomp (with its shake) and the Toss in full motion
and holds a frame under reduced motion.
